from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import ActionProposal, AgentThread, AnalysisRun, Parcel, User
from app.schemas.agent import AgentMessageOut, ToolTrace, UiAction
from app.use_cases.comparison import create_comparison, get_comparison, simulate
from app.use_cases.context import get_context
from app.schemas.analysis import ScenarioRequest


def _latest_comparison(db: Session, parcel_id: str) -> AnalysisRun | None:
    return db.scalars(
        select(AnalysisRun)
        .where(AnalysisRun.parcel_id == parcel_id, AnalysisRun.kind == "comparison")
        .order_by(AnalysisRun.created_at.desc())
        .limit(1)
    ).first()


def _ensure_comparison(db: Session, user: User, parcel: Parcel) -> tuple[str, list[ToolTrace]]:
    existing = _latest_comparison(db, parcel.id)
    if existing is not None:
        return existing.id, [
            ToolTrace(
                tool="compare_rotations",
                status="ok",
                latency_ms=0,
                summary="Se reutiliza la comparación más reciente.",
            )
        ]
    start = date(date.today().year + 1, 1, 1)
    end = date(date.today().year + 1, 12, 31)
    comparison = create_comparison(db, user, parcel, start, end)
    return comparison.comparison_id, [
        ToolTrace(
            tool="compare_rotations",
            status="ok",
            latency_ms=0,
            summary=f"{len(comparison.plans)} planes generados.",
        )
    ]


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
    text = message.lower()
    trace: list[ToolTrace] = []
    actions: list[UiAction] = []
    evidence: list[str] = []
    warnings: list[str] = []
    analysis_run_id: str | None = None
    answer = ""

    if "compara" in text or "rotaci" in text or "siembro" in text:
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        comparison = get_comparison(db, user, analysis_run_id)
        evidence.extend(comparison.source_snapshots)
        actions.append(
            UiAction(action="open_comparison", payload={"comparison_id": analysis_run_id})
        )
        answer = (
            "Preparé la comparación con la rotación actual y dos alternativas. "
            "Revisá agua, suelo y margen: si falta un dato, la app lo marca como no disponible."
        )
    elif "menos agua" in text or "sequ" in text or ("agua" in text and "simula" in text):
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        scenario = simulate(db, user, analysis_run_id, ScenarioRequest(water_multiplier=0.8))
        actions.append(
            UiAction(action="open_scenario", payload={"comparison_id": scenario.comparison_id})
        )
        answer = (
            "Simulé 20 % menos agua disponible. Los planes con déficit se marcan como inviables; "
            "el resto queda sujeto a revisión."
        )
    elif "precio" in text and ("baja" in text or "simula" in text):
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        scenario = simulate(db, user, analysis_run_id, ScenarioRequest(price_multiplier=0.85))
        actions.append(
            UiAction(action="open_scenario", payload={"comparison_id": scenario.comparison_id})
        )
        answer = (
            "Simulé un precio 15 % menor. El margen solo cambia si hay precio, rendimiento y "
            "costos registrados; si faltan, sigue como no calculable."
        )
    elif "por qu" in text or "explica" in text:
        analysis_run_id, t = _ensure_comparison(db, user, parcel)
        trace.extend(t)
        comparison = get_comparison(db, user, analysis_run_id)
        evidence.extend(comparison.source_snapshots)
        plan = comparison.plans[1] if len(comparison.plans) > 1 else comparison.plans[0]
        water = plan.water
        answer = (
            f"La alternativa B usa {plan.crop_sequence}. "
            f"Riego bruto estimado: {water.gross_irrigation_mm if water.gross_irrigation_mm is not None else 'no disponible'} mm; "
            f"factibilidad hídrica: {water.feasibility}. "
            "Las cifras vienen del motor, no del modelo de lenguaje."
        )
    elif "mapa" in text or "lluvia" in text or "ndvi" in text:
        trace.append(
            ToolTrace(
                tool="get_map_layers",
                status="ok",
                latency_ms=0,
                summary="IMERG maxZ=6; NDVI maxZ=7.",
            )
        )
        actions.append(
            UiAction(
                action="focus_map_layer",
                payload={"layer_id": "IMERG_Precipitation_Rate", "date": "2024-06-01"},
            )
        )
        answer = (
            "La capa IMERG es contexto regional (~11 km) y solo se muestra hasta zoom 6. "
            "No es una medición de tu parcela."
        )
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
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        )
        db.add(proposal)
        db.commit()
        db.refresh(proposal)
        actions.append(
            UiAction(action="save_plan_draft", payload={"proposal_id": proposal.id})
        )
        answer = (
            "Preparé un borrador. Necesito que confirmes antes de guardarlo; "
            "si rechazás, no se escribe nada."
        )
    else:
        context = get_context(db, parcel)
        trace.append(
            ToolTrace(
                tool="get_parcel_context",
                status="ok",
                latency_ms=0,
                summary=f"Faltantes: {', '.join(context.missing_inputs) or 'ninguno'}",
            )
        )
        answer = (
            f"Estoy trabajando sobre {parcel.name}. "
            f"Completitud de comparación: {context.completeness.comparison}. "
            "Puedo comparar rotaciones, simular agua/precio o explicar las fuentes."
        )

    ui_context = ui_context or {}
    if ui_context.get("screen") == "map" and not actions:
        actions.append(
            UiAction(action="focus_map_layer", payload={"layer_id": "IMERG_Precipitation_Rate"})
        )

    thread.last_message_at = datetime.now(timezone.utc)
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
    )
