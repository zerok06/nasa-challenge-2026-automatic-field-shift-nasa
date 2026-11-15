from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import (
    AnalysisRun,
    Crop,
    Parcel,
    RotationPlan,
    RotationPlanStep,
    SoilObservation,
    User,
)
from app.schemas.analysis import (
    ComparisonOut,
    EconomicsResultOut,
    PlanOut,
    ScenarioRequest,
)
from app.use_cases.climate import ClimateDataUnavailable, ensure_power_snapshot
from app.use_cases.context import get_context
from services.economics import evaluate_soil
from services.rotations import PlanDraft, build_plan_drafts
from services.scenario import apply_scenario_values
from services.water_engine import (
    available_mm,
    effective_rain,
    etc_from_stages,
    water_balance,
)

MODEL_VERSION = "rotation-engine-v0.1"
CATALOG_VERSION = "v0.1"


def _avg(records: list[dict[str, Any]], key: str) -> float | None:
    values = [float(r[key]) for r in records if r.get(key) is not None]
    if not values:
        return None
    return sum(values) / len(values)


def _plan_economics(
    steps: list[dict[str, Any]], preferences: dict[str, Any], area_ha: float | None
) -> EconomicsResultOut:
    economics = preferences.get("economics") or {}
    price_type = preferences.get("price_assumption_type", "farmer")
    if not economics:
        return EconomicsResultOut(
            confidence="insufficient_inputs",
            price_assumption_type="none",
            missing_inputs=["crop_economics"],
        )
    missing: list[str] = []
    production = 0.0
    income = 0.0
    costs = 0.0
    for step in steps:
        crop_id = step["crop_id"]
        item = economics.get(crop_id)
        if not item:
            missing.append(f"economics.{crop_id}")
            continue
        for key in ("yield_kg_ha", "price_pen_kg", "costs_pen"):
            if item.get(key) is None:
                missing.append(f"economics.{crop_id}.{key}")
        if area_ha is None:
            missing.append("area_ha")
            continue
        production += float(item["yield_kg_ha"]) * area_ha
        income += float(item["yield_kg_ha"]) * area_ha * float(item["price_pen_kg"])
        costs += float(item["costs_pen"])
    if missing:
        return EconomicsResultOut(
            confidence="partial",
            price_assumption_type=price_type,
            missing_inputs=sorted(set(missing)),
        )
    margin = income - costs
    return EconomicsResultOut(
        margin_pen=round(margin, 2),
        margin_pen_ha=round(margin / area_ha, 2) if area_ha else None,
        break_even_price_pen_kg=None,
        income_pen=round(income, 2),
        costs_pen=round(costs, 2),
        production_kg=round(production, 2),
        confidence="complete",
        price_assumption_type=price_type,
        missing_inputs=[],
    )


def _evaluate_plan(
    draft: PlanDraft,
    crops: dict[str, Crop],
    parcel: Parcel,
    history: list[dict[str, Any]],
    soil_rows: list[SoilObservation],
    avg_eto: float,
    rain_effective_mm: float,
    available: float | None,
    efficiency: float | None,
) -> tuple[PlanOut, dict[str, Any]]:
    etc_total: float | None = 0.0
    for step in draft.steps:
        crop = crops.get(step["crop_id"])
        if crop is None:
            etc_total = None
            break
        stages = crop.kc_json.get("stages", [])
        etc_stage = etc_from_stages(stages, avg_eto)
        if etc_stage is None:
            etc_total = None
            break
        etc_total += etc_stage

    water = water_balance(
        etc_mm=etc_total,
        rain_effective_mm=rain_effective_mm,
        available=available,
        efficiency=efficiency,
        area_ha=float(parcel.area_ha) if parcel.area_ha is not None else None,
        volume_m3=None,
    )
    soil = evaluate_soil(
        history,
        [{"method": s.method, "variable": s.variable, "value": float(s.value) if s.value is not None else None} for s in soil_rows],
        draft.steps,
    )
    econ = _plan_economics(draft.steps, parcel.preferences_json or {}, float(parcel.area_ha) if parcel.area_ha is not None else None)

    status = draft.status
    if status != "invalid":
        if water.feasibility == "deficit":
            status = "invalid"
        elif water.feasibility == "unknown" or any(
            crops.get(s["crop_id"]) and crops[s["crop_id"]].review_status == "needs_review"
            for s in draft.steps
        ):
            status = "needs_review"
        else:
            status = "eligible"

    risk_flags = set(draft.reasons)
    if water.feasibility == "unknown":
        risk_flags.add("water_unknown")
    if water.feasibility == "deficit":
        risk_flags.add("water_deficit")
    risk_flags.update(soil.risk_flags)
    missing = set(draft.reasons) | set(water.missing_inputs) | set(econ.missing_inputs)
    if soil.fertility_status == "not_measured":
        missing.add("soil_analysis")

    assumptions = list(water.assumptions)
    assumptions.append("ETo calculada desde el snapshot NASA POWER/MERRA-2.")
    assumptions.append("Precios/costos/rendimientos son datos demo o declarados.")

    plan = PlanOut(
        plan_id=draft.plan_id,
        label=draft.label,
        kind=draft.kind,
        status=status,
        crop_sequence=draft.crop_sequence,
        horizon={"start": date.min, "end": date.min},
        water=water,
        soil=soil,
        economics=econ,
        risk_flags=sorted(risk_flags),
        missing_inputs=sorted(missing),
        assumptions=assumptions,
        why_this_plan=draft.why,
        tradeoffs=draft.tradeoffs,
    )
    inputs = {
        "etc_mm": etc_total,
        "gross_irrigation_mm": water.gross_irrigation_mm,
        "available_mm": water.available_mm,
        "income_pen": None,
        "costs_pen": None,
        "production_kg": None,
    }
    return plan, inputs


def create_comparison(
    db: Session,
    user: User,
    parcel: Parcel,
    start: date,
    end: date,
    idempotency_key: str | None = None,
) -> ComparisonOut:
    if end < start:
        raise ValueError("El fin del horizonte debe ser >= el inicio")
    context = get_context(db, parcel)
    history = [
        {
            "crop_id": h.crop_id,
            "family": h.family,
            "date_start": h.date_start,
            "date_end": h.date_end,
        }
        for h in context.history
    ]
    soil_rows = list(
        db.scalars(select(SoilObservation).where(SoilObservation.parcel_id == parcel.id)).all()
    )
    crops = {c.id: c for c in db.scalars(select(Crop)).all()}
    drafts = build_plan_drafts(history, crops, start, end)
    snapshot = ensure_power_snapshot(db, parcel)
    if snapshot is None:
        raise ClimateDataUnavailable(
            "No pudimos obtener datos reales de NASA POWER para esta parcela."
        )
    records = snapshot.metadata_json.get("records", [])
    if not records:
        raise ClimateDataUnavailable(
            "El paquete de clima de la parcela no contiene registros."
        )
    avg_eto = _avg(records, "eto_mm")
    avg_precip = _avg(records, "precip_mm")
    if avg_eto is None or avg_precip is None:
        raise ClimateDataUnavailable(
            "NASA POWER no devolvió temperatura y lluvia suficientes."
        )
    snapshot_id = snapshot.id
    horizon_days = (end - start).days + 1
    rain_effective = effective_rain(avg_precip * horizon_days)

    latest_water = context.water[-1] if context.water else None
    available = None
    efficiency = None
    if latest_water:
        available = available_mm(
            float(parcel.area_ha) if parcel.area_ha is not None else None,
            float(latest_water.volume_m3) if latest_water.volume_m3 is not None else None,
            float(latest_water.mm) if latest_water.mm is not None else None,
        )
        efficiency = latest_water.efficiency

    plans: list[PlanOut] = []
    plan_inputs: dict[str, Any] = {}
    for draft in drafts:
        plan, inputs = _evaluate_plan(
            draft,
            crops,
            parcel,
            history,
            soil_rows,
            avg_eto,
            rain_effective,
            available,
            efficiency,
        )
        plan.horizon = {"start": start, "end": end}
        plans.append(plan)
        plan_inputs[draft.plan_id] = inputs

    run = AnalysisRun(
        parcel_id=parcel.id,
        kind="comparison",
        model_version=MODEL_VERSION,
        catalog_version=CATALOG_VERSION,
        inputs_json={
            "horizon": {"start": start.isoformat(), "end": end.isoformat()},
            "avg_eto": avg_eto,
            "avg_precip": avg_precip,
            "available_mm": available,
            "efficiency": efficiency,
            "plans": plan_inputs,
        },
        snapshot_ids=[snapshot_id] if snapshot_id else [],
        status="completed",
        warnings_json=[],
        idempotency_key=idempotency_key,
    )
    db.add(run)
    db.flush()

    for plan in plans:
        db_plan = RotationPlan(
            parcel_id=parcel.id,
            analysis_run_id=run.id,
            label=plan.label,
            kind=plan.kind,
            horizon_start=start,
            horizon_end=end,
            status=plan.status,
            version=1,
            assumptions_json={"missing_inputs": plan.missing_inputs},
        )
        db.add(db_plan)
        db.flush()
        plan.plan_id = db_plan.id
        for step in next(d for d in drafts if d.label == plan.label).steps:
            db.add(
                RotationPlanStep(
                    plan_id=db_plan.id,
                    crop_id=step["crop_id"],
                    sowing_date=step["sowing_date"],
                    harvest_date=step["harvest_date"],
                    ordinal=step["ordinal"],
                )
            )

    comparison = ComparisonOut(
        comparison_id=run.id,
        parcel_id=parcel.id,
        analysis_period={"start": start, "end": end},
        plans=plans,
        source_snapshots=[snapshot_id] if snapshot_id else [],
        model_version=MODEL_VERSION,
        catalog_version=CATALOG_VERSION,
        scenario_type="baseline",
        warnings=[] if snapshot_id else ["snapshot_missing"],
        is_simulated=bool(parcel.is_simulated),
        disclaimer=(
            "Comparación de apoyo a decisiones bajo supuestos; no es una recomendación "
            "agronómica validada."
        ),
    )
    run.results_json = comparison.model_dump(mode="json")
    db.commit()
    return comparison


def get_comparison(db: Session, user: User, comparison_id: str) -> ComparisonOut:
    run = db.get(AnalysisRun, comparison_id)
    if run is None:
        raise LookupError("comparison_not_found")
    parcel = db.get(Parcel, run.parcel_id)
    if parcel is None or parcel.owner_user_id != user.id:
        raise LookupError("comparison_not_found")
    return ComparisonOut.model_validate(run.results_json)


def simulate(
    db: Session, user: User, comparison_id: str, request: ScenarioRequest
) -> ComparisonOut:
    baseline = get_comparison(db, user, comparison_id)
    run = db.get(AnalysisRun, comparison_id)
    assert run is not None
    inputs = run.inputs_json or {}
    plans = []
    for plan in baseline.plans:
        water = plan.water.model_copy(deep=True)
        econ = plan.economics.model_copy(deep=True)
        derived = apply_scenario_values(
            water_multiplier=request.water_multiplier,
            price_multiplier=request.price_multiplier,
            available_mm=water.available_mm,
            gross_irrigation_mm=water.gross_irrigation_mm,
            deficit_mm=water.deficit_mm,
            feasibility=water.feasibility,
            margin_pen=econ.margin_pen,
            margin_pen_ha=econ.margin_pen_ha,
            income_pen=econ.income_pen,
            costs_pen=econ.costs_pen,
            status=plan.status,
        )
        water.available_mm = derived["available_mm"]
        water.deficit_mm = derived["deficit_mm"]
        water.feasibility = derived["feasibility"]
        econ.margin_pen = derived["margin_pen"]
        econ.margin_pen_ha = derived["margin_pen_ha"]
        plans.append(
            plan.model_copy(
                update={
                    "water": water,
                    "economics": econ,
                    "status": derived["status"],
                }
            )
        )
    scenario = ComparisonOut(
        comparison_id=new_id(),
        parcel_id=baseline.parcel_id,
        analysis_period=baseline.analysis_period,
        plans=plans,
        source_snapshots=baseline.source_snapshots,
        model_version=baseline.model_version,
        catalog_version=baseline.catalog_version,
        scenario_type="hypothetical",
        warnings=baseline.warnings,
        is_simulated=True,
        disclaimer=baseline.disclaimer,
    )
    child = AnalysisRun(
        id=scenario.comparison_id,
        parcel_id=baseline.parcel_id,
        kind="scenario",
        model_version=MODEL_VERSION,
        catalog_version=CATALOG_VERSION,
        inputs_json={"parent": comparison_id, "request": request.model_dump()},
        snapshot_ids=baseline.source_snapshots,
        status="completed",
        results_json=scenario.model_dump(mode="json"),
        warnings_json=baseline.warnings,
        parent_run_id=comparison_id,
    )
    db.add(child)
    db.commit()
    return scenario


def new_id() -> str:
    from uuid import uuid4

    return str(uuid4())
