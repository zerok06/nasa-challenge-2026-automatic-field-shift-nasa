from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import ActionProposal, AnalysisRun, Parcel, User
from app.schemas.agent import ToolTrace, UiAction
from app.schemas.analysis import ComparisonOut, ScenarioRequest
from app.use_cases.comparison import create_comparison, get_comparison, simulate
from app.use_cases.context import get_context

TOOL_DECLARATIONS: list[dict[str, Any]] = [
    {
        "name": "get_parcel_context",
        "description": (
            "Devuelve el contexto autorizado de la parcela del hilo: área, distrito, "
            "historial de cultivos, agua, suelo, datos faltantes y calidad de datos. "
            "No requiere parámetros."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "compare_rotations",
        "description": (
            "Compara el plan actual con dos alternativas de rotación usando los motores "
            "deterministas. Devuelve planes con agua, suelo, economía y fuentes. "
            "Úsala antes de simular o guardar."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "horizon_years": {
                    "type": "integer",
                    "enum": [1, 2],
                    "description": "Horizonte en años desde el próximo enero. Default 1.",
                }
            },
        },
    },
    {
        "name": "simulate_scenario",
        "description": (
            "Simula un escenario sobre una comparación existente cambiando agua o precio. "
            "Para 20 % menos agua usa water_multiplier=0.8; para 15 % menos precio usa "
            "price_multiplier=0.85."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "comparison_id": {
                    "type": "string",
                    "description": "ID devuelto por compare_rotations.",
                },
                "water_multiplier": {
                    "type": "number",
                    "description": "Multiplicador de agua disponible entre 0.1 y 2.",
                },
                "price_multiplier": {
                    "type": "number",
                    "description": "Multiplicador de precio entre 0.1 y 2.",
                },
            },
            "required": ["comparison_id"],
        },
    },
    {
        "name": "propose_save_plan",
        "description": (
            "Crea una propuesta de borrador para guardar un plan. No guarda todavía: "
            "el agricultor debe confirmar en la app."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "comparison_id": {
                    "type": "string",
                    "description": "ID devuelto por compare_rotations.",
                },
                "plan_id": {
                    "type": "string",
                    "description": "ID del plan dentro de la comparación.",
                },
                "name": {
                    "type": "string",
                    "description": "Nombre corto del borrador.",
                },
            },
            "required": ["comparison_id", "plan_id"],
        },
    },
]


@dataclass
class ToolOutcome:
    data: dict[str, Any]
    trace: ToolTrace
    evidence: list[str] = field(default_factory=list)
    actions: list[UiAction] = field(default_factory=list)
    analysis_run_id: str | None = None


def _latest_comparison(db: Session, parcel_id: str) -> AnalysisRun | None:
    return db.scalars(
        select(AnalysisRun)
        .where(AnalysisRun.parcel_id == parcel_id, AnalysisRun.kind == "comparison")
        .order_by(AnalysisRun.created_at.desc())
        .limit(1)
    ).first()


def ensure_comparison(
    db: Session, user: User, parcel: Parcel, horizon_years: int = 1
) -> tuple[ComparisonOut, bool]:
    """Return the latest comparison or create one. `created` tells whether it is new."""
    existing = _latest_comparison(db, parcel.id)
    if existing is not None:
        return get_comparison(db, user, existing.id), False
    start = date(date.today().year + 1, 1, 1)
    end = date(start.year + max(1, min(horizon_years, 2)) - 1, 12, 31)
    return create_comparison(db, user, parcel, start, end), True


def _comparison_payload(comparison: ComparisonOut) -> dict[str, Any]:
    return {
        "comparison_id": comparison.comparison_id,
        "scenario_type": comparison.scenario_type,
        "analysis_period": {key: str(value) for key, value in comparison.analysis_period.items()},
        "plan_count": len(comparison.plans),
        "source_snapshots": comparison.source_snapshots,
        "warnings": comparison.warnings,
        "plans": [
            {
                "plan_id": plan.plan_id,
                "label": plan.label,
                "status": plan.status,
                "crop_sequence": plan.crop_sequence,
                "water": {
                    "available_mm": plan.water.available_mm,
                    "gross_irrigation_mm": plan.water.gross_irrigation_mm,
                    "deficit_mm": plan.water.deficit_mm,
                    "feasibility": plan.water.feasibility,
                },
                "economics": {
                    "margin_pen": plan.economics.margin_pen,
                    "margin_pen_ha": plan.economics.margin_pen_ha,
                    "confidence": plan.economics.confidence,
                },
                "risk_flags": plan.risk_flags,
                "missing_inputs": plan.missing_inputs,
            }
            for plan in comparison.plans
        ],
    }


class AgentTools:
    """Executes the allow-listed tools bound to one authenticated parcel."""

    def __init__(self, db: Session, user: User, parcel: Parcel) -> None:
        self.db = db
        self.user = user
        self.parcel = parcel
        self._handlers: dict[str, Callable[[dict[str, Any]], ToolOutcome]] = {
            "get_parcel_context": self._get_parcel_context,
            "compare_rotations": self._compare_rotations,
            "simulate_scenario": self._simulate_scenario,
            "propose_save_plan": self._propose_save_plan,
        }

    @staticmethod
    def declarations() -> list[dict[str, Any]]:
        return TOOL_DECLARATIONS

    def execute(self, name: str, args: dict[str, Any] | None = None) -> ToolOutcome:
        started = time.perf_counter()
        args = args or {}
        handler = self._handlers.get(name)
        if handler is None:
            return ToolOutcome(
                data={"error": "tool_not_allowed"},
                trace=ToolTrace(
                    tool=name,
                    status="error",
                    latency_ms=int((time.perf_counter() - started) * 1000),
                    summary="Herramienta no permitida.",
                ),
            )
        try:
            outcome = handler(args)
        except (LookupError, ValueError) as exc:
            self.db.rollback()
            outcome = ToolOutcome(
                data={"error": str(exc) or "invalid_arguments"},
                trace=ToolTrace(
                    tool=name,
                    status="error",
                    latency_ms=int((time.perf_counter() - started) * 1000),
                    summary="No se pudo ejecutar la herramienta.",
                ),
            )
        except Exception:  # noqa: BLE001 - never leak tool internals to the model
            self.db.rollback()
            outcome = ToolOutcome(
                data={"error": "tool_failed"},
                trace=ToolTrace(
                    tool=name,
                    status="error",
                    latency_ms=int((time.perf_counter() - started) * 1000),
                    summary="Error interno de la herramienta.",
                ),
            )
        outcome.trace.latency_ms = int((time.perf_counter() - started) * 1000)
        return outcome

    def _get_parcel_context(self, _args: dict[str, Any]) -> ToolOutcome:
        context = get_context(self.db, self.parcel)
        data = {
            "parcel": {
                "id": context.parcel.id,
                "name": context.parcel.name,
                "area_ha": context.parcel.area_ha,
                "district": context.parcel.district,
            },
            "missing_inputs": context.missing_inputs,
            "completeness": context.completeness.model_dump(mode="json"),
            "quality_flags": context.quality_flags,
            "crop_history": [
                {
                    "crop_id": item.crop_id,
                    "date_start": str(item.date_start),
                    "date_end": str(item.date_end),
                }
                for item in context.history
            ],
        }
        return ToolOutcome(
            data=data,
            trace=ToolTrace(
                tool="get_parcel_context",
                status="ok",
                summary=f"Faltantes: {', '.join(context.missing_inputs) or 'ninguno'}",
            ),
        )

    def _compare_rotations(self, args: dict[str, Any]) -> ToolOutcome:
        horizon = int(args.get("horizon_years") or 1)
        comparison, created = ensure_comparison(self.db, self.user, self.parcel, horizon)
        summary = (
            f"{len(comparison.plans)} planes generados."
            if created
            else "Se reutiliza la comparación más reciente."
        )
        return ToolOutcome(
            data=_comparison_payload(comparison),
            trace=ToolTrace(tool="compare_rotations", status="ok", summary=summary),
            evidence=list(comparison.source_snapshots),
            actions=[
                UiAction(
                    action="open_comparison",
                    payload={"comparison_id": comparison.comparison_id},
                )
            ],
            analysis_run_id=comparison.comparison_id,
        )

    def _simulate_scenario(self, args: dict[str, Any]) -> ToolOutcome:
        comparison_id = str(args.get("comparison_id") or "").strip()
        if not comparison_id:
            raise ValueError("comparison_id_required")
        water = float(args.get("water_multiplier", 1.0))
        price = float(args.get("price_multiplier", 1.0))
        if water == 1.0 and price == 1.0:
            raise ValueError("scenario_requires_change")
        scenario = simulate(
            self.db,
            self.user,
            comparison_id,
            ScenarioRequest(water_multiplier=water, price_multiplier=price),
        )
        data = _comparison_payload(scenario)
        data["scenario"] = {
            "water_multiplier": water,
            "price_multiplier": price,
        }
        return ToolOutcome(
            data=data,
            trace=ToolTrace(
                tool="simulate_scenario",
                status="ok",
                summary=f"Escenario agua×{water:g}, precio×{price:g}.",
            ),
            evidence=list(scenario.source_snapshots),
            actions=[
                UiAction(
                    action="open_scenario",
                    payload={"comparison_id": scenario.comparison_id},
                )
            ],
            analysis_run_id=scenario.comparison_id,
        )

    def _propose_save_plan(self, args: dict[str, Any]) -> ToolOutcome:
        comparison_id = str(args.get("comparison_id") or "").strip()
        plan_id = str(args.get("plan_id") or "").strip()
        if not comparison_id or not plan_id:
            raise ValueError("comparison_and_plan_required")
        comparison = get_comparison(self.db, self.user, comparison_id)
        if not any(plan.plan_id == plan_id for plan in comparison.plans):
            raise LookupError("plan_not_found")
        name = str(args.get("name") or "Borrador desde el agente").strip()[:120]
        proposal = ActionProposal(
            owner_user_id=self.user.id,
            parcel_id=self.parcel.id,
            type="save_plan",
            payload_json={
                "analysis_run_id": comparison_id,
                "rotation_plan_id": plan_id,
                "name": name or "Borrador desde el agente",
            },
            status="pending",
            expires_at=datetime.now(UTC) + timedelta(minutes=30),
        )
        self.db.add(proposal)
        self.db.commit()
        self.db.refresh(proposal)
        return ToolOutcome(
            data={
                "proposal_id": proposal.id,
                "status": proposal.status,
                "expires_at": proposal.expires_at.isoformat() if proposal.expires_at else None,
            },
            trace=ToolTrace(
                tool="propose_save_plan",
                status="ok",
                summary="Borrador creado; requiere confirmación.",
            ),
            evidence=list(comparison.source_snapshots),
            actions=[
                UiAction(
                    action="save_plan_draft",
                    payload={"proposal_id": proposal.id},
                )
            ],
            analysis_run_id=comparison_id,
        )
