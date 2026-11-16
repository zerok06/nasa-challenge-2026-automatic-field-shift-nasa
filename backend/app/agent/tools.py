from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import UTC, date, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import (
    ActionProposal,
    AnalysisRun,
    Crop,
    Parcel,
    ParcelCropHistory,
    SoilObservation,
    User,
    WaterAvailability,
)
from app.schemas.agent import ToolTrace, UiAction
from app.schemas.analysis import ComparisonOut, ScenarioRequest
from app.use_cases.comparison import create_comparison, get_comparison, simulate
from app.use_cases.context import get_context, parcel_geometry
from app.use_cases.terrain import ensure_terrain
from app.use_cases.weather import fetch_forecast
from app.agent.price_catalog import find_price_reference
from services.ranking import weighted_rank_scores
from services.water_engine import available_mm

ARROBA_KG = 11.5
POWER_MONTHLY_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"

TOOL_DECLARATIONS: list[dict[str, Any]] = [
    {
        "name": "get_catalog_price_reference",
        "description": (
            "Busca un precio histórico de referencia para un cultivo en el catálogo de Moquegua. "
            "Devuelve precio, unidad, año, distrito o ámbito, fuente y estado de cotejo. "
            "Es una referencia editable, no el precio confirmado del agricultor."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "crop_id": {"type": "string", "description": "ID del cultivo del catálogo, por ejemplo aji."},
            },
            "required": ["crop_id"],
        },
    },
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
    {
        "name": "get_parcel_snapshot",
        "description": (
            "Foto actual de la parcela: nombre, distrito, área, agua declarada, "
            "suelo, precios declarados, datos faltantes y frescura de la última "
            "comparación. Úsala primero para hablar de ESTA parcela con datos exactos."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "get_power_trend",
        "description": (
            "Lluvia y temperatura NASA POWER de los últimos 5 años completos para el "
            "punto de la parcela, con totales anuales y tendencia. Para preguntas de "
            "tendencias y sequías pasadas. No es un pronóstico."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "get_forecast",
        "description": (
            "Pronóstico Open-Meteo de 7 días para la parcela: lluvia, ETo de "
            "referencia y temperaturas. Es una estimación de modelo, no SENAMHI."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "get_terrain",
        "description": (
            "Elevación y pendiente SRTM del terreno de la parcela, con fuente."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "estimate_water",
        "description": (
            "Estima el agua de la campaña desde lo que el agricultor SÍ sabe: horas "
            "de riego por semana con caudal y semanas, turnos con m³ por turno, o "
            "m³ de recibo/medidor. Devuelve m³ y mm con la fórmula usada."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "mode": {
                    "type": "string",
                    "enum": ["hours", "turns", "meter"],
                    "description": "hours, turns o meter.",
                },
                "hours_per_week": {"type": "number"},
                "flow_ls": {"type": "number", "description": "Caudal en litros por segundo."},
                "weeks": {"type": "number"},
                "turn_count": {"type": "number"},
                "m3_per_turn": {"type": "number"},
                "meter_m3": {"type": "number"},
            },
            "required": ["mode"],
        },
    },
    {
        "name": "convert_units",
        "description": (
            "Convierte unidades locales a las del motor: arrobas (11.5 kg), sacos "
            "(preguntar kg), S/ por arroba/saco a S/ por kg, y viceversa."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": ["yield", "price"],
                    "description": "yield para cosecha, price para precio.",
                },
                "value": {"type": "number"},
                "from_unit": {
                    "type": "string",
                    "enum": [
                        "kg_ha", "arrobas_ha", "sacos_ha",
                        "pen_kg", "pen_arroba", "pen_saco",
                    ],
                },
                "saco_kg": {
                    "type": "number",
                    "description": "Kg del saco local. Default 50.",
                },
            },
            "required": ["kind", "value", "from_unit"],
        },
    },
    {
        "name": "get_next_questions",
        "description": (
            "Dice qué dato falta para comparar y cuál es la próxima pregunta. "
            "Devuelve una sola pregunta con opciones, priorizando agua, suelo, "
            "precio e historial. Úsala para guiar la captura sin abrumar."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "propose_capture",
        "description": (
            "Propone guardar un dato que el agricultor dictó con sus palabras. "
            "No guarda todavía: crea una propuesta que el agricultor confirma. "
            "kind water (m3, mm, method), soil (variable, value, unit, method), "
            "economics (crop, yield_kg_ha, price_pen_kg, costs_pen), "
            "history (crop_id, date_start, date_end)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "kind": {
                    "type": "string",
                    "enum": ["water", "soil", "economics", "history"],
                },
                "values": {"type": "object"},
                "source_text": {
                    "type": "string",
                    "description": "Lo que dijo el agricultor, para trazabilidad.",
                },
            },
            "required": ["kind", "values"],
        },
    },
    {
        "name": "rank_plans",
        "description": (
            "Ordena los planes de la comparación según las prioridades del "
            "agricultor (agua, ganancia, presupuesto o suelo). No inventes un "
            "puntaje cuando falten datos; marca ese criterio como sin datos."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "priorities": {
                    "type": "object",
                    "description": "Opcional: {'water': 0-1, 'margin': 0-1, 'budget': 0-1, 'soil': 0-1}.",
                },
                "comparison_id": {
                    "type": "string",
                    "description": "Opcional: usa la última comparación si se omite.",
                },
            },
        },
    },
    {
        "name": "audit_parcel",
        "description": (
            "Revisa si los datos de la parcela tienen valores raros: precios o "
            "rendimientos fuera de rango, agua imposible, fechas invertidas. "
            "Devuelve hallazgos con severidad y pregunta sugerida."
        ),
        "parameters": {"type": "object", "properties": {}},
    },
    {
        "name": "explain_plan",
        "description": (
            "Explica un plan con sus cifras exactas: agua, ganancia, suelo, "
            "riesgos y datos faltantes, con fuentes. Úsala para 'por qué sale "
            "esto' sin inventar números."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "plan_id": {
                    "type": "string",
                    "description": "existing, candidate_1, candidate_2. Default: el mejor rankeado.",
                },
                "comparison_id": {
                    "type": "string",
                    "description": "Opcional: usa la última comparación si se omite.",
                },
            },
        },
    },
    {
        "name": "get_saved_plans",
        "description": (
            "Lista los planes guardados (borradores) de la parcela con su estado."
        ),
        "parameters": {"type": "object", "properties": {}},
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
            "get_catalog_price_reference": self._get_catalog_price_reference,
            "get_parcel_context": self._get_parcel_context,
            "compare_rotations": self._compare_rotations,
            "simulate_scenario": self._simulate_scenario,
            "propose_save_plan": self._propose_save_plan,
            "get_parcel_snapshot": self._get_parcel_snapshot,
            "get_power_trend": self._get_power_trend,
            "get_forecast": self._get_forecast,
            "get_terrain": self._get_terrain,
            "estimate_water": self._estimate_water,
            "convert_units": self._convert_units,
            "get_next_questions": self._get_next_questions,
            "propose_capture": self._propose_capture,
            "rank_plans": self._rank_plans,
            "audit_parcel": self._audit_parcel,
            "explain_plan": self._explain_plan,
            "get_saved_plans": self._get_saved_plans,
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

    def _get_catalog_price_reference(self, args: dict[str, Any]) -> ToolOutcome:
        crop_id = str(args.get("crop_id") or "").strip()
        if not crop_id:
            raise ValueError("crop_id_required")
        reference = find_price_reference(crop_id, self.parcel.district)
        if reference is None:
            return ToolOutcome(
                data={"found": False, "crop_id": crop_id, "district": self.parcel.district},
                trace=ToolTrace(
                    tool="get_catalog_price_reference",
                    status="ok",
                    summary="No hay un precio de referencia verificable para este cultivo y zona.",
                ),
            )
        return ToolOutcome(
            data={"found": True, "district": self.parcel.district, **reference},
            trace=ToolTrace(
                tool="get_catalog_price_reference",
                status="ok",
                summary=(
                    f"Referencia: S/ {reference['price_pen_kg']}/kg, "
                    f"{reference.get('year') or 'sin año'}, {reference.get('place') or 'ámbito regional'}."
                ),
            ),
            evidence=[reference["source_id"]] if reference.get("source_id") else [],
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

    def _parcel_center(self) -> tuple[float, float]:
        geometry = parcel_geometry(self.db, self.parcel)
        coords = geometry.get("coordinates") or []
        if geometry.get("type") == "Point" and len(coords) >= 2:
            return float(coords[1]), float(coords[0])
        if geometry.get("type") == "Polygon" and coords:
            ring = coords[0]
            points = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
            if points:
                return (
                    sum(float(p[1]) for p in points) / len(points),
                    sum(float(p[0]) for p in points) / len(points),
                )
        raise ValueError("coordenadas_no_validas")

    def _get_parcel_snapshot(self, _args: dict[str, Any]) -> ToolOutcome:
        context = get_context(self.db, self.parcel)
        waters = list(
            self.db.scalars(
                select(WaterAvailability)
                .where(WaterAvailability.parcel_id == self.parcel.id)
                .order_by(WaterAvailability.start_at.desc())
            ).all()
        )
        latest_water = waters[0] if waters else None
        water_mm = (
            available_mm(
                float(self.parcel.area_ha) if self.parcel.area_ha is not None else None,
                float(latest_water.volume_m3)
                if latest_water is not None and latest_water.volume_m3 is not None
                else None,
                float(latest_water.mm)
                if latest_water is not None and latest_water.mm is not None
                else None,
            )
            if latest_water is not None
            else None
        )
        soils = list(
            self.db.scalars(
                select(SoilObservation).where(SoilObservation.parcel_id == self.parcel.id)
            ).all()
        )
        history = list(
            self.db.scalars(
                select(ParcelCropHistory)
                .where(ParcelCropHistory.parcel_id == self.parcel.id)
                .order_by(ParcelCropHistory.date_start.asc())
            ).all()
        )
        crop_ids = sorted({h.crop_id for h in history if h.crop_id})
        names = {}
        if crop_ids:
            rows = self.db.scalars(select(Crop).where(Crop.id.in_(crop_ids))).all()
            names = {row.id: row.local_name for row in rows}
        econ = (self.parcel.preferences_json or {}).get("economics") or {}
        latest = _latest_comparison(self.db, self.parcel.id)
        data = {
            "parcela": self.parcel.name,
            "distrito": self.parcel.district,
            "area_ha": float(self.parcel.area_ha) if self.parcel.area_ha is not None else None,
            "agua": {
                "disponible_mm": water_mm,
                "metodo": latest_water.method if latest_water else None,
                "periodo": f"{latest_water.start_at} a {latest_water.end_at}"
                if latest_water
                else None,
                "declaraciones": len(waters),
            },
            "suelo": {
                "con_analisis": any(o.method == "lab" for o in soils),
                "observaciones": len(soils),
            },
            "historial": [
                {
                    "cultivo": names.get(h.crop_id, h.crop_id),
                    "desde": str(h.date_start) if h.date_start else None,
                    "hasta": str(h.date_end) if h.date_end else None,
                }
                for h in history
            ],
            "precios": {
                crop: {
                    "rendimiento_kg_ha": (econ[crop] or {}).get("yield_kg_ha"),
                    "precio_pen_kg": (econ[crop] or {}).get("price_pen_kg"),
                    "costo_pen": (econ[crop] or {}).get("costs_pen"),
                }
                for crop in sorted(econ)
            },
            "faltantes": context.missing_inputs,
            "ultima_comparacion": latest.created_at.isoformat() if latest else None,
        }
        return ToolOutcome(
            data=data,
            trace=ToolTrace(
                tool="get_parcel_snapshot",
                status="ok",
                summary=f"{self.parcel.name}: {len(history)} campañas, "
                f"{'agua ' + str(water_mm) + ' mm' if water_mm is not None else 'sin agua'}.",
            ),
        )

    def _get_power_trend(self, _args: dict[str, Any]) -> ToolOutcome:
        import httpx

        lat, lon = self._parcel_center()
        end_year = date.today().year - 1
        years = [end_year - 4, end_year - 3, end_year - 2, end_year - 1, end_year]
        try:
            response = httpx.get(
                POWER_MONTHLY_URL,
                params={
                    "parameters": "PRECTOTCORR,T2M_MAX,T2M_MIN",
                    "community": "AG",
                    "longitude": lon,
                    "latitude": lat,
                    "start": str(years[0]),
                    "end": str(years[-1]),
                    "format": "JSON",
                },
                timeout=15.0,
            )
            response.raise_for_status()
            parameter = response.json().get("properties", {}).get("parameter", {})
        except Exception as exc:  # noqa: BLE001 - surfaced as data, not internals
            raise ValueError("power_no_disponible") from exc
        rain = parameter.get("PRECTOTCORR") or {}
        tmax = parameter.get("T2M_MAX") or {}
        tmin = parameter.get("T2M_MIN") or {}
        annual: list[dict[str, Any]] = []
        for year in years:
            months = [f"{year}{month:02d}" for month in range(1, 13)]
            rains = [rain[m] for m in months if isinstance(rain.get(m), (int, float))]
            highs = [tmax[m] for m in months if isinstance(tmax.get(m), (int, float))]
            lows = [tmin[m] for m in months if isinstance(tmin.get(m), (int, float))]
            if not rains:
                continue
            annual.append(
                {
                    "año": year,
                    "lluvia_mm": round(sum(rains), 1),
                    "tmax_c": round(sum(highs) / len(highs), 1) if highs else None,
                    "tmin_c": round(sum(lows) / len(lows), 1) if lows else None,
                }
            )
        if len(annual) < 2:
            raise ValueError("power_sin_serie")
        rains_only = [row["lluvia_mm"] for row in annual]
        n = len(annual)
        xs = list(range(n))
        slope = (n * sum(x * y for x, y in zip(xs, rains_only)) - sum(xs) * sum(rains_only)) / max(
            1, (n * sum(x * x for x in xs) - sum(xs) ** 2)
        )
        driest = min(annual, key=lambda row: row["lluvia_mm"])
        wettest = max(annual, key=lambda row: row["lluvia_mm"])
        return ToolOutcome(
            data={
                "años": annual,
                "años_count": len(annual),
                "tendencia_mm_por_año": round(slope, 1),
                "año_mas_seco": driest["año"],
                "año_mas_humedo": wettest["año"],
                "nota": "Serie histórica NASA POWER, no es pronóstico.",
            },
            trace=ToolTrace(
                tool="get_power_trend",
                status="ok",
                summary=f"Lluvia {annual[0]['año']}-{annual[-1]['año']}, "
                f"tendencia {slope:+.1f} mm/año.",
            ),
        )

    def _get_forecast(self, _args: dict[str, Any]) -> ToolOutcome:
        lat, lon = self._parcel_center()
        try:
            forecast = fetch_forecast(lat, lon, days=7)
        except Exception as exc:  # noqa: BLE001 - typed upstream
            raise ValueError("pronostico_no_disponible") from exc
        days = forecast.get("days", [])
        rain = round(sum(d.get("precip_mm") or 0 for d in days), 1)
        et0 = round(sum(d.get("et0_mm") or 0 for d in days), 1)
        return ToolOutcome(
            data={
                "dias": days,
                "dias_count": len(days),
                "lluvia_total_mm": rain,
                "eto_total_mm": et0,
                "fuente": "Open-Meteo, estimación de modelo, no SENAMHI.",
            },
            trace=ToolTrace(
                tool="get_forecast",
                status="ok",
                summary=f"7 días: lluvia {rain} mm, ETo {et0} mm.",
            ),
        )

    def _get_terrain(self, _args: dict[str, Any]) -> ToolOutcome:
        terrain = ensure_terrain(self.db, self.parcel)
        if not terrain:
            raise ValueError("terreno_no_disponible")
        return ToolOutcome(
            data=terrain,
            trace=ToolTrace(
                tool="get_terrain",
                status="ok",
                summary=f"{terrain.get('elevation_m')} m, pendiente {terrain.get('slope_pct')} %.",
            ),
        )

    def _estimate_water(self, args: dict[str, Any]) -> ToolOutcome:
        mode = str(args.get("mode") or "").strip()
        area = float(self.parcel.area_ha) if self.parcel.area_ha is not None else None
        if mode == "hours":
            for key in ("hours_per_week", "flow_ls", "weeks"):
                if args.get(key) is None:
                    raise ValueError(f"falta_{key}")
            h, q, w = (float(args["hours_per_week"]), float(args["flow_ls"]), float(args["weeks"]))
            if min(h, q, w) <= 0:
                raise ValueError("valores_deben_ser_positivos")
            m3 = h * 3.6 * q * w
            formula = f"{h:g} h/sem × {q:g} L/s × {w:g} sem"
        elif mode == "turns":
            if args.get("turn_count") is None or args.get("m3_per_turn") is None:
                raise ValueError("falta_turnos")
            n, m = (float(args["turn_count"]), float(args["m3_per_turn"]))
            if min(n, m) <= 0:
                raise ValueError("valores_deben_ser_positivos")
            m3 = n * m
            formula = f"{n:g} turnos × {m:g} m³/turno"
        elif mode == "meter":
            if args.get("meter_m3") is None:
                raise ValueError("falta_medidor")
            m3 = float(args["meter_m3"])
            if m3 <= 0:
                raise ValueError("valores_deben_ser_positivos")
            formula = f"recibo/medidor: {m3:g} m³"
        else:
            raise ValueError("modo_no_valido")
        mm = round(m3 / (area * 10), 1) if area else None
        return ToolOutcome(
            data={
                "m3": round(m3, 1),
                "mm": mm,
                "formula": formula,
                "area_ha": area,
            },
            trace=ToolTrace(
                tool="estimate_water",
                status="ok",
                summary=f"≈ {m3:.0f} m³" + (f" ≈ {mm} mm." if mm is not None else "."),
            ),
        )

    def _convert_units(self, args: dict[str, Any]) -> ToolOutcome:
        kind = str(args.get("kind") or "").strip()
        if args.get("value") is None or not args.get("from_unit"):
            raise ValueError("falta_valor_o_unidad")
        value = float(args["value"])
        unit = str(args["from_unit"])
        saco = float(args.get("saco_kg") or 50)
        if saco <= 0:
            raise ValueError("saco_invalido")
        if kind == "yield":
            if unit == "kg_ha":
                result, out = value, "kg/ha"
            elif unit == "arrobas_ha":
                result, out = value * ARROBA_KG, "kg/ha"
            elif unit == "sacos_ha":
                result, out = value * saco, "kg/ha"
            else:
                raise ValueError("unidad_no_valida")
        elif kind == "price":
            if unit == "pen_kg":
                result, out = value, "S/kg"
            elif unit == "pen_arroba":
                result, out = value / ARROBA_KG, "S/kg"
            elif unit == "pen_saco":
                result, out = value / saco, "S/kg"
            else:
                raise ValueError("unidad_no_valida")
        else:
            raise ValueError("tipo_no_valido")
        return ToolOutcome(
            data={"valor": round(result, 2), "unidad": out, "original": f"{value:g} {unit}"},
            trace=ToolTrace(
                tool="convert_units",
                status="ok",
                summary=f"{value:g} {unit} = {result:.2f} {out}.",
            ),
        )

    def _get_next_questions(self, _args: dict[str, Any]) -> ToolOutcome:
        context = get_context(self.db, self.parcel)
        missing = list(context.missing_inputs)
        order = ["water_available", "soil_analysis", "crop_economics", "crop_history", "area_ha"]
        ranked = sorted(missing, key=lambda m: order.index(m) if m in order else 99)
        questions = {
            "water_available": {
                "key": "water_available",
                "question": "¿Cuánta agua tienes para esta campaña? Puedes decirme horas, turnos o m³, o decir no sé.",
                "options": ["horas por semana", "turnos", "m³ de recibo", "no sé"],
            },
            "soil_analysis": {
                "key": "soil_analysis",
                "question": "¿Tienes análisis de suelo o conoces tu suelo? Si no, dime no tengo.",
                "options": ["tengo análisis", "no tengo", "solo conozco mi suelo"],
            },
            "crop_economics": {
                "key": "crop_economics",
                "question": "¿A cuánto vendes y cuánto gastas por cultivo? Puedes decirlo en arrobas o sacos.",
                "options": ["dar precio y gasto", "no sé"],
            },
            "crop_history": {
                "key": "crop_history",
                "question": "¿Qué sembraste la campaña pasada? Dime el cultivo y listo.",
                "options": ["cebolla", "papa", "maíz", "otro"],
            },
            "area_ha": {
                "key": "area_ha",
                "question": "¿Cuánta superficie tiene tu parcela en hectáreas?",
                "options": [],
            },
        }
        items = [questions[m] for m in ranked if m in questions]
        data = {
            "missing": missing,
            "questions": items,
            "next": items[0] if items else None,
            "completeness": context.completeness.model_dump(mode="json"),
        }
        summary = (
            f"Faltan {len(missing)} datos." if missing else "Parcela lista para comparar."
        )
        return ToolOutcome(
            data=data,
            trace=ToolTrace(tool="get_next_questions", status="ok", summary=summary),
        )

    def _propose_capture(self, args: dict[str, Any]) -> ToolOutcome:
        kind = str(args.get("kind") or "").strip()
        values = args.get("values")
        if kind not in ("water", "soil", "economics", "history"):
            raise ValueError("tipo_no_valido")
        if not isinstance(values, dict) or not values:
            raise ValueError("faltan_valores")
        source_text = str(args.get("source_text") or "")[:500]
        proposal = ActionProposal(
            owner_user_id=self.user.id,
            parcel_id=self.parcel.id,
            type=f"capture_{kind}",
            payload_json={"kind": kind, "values": values, "source_text": source_text},
            status="pending",
            expires_at=datetime.now(UTC) + timedelta(minutes=60),
        )
        self.db.add(proposal)
        self.db.commit()
        self.db.refresh(proposal)
        labels = {
            "water": "agua",
            "soil": "suelo",
            "economics": "precio y gasto",
            "history": "historial",
        }
        return ToolOutcome(
            data={
                "proposal_id": proposal.id,
                "kind": kind,
                "values": values,
                "status": proposal.status,
                "expires_at": proposal.expires_at.isoformat() if proposal.expires_at else None,
            },
            trace=ToolTrace(
                tool="propose_capture",
                status="ok",
                summary=f"Propuesta de {labels[kind]} lista; requiere confirmación.",
            ),
            actions=[
                UiAction(
                    action="capture_draft",
                    payload={"proposal_id": proposal.id, "kind": kind},
                )
            ],
        )

    def _resolve_weights(self, override: dict[str, Any] | None) -> dict[str, float]:
        prefs = self.parcel.preferences_json or {}
        weights = {"water": 0.5, "margin": 0.3, "budget": 0.2, "soil": 0.0}
        raw_priorities = (override or prefs.get("priorities") or prefs.get("weights") or {})
        try:
            nums = {k: float(v) for k, v in raw_priorities.items() if k in weights}
        except (TypeError, ValueError):
            nums = {}
        if nums and sum(nums.values()) > 0:
            total = sum(nums.values())
            return {k: round(nums.get(k, 0) / total, 3) for k in weights}
        return weights

    def _rank_plans(self, args: dict[str, Any]) -> ToolOutcome:
        comparison_id = str(args.get("comparison_id") or "").strip() or None
        override = args.get("priorities") if isinstance(args.get("priorities"), dict) else None
        if comparison_id:
            comparison = get_comparison(self.db, self.user, comparison_id)
        else:
            comparison, _ = ensure_comparison(self.db, self.user, self.parcel)
        weights = self._resolve_weights(override)
        dimensions = {
            "water": [plan.water.gross_irrigation_mm for plan in comparison.plans],
            "margin": [plan.economics.margin_pen for plan in comparison.plans],
            "budget": [plan.economics.costs_pen for plan in comparison.plans],
            "soil": [
                {"measured": 1.0, "declared": 0.7}.get(plan.soil.fertility_status)
                for plan in comparison.plans
            ],
        }
        dimension_scores = {
            name: weighted_rank_scores(
                {name: values}, {name: 1.0},
                lower_is_better={name} if name in {"water", "budget"} else set(),
            )
            for name, values in dimensions.items()
        }
        overall_scores = weighted_rank_scores(
            dimensions,
            weights,
            lower_is_better={"water", "budget"},
        )
        scored: list[dict[str, Any]] = []
        for index, plan in enumerate(comparison.plans):
            if plan.status == "invalid":
                total = 0.0
            else:
                total = overall_scores[index]
            scored.append(
                {
                    "plan_id": plan.plan_id,
                    "label": plan.label,
                    "kind": plan.kind,
                    "status": plan.status,
                    "score": total,
                    "scores": {
                        name: dimension_scores[name][index]
                        for name in dimensions
                    },
                    "crop_sequence": plan.crop_sequence,
                    "missing_inputs": plan.missing_inputs,
                }
            )
        scored.sort(
            key=lambda item: (item["score"] is not None, item["score"] or 0),
            reverse=True,
        )
        reasons = [
            f"{item['label']}: agua {item['scores']['water'] if item['scores']['water'] is not None else 'sin datos'}, "
            f"ganancia {item['scores']['margin'] if item['scores']['margin'] is not None else 'sin datos'}, "
            f"presupuesto {item['scores']['budget'] if item['scores']['budget'] is not None else 'sin datos'}."
            for item in scored
        ]
        return ToolOutcome(
            data={
                "comparison_id": comparison.comparison_id,
                "weights": weights,
                "ranking": scored,
                "best_plan_id": scored[0]["plan_id"]
                if scored and scored[0]["score"] is not None
                else None,
                "reasons": reasons,
            },
            trace=ToolTrace(
                tool="rank_plans",
                status="ok",
                summary=f"{len(scored)} planes ordenados; mejor: {scored[0]['label']}."
                if scored else "Sin planes.",
            ),
            evidence=list(comparison.source_snapshots),
            analysis_run_id=comparison.comparison_id,
        )

    def _audit_parcel(self, _args: dict[str, Any]) -> ToolOutcome:
        context = get_context(self.db, self.parcel)
        econ = (self.parcel.preferences_json or {}).get("economics") or {}
        issues: list[dict[str, Any]] = []
        for crop, item in econ.items():
            data = item or {}
            yld = data.get("yield_kg_ha")
            price = data.get("price_pen_kg")
            cost = data.get("costs_pen")
            if isinstance(yld, (int, float)) and (yld <= 0 or yld > 120000):
                issues.append(
                    {
                        "severity": "alta",
                        "campo": f"economics.{crop}.yield_kg_ha",
                        "valor": yld,
                        "pregunta": f"El rendimiento de {crop} ({yld} kg/ha) parece raro. ¿Es por kilo o por saco?",
                    }
                )
            if isinstance(price, (int, float)) and (price <= 0 or price > 50):
                issues.append(
                    {
                        "severity": "alta",
                        "campo": f"economics.{crop}.price_pen_kg",
                        "valor": price,
                        "pregunta": f"El precio de {crop} (S/ {price}/kg) parece raro. ¿Es por kilo o por saco?",
                    }
                )
            if isinstance(cost, (int, float)) and cost < 0:
                issues.append(
                    {
                        "severity": "alta",
                        "campo": f"economics.{crop}.costs_pen",
                        "valor": cost,
                        "pregunta": "El gasto no puede ser negativo. ¿Cuánto gastas en total?",
                    }
                )
        waters = list(
            self.db.scalars(
                select(WaterAvailability)
                .where(WaterAvailability.parcel_id == self.parcel.id)
                .order_by(WaterAvailability.start_at.desc())
            ).all()
        )
        for water in waters[:3]:
            mm = available_mm(
                float(self.parcel.area_ha) if self.parcel.area_ha is not None else None,
                float(water.volume_m3) if water.volume_m3 is not None else None,
                float(water.mm) if water.mm is not None else None,
            )
            if mm is not None and (mm <= 0 or mm > 5000):
                issues.append(
                    {
                        "severity": "media",
                        "campo": "water_available",
                        "valor": mm,
                        "pregunta": f"El agua ({mm} mm) parece rara. ¿Fueron horas, turnos o m³?",
                    }
                )
        if self.parcel.area_ha is not None and (
            float(self.parcel.area_ha) <= 0 or float(self.parcel.area_ha) > 500
        ):
            issues.append(
                {
                    "severity": "alta",
                    "campo": "area_ha",
                    "valor": float(self.parcel.area_ha),
                    "pregunta": "La superficie parece rara. ¿Cuántas hectáreas tiene tu parcela?",
                }
            )
        history = list(
            self.db.scalars(
                select(ParcelCropHistory)
                .where(ParcelCropHistory.parcel_id == self.parcel.id)
                .order_by(ParcelCropHistory.date_start.asc())
            ).all()
        )
        for row in history:
            if row.date_start and row.date_end and row.date_end < row.date_start:
                issues.append(
                    {
                        "severity": "media",
                        "campo": "crop_history",
                        "valor": f"{row.date_start} a {row.date_end}",
                        "pregunta": "Una campaña termina antes de empezar. ¿Cuáles son las fechas correctas?",
                    }
                )
        data = {
            "issues": issues,
            "issues_count": len(issues),
            "missing": context.missing_inputs,
            "ok": not issues,
        }
        return ToolOutcome(
            data=data,
            trace=ToolTrace(
                tool="audit_parcel",
                status="ok",
                summary=f"{len(issues)} hallazgos." if issues else "Datos dentro de rangos.",
            ),
        )

    def _explain_plan(self, args: dict[str, Any]) -> ToolOutcome:
        comparison_id = str(args.get("comparison_id") or "").strip() or None
        plan_id = str(args.get("plan_id") or "").strip() or None
        if comparison_id:
            comparison = get_comparison(self.db, self.user, comparison_id)
        else:
            comparison, _ = ensure_comparison(self.db, self.user, self.parcel)
        plan = None
        if plan_id:
            plan = next((p for p in comparison.plans if p.plan_id == plan_id), None)
            if plan is None:
                raise ValueError("plan_no_encontrado")
        else:
            ranked = self._rank_plans({}).data["ranking"]
            best = ranked[0]["plan_id"] if ranked else None
            plan = next((p for p in comparison.plans if p.plan_id == best), comparison.plans[0])
        water_text = (
            f"{plan.water.gross_irrigation_mm} mm necesita, "
            f"{plan.water.available_mm if plan.water.available_mm is not None else 'no disponible'} mm tienes."
            if plan.water.gross_irrigation_mm is not None
            else "Agua no calculable."
        )
        margin_text = (
            f"S/ {plan.economics.margin_pen:,.2f} de ganancia."
            if plan.economics.margin_pen is not None
            else "Ganancia no calculable."
        )
        return ToolOutcome(
            data={
                "comparison_id": comparison.comparison_id,
                "plan_id": plan.plan_id,
                "label": plan.label,
                "crop_sequence": plan.crop_sequence,
                "agua": water_text,
                "ganancia": margin_text,
                "suelo": plan.soil.fertility_status,
                "riesgos": plan.risk_flags,
                "faltantes": plan.missing_inputs,
                "fuentes": list(comparison.source_snapshots),
            },
            trace=ToolTrace(
                tool="explain_plan",
                status="ok",
                summary=f"{plan.label}: {water_text} {margin_text}",
            ),
            evidence=list(comparison.source_snapshots),
            analysis_run_id=comparison.comparison_id,
        )

    def _get_saved_plans(self, _args: dict[str, Any]) -> ToolOutcome:
        from app.models.entities import SavedDecision

        rows = list(
            self.db.scalars(
                select(SavedDecision)
                .where(SavedDecision.parcel_id == self.parcel.id)
                .order_by(SavedDecision.created_at.desc())
                .limit(10)
            ).all()
        )
        return ToolOutcome(
            data={
                "planes": [
                    {
                        "id": row.id,
                        "nombre": row.name,
                        "estado": row.status,
                        "creado": row.created_at.isoformat() if row.created_at else None,
                    }
                    for row in rows
                ],
                "total": len(rows),
            },
            trace=ToolTrace(
                tool="get_saved_plans",
                status="ok",
                summary=f"{len(rows)} planes guardados.",
            ),
        )
