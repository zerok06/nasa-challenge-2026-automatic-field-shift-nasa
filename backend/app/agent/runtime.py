from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.agent.guardrails import match_guardrail, next_step_for
from app.agent.llm import run_gemini_turn
from app.agent.price_catalog import find_mentioned_price_reference, find_price_reference
from app.agent.tools import AgentTools, ensure_comparison
from app.agent.validation import (
    fallback_answer,
    shorten_answer,
    simplify_answer,
    validate_answer,
)
from app.core.config import settings
from app.models.entities import ActionProposal, AgentMessage, AgentThread, Parcel, User
from app.schemas.agent import AgentMessageOut, NextStep, ToolTrace, UiAction
from app.schemas.analysis import ScenarioRequest
from app.use_cases.comparison import get_comparison, simulate
from app.use_cases.context import get_context

logger = logging.getLogger("automatic.agent")

AFFIRM_TOKENS = (
    "sí", "si", "dale", "confirmo", "confirma", "confirmar", "de acuerdo",
    "ok", "ya", "guárdalo", "guardalo", "anótalo", "anotalo", "hazlo",
    "está bien", "esta bien", "perfecto", "listo",
)
DENY_TOKENS = (
    "no", "cancela", "cancelar", "descarta", "descartar", "déjalo", "dejalo",
    "mejor no", "todavía no", "todavia no", "no todavía", "no todavia",
)


def _remember(db: Session, thread: AgentThread, role: str, text: str) -> None:
    db.add(AgentMessage(thread_id=thread.id, role=role, text=text[:2000]))
    db.commit()


CROP_LABELS = {
    "onion": "cebolla",
    "cebolla": "cebolla",
    "pumpkin": "zapallo",
    "zapallo": "zapallo",
    "chili": "ají",
    "aji": "ají",
    "potato": "papa",
    "papa": "papa",
    "corn": "maíz",
    "maiz_amilaceo": "maíz",
    "maiz_choclo": "maíz choclo",
    "haba": "haba",
    "haba_seca": "haba",
    "alfalfa": "alfalfa",
    "tomato": "tomate",
    "tomate": "tomate",
    "lettuce": "lechuga",
    "lechuga": "lechuga",
    "carrot": "zanahoria",
    "zanahoria": "zanahoria",
    "quinoa": "quinua",
    "cebolla_china": "cebolla china",
}


def _crop_label(value: object) -> str:
    key = str(value or "").strip()
    return CROP_LABELS.get(key, key or "cultivo")


def _db_crop_id(value: object) -> str:
    """Catalog id (Spanish) → database crop id (English) when it exists."""
    from app.use_cases.seed import CATALOG_ID_MAP

    key = str(value or "").strip()
    return CATALOG_ID_MAP.get(key, key)


def _capture_preview(kind: str, values: dict) -> list[str]:
    """What would be saved, in farmer words. Never invented: only given values."""
    preview: list[str] = []
    if kind == "water":
        mm = values.get("mm")
        volume = values.get("volume_m3")
        if mm is not None:
            preview.append(f"Agua disponible: {float(mm):.0f} mm")
        elif volume is not None:
            preview.append(f"Agua disponible: {float(volume):,.0f} m³")
        else:
            preview.append("Agua disponible en tu ficha (sin cantidad todavía)")
    elif kind == "soil":
        variable = str(values.get("variable") or "").strip()
        value = values.get("value")
        unit = str(values.get("unit") or "").strip()
        labels = {
            "ph": "pH del suelo",
            "organic_matter": "Materia orgánica",
            "texture": "Textura del suelo",
            "n": "Nitrógeno",
            "p": "Fósforo",
            "k": "Potasio",
        }
        label = labels.get(variable, "Dato de suelo")
        if value is not None:
            text = f"{float(value):g}" if isinstance(value, (int, float)) else str(value)
            preview.append(f"{label}: {text}{(' ' + unit) if unit else ''}")
        else:
            preview.append(f"{label}: sin análisis (declarado)")
    elif kind == "economics":
        crop = _crop_label(values.get("crop_id") or values.get("crop"))
        if values.get("yield_kg_ha") is not None:
            preview.append(f"Rendimiento de {crop}: {float(values['yield_kg_ha']):,.0f} kg/ha")
        if values.get("price_pen_kg") is not None:
            preview.append(f"Precio de {crop}: S/ {float(values['price_pen_kg']):.2f} / kg")
        if values.get("costs_pen") is not None:
            preview.append(f"Costo de {crop}: S/ {float(values['costs_pen']):,.0f}")
        if not preview:
            preview.append(f"Precio y costo de {crop}")
    elif kind == "history":
        crop = _crop_label(values.get("crop_id"))
        preview.append(f"Campaña sembrada con {crop}")
    return preview


def _plan_preview(name: str) -> list[str]:
    return [f"Borrador de plan: {name}"]


_PRICE_SCOPE = {
    "distrito": "tu distrito",
    "provincia": "tu provincia",
    "departamento": "la región",
    "historico": "referencia histórica",
}


def _price_sentence(crop_ids: list[str], district: str | None, limit: int = 2) -> str:
    """Catalog prices for the crops of a recommendation, with source and year."""
    parts: list[str] = []
    for crop_id in crop_ids[:limit]:
        reference = find_price_reference(crop_id, district, allow_regional=True)
        if not reference:
            continue
        scope = _PRICE_SCOPE.get(str(reference.get("scope")), "")
        place = reference.get("place") or ""
        detail = ", ".join(
            item
            for item in (scope or place, str(reference.get("year") or ""), reference.get("source_id"))
            if item
        )
        parts.append(
            f"{_crop_label(crop_id)} S/ {float(reference['price_pen_kg']):.2f}/kg ({detail})"
        )
    if not parts:
        return ""
    return " Precio de referencia editable: " + "; ".join(parts) + "."


def _economics_action(crop_id: str | None) -> UiAction:
    query = f"?crop={_db_crop_id(crop_id)}&guiado=1" if crop_id else "?guiado=1"
    return UiAction(action="open_screen", payload={"path": f"/parcela/economia{query}"})


def _with_react_steps(trace: list[ToolTrace]) -> list[ToolTrace]:
    """Label each observation with its 1-based ReAct step, without duplicates."""
    seen: set[str] = set()
    ordered: list[ToolTrace] = []
    for item in trace:
        key = f"{item.tool}:{item.summary}"
        if key in seen:
            continue
        seen.add(key)
        ordered.append(item)
    for index, item in enumerate(ordered, start=1):
        item.step = index
    return ordered


def _recent_history(db: Session, thread: AgentThread, limit: int = 12) -> list[tuple[str, str]]:
    from sqlalchemy import select

    rows = db.scalars(
        select(AgentMessage)
        .where(AgentMessage.thread_id == thread.id)
        .order_by(AgentMessage.created_at.desc())
        .limit(limit)
    ).all()
    return [(row.role, row.text) for row in reversed(rows)]


def _load_state(thread: AgentThread) -> dict:
    try:
        state = dict(thread.state_json or {})
    except (TypeError, ValueError):
        state = {}
    state.setdefault("turn_count", 0)
    return state


def _save_state(db: Session, thread: AgentThread, state: dict) -> None:
    thread.state_json = state
    db.commit()


def _pending_proposal(db: Session, user: User, thread: AgentThread) -> ActionProposal | None:
    from datetime import UTC, datetime

    from sqlalchemy import select

    now = datetime.now(UTC)
    rows = db.scalars(
        select(ActionProposal)
        .where(
            ActionProposal.owner_user_id == user.id,
            ActionProposal.parcel_id == thread.parcel_id,
            ActionProposal.status == "pending",
        )
        .order_by(ActionProposal.created_at.desc())
        .limit(5)
    ).all()
    for row in rows:
        if row.expires_at is None or row.expires_at > now:
            return row
    return None


def _resolve_pending_confirmation(
    db: Session, user: User, thread: AgentThread, message: str
) -> AgentMessageOut | None:
    """Deterministic yes/no handling when a proposal is pending. No LLM involved."""
    text = message.strip().lower()
    if len(text) > 40:
        return None
    # Negations take priority: check deny first.
    deny = text in DENY_TOKENS or any(
        text == tok or text.startswith(tok + " ") or text.endswith(" " + tok)
        for tok in DENY_TOKENS
    )
    if deny:
        pending = _pending_proposal(db, user, thread)
        if pending is None:
            return None
        pending.status = "rejected"
        thread.last_message_at = datetime.now(UTC)
        db.commit()
        _remember(db, thread, "user", message)
        _remember(db, thread, "assistant", "Listo, no guardé nada. ¿Seguimos con otra cosa?")
        return AgentMessageOut(
            thread_id=thread.id,
            status="completed",
            answer="Listo, no guardé nada. ¿Seguimos con otra cosa?",
            pending_proposal_id=None,
            next_step=NextStep(phase="datos"),
        )
    # Only exact matches or tokens followed by a space count as affirmations.
    # This avoids matching "ya no" as "ya" or "ok" as part of "okey no".
    affirm = any(
        tok == text or text.startswith(tok + " ") or text.endswith(" " + tok)
        for tok in AFFIRM_TOKENS
    )
    if not affirm:
        return None
    pending = _pending_proposal(db, user, thread)
    if pending is None:
        return None

    # Affirm: apply the same logic as POST /actions/{id}/confirm without HTTP.
    from app.api.v1.actions import _apply_capture

    try:
        if pending.type == "save_plan":
            from app.models.entities import SavedDecision

            data = pending.payload_json or {}
            db.add(
                SavedDecision(
                    parcel_id=pending.parcel_id,
                    rotation_plan_id=data.get("rotation_plan_id"),
                    analysis_run_id=data.get("analysis_run_id"),
                    name=data.get("name", "Borrador"),
                    status="draft",
                )
            )
        elif pending.type.startswith("capture_"):
            data = pending.payload_json or {}
            applied = _apply_capture(db, user, pending)
            merged = dict(data)
            merged["applied"] = applied
            pending.payload_json = merged
        pending.status = "confirmed"
        thread.last_message_at = datetime.now(UTC)
        db.commit()
        answer = "Listo, ya quedó guardado. ¿Comparamos tus planes ahora?"
        phase = "comparar"
    except Exception:
        db.rollback()
        pending.status = "pending"
        answer = "No pude guardarlo con esos datos. ¿Me los repites de otra forma?"
        phase = "datos"
        thread.last_message_at = datetime.now(UTC)
        db.commit()
    _remember(db, thread, "user", message)
    _remember(db, thread, "assistant", answer)
    return AgentMessageOut(
        thread_id=thread.id,
        status="completed",
        answer=answer,
        pending_proposal_id=None,
        next_step=NextStep(phase=phase),
    )


def _ensure_comparison(db: Session, user: User, parcel: Parcel) -> tuple[str, list[ToolTrace]]:
    comparison, created = ensure_comparison(db, user, parcel)
    summary = (
        f"{len(comparison.plans)} planes generados."
        if created
        else "Se reutiliza la comparación más reciente."
    )
    return comparison.comparison_id, [
        ToolTrace(
            tool="compare_rotations",
            status="ok",
            latency_ms=0,
            summary=summary,
        )
    ]


def _proactive_greeting(
    db: Session,
    user: User,
    thread: AgentThread,
    parcel: Parcel,
    message: str,
    ui_context: dict | None = None,
    mode: str = "guided",
) -> AgentMessageOut | None:
    """Deterministic opening for the first turn of a thread.

    Guided mode (native app) picks the single highest-priority missing input and
    creates a soft `propose_capture` proposal. Chat mode (web) opens a normal
    conversation: it says what it knows, what is missing and what it can save,
    without creating a proposal until the farmer actually gives a datum.
    """
    state = _load_state(thread)
    if int(state.get("turn_count", 0)) != 0:
        return None
    context = get_context(db, parcel)
    missing = list(context.missing_inputs)
    order = ["water_available", "soil_analysis", "crop_economics", "crop_history", "area_ha"]
    ranked = [m for m in sorted(missing, key=lambda m: order.index(m) if m in order else 99)]
    thread.last_message_at = datetime.now(UTC)

    if not ranked:
        key = "agent.greeting.complete"
        params = {"name": parcel.name}
        answer = (
            "Hola, soy Anden y estoy revisando {name}. Tienes agua, suelo, precio e "
            "historial registrados, así que ya puedes comparar planes. ¿Quieres que revise "
            "tus opciones o que pruebe con menos agua?".format(name=parcel.name)
        )
        _remember(db, thread, "user", message)
        _remember(db, thread, "assistant", answer)
        db.commit()
        return AgentMessageOut(
            thread_id=thread.id,
            status="completed",
            answer=answer,
            answer_key=key,
            answer_params=params,
            next_step=NextStep(phase="comparar"),
        )

    labels = {
        "water_available": "cuánta agua tienes para esta campaña",
        "soil_analysis": "el análisis de suelo",
        "crop_economics": "el precio y el gasto por cultivo",
        "crop_history": "qué sembraste la campaña pasada",
        "area_ha": "cuánta superficie tiene tu parcela",
    }

    if mode == "chat":
        missing_text = ", ".join(labels.get(item, item) for item in ranked[:3])
        answer = (
            f"Hola, soy Anden. Estoy viendo {parcel.name}. Todavía me falta saber "
            f"{missing_text}. Pregúntame lo que quieras o cuéntamelo con tus palabras: "
            "puedo comparar tus planes, probar con menos agua o menor precio, explicarte "
            "de dónde sale cada número y dejar listo lo que decidas guardar. Nada se guarda "
            "sin que lo confirmes."
        )
        _remember(db, thread, "user", message)
        _remember(db, thread, "assistant", answer)
        db.commit()
        return AgentMessageOut(
            thread_id=thread.id,
            status="completed",
            answer=answer,
            tool_trace=[
                ToolTrace(
                    tool="get_parcel_context",
                    status="ok",
                    summary=f"Faltantes: {', '.join(missing) or 'ninguno'}",
                )
            ],
            next_step=NextStep(phase="datos"),
        )

    target = ranked[0]
    label = labels.get(target, target)
    kind = {
        "water_available": "water",
        "soil_analysis": "soil",
        "crop_economics": "economics",
        "crop_history": "history",
        "area_ha": "water",
    }.get(target, "water")

    # Stable i18n key + params so the frontend can render the greeting in the
    # user's language. `what` is itself a translation key (agent.missing.<target>);
    # the client translates it before interpolating it into the outer template.
    what_key = f"agent.missing.{target}"
    answer_key = "agent.greeting.missing"
    answer_params = {"name": parcel.name, "what": what_key}
    answer = (
        "Hola, soy Anden y voy a guiarte con {name}. Vi que no tienes registrado {what}. "
        "¿Quieres decírmelo con tus palabras? Lo propongo y lo guardas solo si confirmas; "
        "si no, lo descarto y seguimos.".format(name=parcel.name, what=label)
    )

    proposal = ActionProposal(
        id=str(uuid.uuid4()),
        owner_user_id=user.id,
        parcel_id=parcel.id,
        type=f"capture_{kind}",
        payload_json={
            "kind": kind,
            "values": {"field": target},
            "source_text": f"Propuesta inicial del agente para {label}",
        },
        status="pending",
        expires_at=datetime.now(UTC) + timedelta(minutes=60),
    )
    db.add(proposal)
    db.commit()
    _remember(db, thread, "user", message)
    _remember(db, thread, "assistant", answer)
    return AgentMessageOut(
        thread_id=thread.id,
        status="completed",
        answer=answer,
        answer_key=answer_key,
        answer_params=answer_params,
        tool_trace=[
            ToolTrace(
                tool="get_parcel_context",
                status="ok",
                summary=f"Faltantes: {', '.join(missing)}",
            )
        ],
        ui_actions=[
            UiAction(
                action="capture_draft",
                payload={"proposal_id": proposal.id, "kind": kind},
            )
        ],
        pending_proposal_id=proposal.id,
        next_step=NextStep(phase="datos"),
        save_preview=["El dato que me digas (todavía sin valores)"],
    )


def _run_fake(
    db: Session,
    user: User,
    thread: AgentThread,
    message: str,
    ui_context: dict | None = None,
    mode: str = "guided",
) -> AgentMessageOut:
    parcel = db.get(Parcel, thread.parcel_id)
    if parcel is None or parcel.owner_user_id != user.id:
        raise LookupError("parcel_not_found")
    guardrail = match_guardrail(message)
    if guardrail is not None:
        thread.last_message_at = datetime.now(UTC)
        db.commit()
        return AgentMessageOut(
            thread_id=thread.id,
            status="completed",
            answer=guardrail.answer,
            next_step=NextStep(phase=guardrail.phase),
        )
    text = message.lower()
    # Short follow-ups ("y si baja más", "eso", "entonces") inherit the topic of
    # the last farmer turns; a chat that forgets the thread feels broken.
    short_followup = len(text) <= 40 and any(
        token in text for token in ("eso", "y si", "entonces", "ahora", "mas", "más", "igual")
    )
    if short_followup:
        previous = " ".join(
            content.lower() for role, content in _recent_history(db, thread, 6) if role == "user"
        )
        text = f"{text} {previous}"
    trace: list[ToolTrace] = []
    actions: list[UiAction] = []
    evidence: list[str] = []
    warnings: list[str] = []
    preview: list[str] = []
    analysis_run_id: str | None = None
    answer = ""
    phase = "comparar"

    # ReAct step 1: observe the parcel before deciding anything.
    context = get_context(db, parcel)
    trace.append(
        ToolTrace(
            tool="get_parcel_context",
            status="ok",
            latency_ms=0,
            summary=f"Faltantes: {', '.join(context.missing_inputs) or 'ninguno'}",
        )
    )

    # Price questions are answered with the catalog before any recommendation:
    # "¿a cómo está el ají?" must not fall into the comparison branch.
    price_intent = any(
        token in text
        for token in ("precio", "cuesta", "cuanto vale", "cuánto vale", "a como", "a cómo", "vale")
    )
    mentioned_crop, mentioned_reference = find_mentioned_price_reference(
        message, parcel.district, allow_regional=True
    )

    if price_intent and mentioned_reference:
        scope = _PRICE_SCOPE.get(str(mentioned_reference.get("scope")), "")
        detail = ", ".join(
            item
            for item in (
                scope,
                str(mentioned_reference.get("year") or ""),
                mentioned_reference.get("source_id"),
            )
            if item
        )
        answer = (
            f"Para {_crop_label(mentioned_crop)} el catálogo tiene "
            f"S/ {float(mentioned_reference['price_pen_kg']):.2f} por kilo ({detail}). "
            "Es una referencia histórica y puedes corregirla con el precio que te pagan; "
            "la usaré para tu ganancia cuando la confirmes."
        )
        actions.append(_economics_action(mentioned_crop))
        evidence.append(str(mentioned_reference.get("source_id") or "catalogo_moquegua"))
        preview.extend(
            [f"Precio de {_crop_label(mentioned_crop)}: S/ {float(mentioned_reference['price_pen_kg']):.2f} / kg"]
        )
        trace.append(
            ToolTrace(
                tool="get_catalog_price_reference",
                status="ok",
                summary=f"Referencia {mentioned_crop}: S/ {mentioned_reference['price_pen_kg']:.2f}/kg",
            )
        )
        phase = "datos"
    elif any(
        token in text
        for token in (
            "qué guardas",
            "que guardas",
            "qué datos tienes",
            "que datos tienes",
            "dónde guardas",
            "donde guardas",
        )
    ):
        economics = (parcel.preferences_json or {}).get("economics") or {}
        answer = (
            f"Guardo solo lo que tú declaras en {parcel.name}: "
            f"{len(context.history)} campaña(s) de historial, "
            f"{len(context.water)} registro(s) de agua, "
            f"{len(context.soil)} dato(s) de suelo y precios de {len(economics)} cultivo(s). "
            "Cuando te propongo guardar algo, primero te digo qué se guardará y espero tu "
            "confirmación; si dices que no, no se guarda nada. También puedes consultar tus "
            "datos sin señal una vez que la app los ha guardado en tu teléfono."
        )
        phase = "datos"
    elif any(
        token in text
        for token in (
            "qué puedes hacer",
            "que puedes hacer",
            "ayúdame",
            "ayudame",
            "cómo funciona",
            "como funciona",
            "qué sabes",
            "que sabes",
        )
    ):
        answer = (
            "Puedo conversar contigo sobre tu parcela y responder con tus propios datos: "
            "cuánta agua te falta, cuánto podrías ganar, qué pasaría con menos agua o menor "
            "precio y de dónde sale cada número. Si me cuentas un dato que falta, lo dejo "
            "listo para guardar; también puedo preparar un borrador de plan. Nada se guarda "
            "sin que lo confirmes. ¿Qué te gustaría revisar primero?"
        )
        phase = "datos" if context.missing_inputs else "comparar"
    elif (
        "cuánta agua" in text
        or "cuanta agua" in text
        or "agua me falta" in text
        or ("agua" in text and "falta" in text)
    ):
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        comparison = get_comparison(db, user, analysis_run_id)
        evidence.extend(comparison.source_snapshots)
        plan = comparison.plans[0] if comparison.plans else None
        water = plan.water if plan is not None else None
        if water is None or water.feasibility == "unknown" or water.deficit_mm is None:
            answer = (
                "A tu plan actual no le puedo calcular el agua: falta el dato de "
                "disponibilidad."
            )
        elif water.deficit_mm > 0:
            answer = f"A tu plan actual le faltan {water.deficit_mm:.0f} mm de agua."
        else:
            answer = "A tu plan actual le alcanza el agua disponible."
        phase = "probar"
    elif "ganar" in text or "ganancia" in text:
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        comparison = get_comparison(db, user, analysis_run_id)
        evidence.extend(comparison.source_snapshots)
        plan = comparison.plans[0] if comparison.plans else None
        margin = plan.economics.margin_pen if plan is not None else None
        if margin is None:
            answer = (
                "No puedo calcular la ganancia estimada: faltan precio, rendimiento o costos."
            )
        else:
            answer = f"La ganancia estimada es S/ {margin:,.2f}."
        phase = "probar"
    elif "datos faltan" in text or "qué datos" in text or "que datos" in text:
        if context.missing_inputs:
            answer = f"Te faltan estos datos: {', '.join(context.missing_inputs)}."
        else:
            answer = "Te faltan estos datos: ninguno para comparar."
        phase = "datos"
    elif "compara" in text or "rotaci" in text or "siembro" in text:
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        comparison = get_comparison(db, user, analysis_run_id)
        evidence.extend(comparison.source_snapshots)
        actions.append(
            UiAction(action="open_comparison", payload={"comparison_id": analysis_run_id})
        )
        plan = comparison.plans[1] if len(comparison.plans) > 1 else comparison.plans[0]
        price_sentence = _price_sentence(plan.crop_sequence, parcel.district)
        answer = (
            "Comparé tu plan actual con dos alternativas. Revisa el agua, el suelo y la "
            "ganancia: si falta un dato, la app lo marca como no disponible."
            f"{price_sentence} Puedes corregir ese precio antes de decidir."
        )
        if price_sentence:
            actions.append(_economics_action(plan.crop_sequence[0] if plan.crop_sequence else None))
        phase = "probar"
    elif "menos agua" in text or "sequ" in text or ("agua" in text and "simula" in text):
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        scenario = simulate(db, user, analysis_run_id, ScenarioRequest(water_multiplier=0.8))
        actions.append(
            UiAction(action="open_scenario", payload={"comparison_id": scenario.comparison_id})
        )
        answer = (
            "Probé con 20 % menos agua. Los planes que no alcanzan se marcan como no viables; "
            "los demás quedan para revisar."
        )
        phase = "guardar"
    elif "precio" in text and ("baja" in text or "simula" in text):
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        scenario = simulate(db, user, analysis_run_id, ScenarioRequest(price_multiplier=0.85))
        actions.append(
            UiAction(action="open_scenario", payload={"comparison_id": scenario.comparison_id})
        )
        answer = (
            "Probé con un precio 15 % menor. La ganancia solo cambia si tienes precio, "
            "rendimiento y costos; si falta algo, sigue como no calculable."
        )
        phase = "guardar"
    elif "precio" in text:
        crop_id, reference = find_mentioned_price_reference(message, parcel.district)
        if reference:
            status_note = (
                " La transcripción está pendiente de cotejo."
                if "pendiente" in str(reference.get("status", ""))
                else " Es un precio histórico, no un precio futuro."
            )
            answer = (
                f"En el catálogo hay una referencia para {crop_id}: "
                f"S/ {reference['price_pen_kg']:.2f} por kg, "
                f"año {reference.get('year')}, zona {reference.get('place')}. "
                f"Fuente: {reference.get('source_id')}.{status_note} "
                "Puedes corregirla con el precio que te pagan."
            )
            if reference.get("source_id"):
                evidence.append(str(reference["source_id"]))
        else:
            answer = "No encontré un precio de referencia para ese cultivo y distrito. No voy a inventarlo."
        phase = "datos"
    elif "por qu" in text or "explica" in text:
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        comparison = get_comparison(db, user, analysis_run_id)
        evidence.extend(comparison.source_snapshots)
        plan = comparison.plans[1] if len(comparison.plans) > 1 else comparison.plans[0]
        water = plan.water
        feasibility = {
            "sufficient": "sí alcanza",
            "deficit": "falta agua",
            "unknown": "no se sabe",
        }.get(water.feasibility, water.feasibility)
        answer = (
            f"La opción B usa {' → '.join(plan.crop_sequence)}. "
            f"Agua que necesitas: {water.gross_irrigation_mm if water.gross_irrigation_mm is not None else 'no disponible'} mm; "
            f"¿alcanza el agua? {feasibility}. "
            "Las cifras vienen del motor, no del modelo de lenguaje."
            f"{_price_sentence(plan.crop_sequence, parcel.district)}"
        )
        phase = "probar"
    elif "guard" in text:
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        comparison = get_comparison(db, user, analysis_run_id)
        plan = comparison.plans[1] if len(comparison.plans) > 1 else comparison.plans[0]
        proposal = ActionProposal(
            owner_user_id=user.id,
            parcel_id=parcel.id,
            type="save_plan",
            payload_json={
                "analysis_run_id": analysis_run_id,
                "rotation_plan_id": plan.plan_id,
                "name": "Borrador desde el agente",
            },
            status="pending",
            expires_at=datetime.now(UTC) + timedelta(minutes=30),
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        actions.append(
            UiAction(action="save_plan_draft", payload={"proposal_id": proposal.id})
        )
        answer = (
            "Preparé un borrador. Confirma antes de guardarlo; si dices que no, no se guarda nada."
        )
        phase = "listo"
        preview = _plan_preview("Borrador desde el agente")
    else:
        context = get_context(db, parcel)
        completeness = {
            "ready": "completo",
            "partial": "falta completar",
            "missing": "faltan datos",
            "blocked": "faltan datos",
        }.get(context.completeness.comparison, context.completeness.comparison)
        answer = (
            f"Estoy revisando {parcel.name}. "
            f"Datos para comparar: {completeness}. "
            "Puedo comparar planes, probar agua o precio y explicar las fuentes."
        )
        if mode == "chat":
            answer = (
                f"Te sigo con {parcel.name}. Datos para comparar: {completeness}. "
                "Puedo revisar tus planes, probar con menos agua o menor precio, o explicarte "
                "de dónde sale un número. ¿Qué te gustaría mirar?"
            )

    thread.last_message_at = datetime.now(UTC)
    db.commit()
    _remember(db, thread, "user", message)
    _remember(db, thread, "assistant", answer)
    return AgentMessageOut(
        thread_id=thread.id,
        status="completed",
        answer=answer,
        tool_trace=_with_react_steps(trace),
        evidence_refs=evidence,
        ui_actions=actions,
        warnings=warnings,
        analysis_run_id=analysis_run_id,
        next_step=NextStep(phase=phase),
        save_preview=preview,
    )


def _run_gemini(
    db: Session,
    user: User,
    thread: AgentThread,
    parcel: Parcel,
    message: str,
    ui_context: dict | None = None,
    mode: str = "guided",
) -> AgentMessageOut:
    guardrail = match_guardrail(message)
    if guardrail is not None and guardrail.kind == "safety":
        thread.last_message_at = datetime.now(UTC)
        db.commit()
        _remember(db, thread, "user", message)
        _remember(db, thread, "assistant", guardrail.answer)
        return AgentMessageOut(
            thread_id=thread.id,
            status="completed",
            answer=guardrail.answer,
            next_step=NextStep(phase=guardrail.phase),
        )
    locale = str((ui_context or {}).get("locale") or user.locale or "es-PE")
    history = _recent_history(db, thread)
    state = _load_state(thread)
    tools = AgentTools(db, user, parcel)
    turn = run_gemini_turn(tools, message, locale=locale, history=history, mode=mode)
    warnings: list[str] = []
    if not turn.answer or not validate_answer(turn.answer, turn.evidence_payload):
        turn.answer = fallback_answer([trace.tool for trace in turn.traces])
        warnings.append("explanation_fallback")
    else:
        turn.answer = shorten_answer(
            simplify_answer(turn.answer), settings.agent_max_answer_chars
        )
    phase = next_step_for(message, [trace.tool for trace in turn.traces])
    pending_id = None
    preview: list[str] = []
    for item in turn.evidence_payload:
        if item.get("tool") == "propose_capture":
            result = item.get("result") or {}
            preview.extend(
                _capture_preview(str(result.get("kind") or ""), result.get("values") or {})
            )
    for action in turn.actions:
        if action.action in ("save_plan_draft", "capture_draft"):
            pending_id = str((action.payload or {}).get("proposal_id"))
            if action.action == "save_plan_draft":
                preview.extend(_plan_preview("Borrador desde el agente"))
            break
    state["turn_count"] = int(state.get("turn_count", 0)) + 1
    state["last_tools"] = [trace.tool for trace in turn.traces][-6:]
    if turn.analysis_run_id:
        state["last_comparison_id"] = turn.analysis_run_id
    if pending_id:
        state["pending_proposal_id"] = pending_id
    elif phase != "guardar":
        state.pop("pending_proposal_id", None)
    thread.last_message_at = datetime.now(UTC)
    db.commit()
    _save_state(db, thread, state)
    _remember(db, thread, "user", message)
    _remember(db, thread, "assistant", turn.answer)
    return AgentMessageOut(
        thread_id=thread.id,
        status="completed",
        answer=turn.answer,
        tool_trace=turn.traces,
        evidence_refs=turn.evidence,
        ui_actions=turn.actions,
        warnings=warnings,
        analysis_run_id=turn.analysis_run_id,
        pending_proposal_id=pending_id,
        next_step=NextStep(phase=phase),
        save_preview=preview,
    )


def run_agent(
    db: Session,
    user: User,
    thread: AgentThread,
    message: str,
    ui_context: dict | None = None,
    mode: str = "guided",
) -> AgentMessageOut:
    parcel = db.get(Parcel, thread.parcel_id)
    if parcel is None or parcel.owner_user_id != user.id:
        raise LookupError("parcel_not_found")
    # A conversational yes/no that matches a pending proposal resolves it
    # deterministically (even on the very first turn of the thread).
    state = _load_state(thread)
    resolved = _resolve_pending_confirmation(db, user, thread, message)
    if resolved is not None:
        state["turn_count"] = int(state.get("turn_count", 0)) + 1
        _save_state(db, thread, state)
        return resolved
    # Otherwise, the first turn of a thread is a deterministic greeting (soft
    # proposals, no auto-save). Subsequent turns fall through to the Gemini /
    # fake runtimes.
    if int(state.get("turn_count", 0)) == 0:
        greeting = _proactive_greeting(
            db, user, thread, parcel, message, ui_context, mode=mode
        )
        if greeting is not None:
            _save_state(db, thread, {**state, "turn_count": 1})
            return greeting
    if settings.gemini_enabled:
        # Gemini orchestrates reads AND proposals freely with the data tools.
        # Deterministic writes only happen on confirm (endpoint or yes/no).
        # _run_fake is the offline/failure fallback, not a keyword router.
        guardrail = match_guardrail(message)
        if guardrail is not None and guardrail.kind == "safety":
            _remember(db, thread, "user", message)
            _remember(db, thread, "assistant", guardrail.answer)
            thread.last_message_at = datetime.now(UTC)
            db.commit()
            return AgentMessageOut(
                thread_id=thread.id,
                status="completed",
                answer=guardrail.answer,
                next_step=NextStep(phase=guardrail.phase),
            )
        try:
            return _run_gemini(db, user, thread, parcel, message, ui_context, mode=mode)
        except Exception:
            logger.exception("gemini agent failed; falling back to fake")
            result = _run_fake(db, user, thread, message, ui_context, mode=mode)
            result.warnings.append("gemini_fallback")
            return result
    return _run_fake(db, user, thread, message, ui_context, mode=mode)
