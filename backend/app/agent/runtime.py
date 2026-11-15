from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.agent.guardrails import match_guardrail, next_step_for
from app.agent.llm import run_gemini_turn
from app.agent.tools import AgentTools, ensure_comparison
from app.agent.validation import (
    fallback_answer,
    shorten_answer,
    simplify_answer,
    validate_answer,
)
from app.core.config import settings
from app.models.entities import ActionProposal, AgentThread, Parcel, User
from app.schemas.agent import AgentMessageOut, NextStep, ToolTrace, UiAction
from app.schemas.analysis import ScenarioRequest
from app.use_cases.comparison import get_comparison, simulate
from app.use_cases.context import get_context

logger = logging.getLogger("automatic.agent")


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


def _run_fake(
    db: Session,
    user: User,
    thread: AgentThread,
    message: str,
    ui_context: dict | None = None,
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
    trace: list[ToolTrace] = []
    actions: list[UiAction] = []
    evidence: list[str] = []
    warnings: list[str] = []
    analysis_run_id: str | None = None
    answer = ""
    phase = "comparar"

    if (
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
        context = get_context(db, parcel)
        trace.append(
            ToolTrace(
                tool="get_parcel_context",
                status="ok",
                latency_ms=0,
                summary=f"Faltantes: {', '.join(context.missing_inputs) or 'ninguno'}",
            )
        )
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
        answer = (
            "Comparé tu plan actual con dos alternativas. Revisa el agua, el suelo y la "
            "ganancia: si falta un dato, la app lo marca como no disponible."
        )
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
            f"La opción B usa {plan.crop_sequence}. "
            f"Agua que necesitas: {water.gross_irrigation_mm if water.gross_irrigation_mm is not None else 'no disponible'} mm; "
            f"¿alcanza el agua? {feasibility}. "
            "Las cifras vienen del motor, no del modelo de lenguaje."
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
    else:
        context = get_context(db, parcel)
        completeness = {
            "ready": "completo",
            "partial": "falta completar",
            "missing": "faltan datos",
        }.get(context.completeness.comparison, context.completeness.comparison)
        trace.append(
            ToolTrace(
                tool="get_parcel_context",
                status="ok",
                latency_ms=0,
                summary=f"Faltantes: {', '.join(context.missing_inputs) or 'ninguno'}",
            )
        )
        answer = (
            f"Estoy revisando {parcel.name}. "
            f"Datos para comparar: {completeness}. "
            "Puedo comparar planes, probar agua o precio y explicar las fuentes."
        )

    thread.last_message_at = datetime.now(UTC)
    db.commit()
    return AgentMessageOut(
        thread_id=thread.id,
        status="completed",
        answer=answer,
        tool_trace=trace,
        evidence_refs=evidence,
        ui_actions=actions,
        warnings=warnings,
        analysis_run_id=analysis_run_id,
        next_step=NextStep(phase=phase),
    )


def _run_gemini(
    db: Session,
    user: User,
    thread: AgentThread,
    parcel: Parcel,
    message: str,
    ui_context: dict | None = None,
) -> AgentMessageOut:
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
    tools = AgentTools(db, user, parcel)
    turn = run_gemini_turn(tools, message)
    warnings: list[str] = []
    if not turn.answer or not validate_answer(turn.answer, turn.evidence_payload):
        turn.answer = fallback_answer([trace.tool for trace in turn.traces])
        warnings.append("explanation_fallback")
    else:
        turn.answer = shorten_answer(
            simplify_answer(turn.answer), settings.agent_max_answer_chars
        )
    phase = next_step_for(message, [trace.tool for trace in turn.traces])
    thread.last_message_at = datetime.now(UTC)
    db.commit()
    return AgentMessageOut(
        thread_id=thread.id,
        status="completed",
        answer=turn.answer,
        tool_trace=turn.traces,
        evidence_refs=turn.evidence,
        ui_actions=turn.actions,
        warnings=warnings,
        analysis_run_id=turn.analysis_run_id,
        next_step=NextStep(phase=phase),
    )


def run_agent(
    db: Session,
    user: User,
    thread: AgentThread,
    message: str,
    ui_context: dict | None = None,
) -> AgentMessageOut:
    parcel = db.get(Parcel, thread.parcel_id)
    if parcel is None or parcel.owner_user_id != user.id:
        raise LookupError("parcel_not_found")
    if settings.gemini_enabled:
        # Tools and writes stay deterministic. Gemini is reserved for open-ended
        # explanation, so common actions return immediately even if Vertex is slow.
        text = message.lower()
        if "guard" in text or any(
            key in text
            for key in ("compara", "comparar", "simula", "simular", "guardar", "borrador")
        ):
            return _run_fake(db, user, thread, message, ui_context)
        try:
            return _run_gemini(db, user, thread, parcel, message, ui_context)
        except Exception:
            logger.exception("gemini agent failed; falling back to fake")
            result = _run_fake(db, user, thread, message, ui_context)
            result.warnings.append("gemini_fallback")
            return result
    return _run_fake(db, user, thread, message, ui_context)
