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
from services.ranking import weighted_rank_scores
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
    costs_complete = True
    income_complete = True
    for step in steps:
        crop_id = step["crop_id"]
        item = economics.get(crop_id)
        if not item:
            missing.append(f"economics.{crop_id}")
            costs_complete = False
            income_complete = False
            continue
        source = item.get("price_source")
        confirmed = item.get("price_confirmed")
        legacy_reference = source is None and price_type in {"historical", "reference"}
        is_unconfirmed = confirmed is False or (
            source == "catalog_reference" and confirmed is not True
        ) or (legacy_reference and confirmed is not True)
        if is_unconfirmed:
            missing.append(f"economics.{crop_id}.price_confirmation")
        effective_price = (
            item.get("price_pen_kg")
            if not is_unconfirmed
            else None
        )
        yield_val = item.get("yield_kg_ha")
        costs_val = item.get("costs_pen")
        for key, value in (
            ("yield_kg_ha", yield_val),
            ("price_pen_kg", effective_price),
            ("costs_pen", costs_val),
        ):
            if value is None:
                missing.append(f"economics.{crop_id}.{key}")
        if costs_val is None:
            costs_complete = False
        else:
            costs += float(costs_val)
        if area_ha is None:
            missing.append("area_ha")
            income_complete = False
            continue
        if yield_val is None or effective_price is None:
            income_complete = False
            continue
        step_production = float(yield_val) * area_ha
        # marketable_share caps how much of the total area is actually sold;
        # default 1.0 keeps backward-compatible behaviour.  Use an explicit
        # None check so 0.0 is respected as "nothing sold".
        marketable = item.get("marketable_share")
        if marketable is not None:
            step_production *= float(marketable)
        production += step_production
        income += step_production * float(effective_price)
    if missing:
        # A margin needs both a known income and complete costs. Report the
        # declared cost total so the UI can show the budget without inventing a
        # result.
        margin_known = income_complete and costs_complete
        return EconomicsResultOut(
            confidence="partial",
            price_assumption_type=price_type,
            margin_pen=round(income - costs, 2) if margin_known else None,
            margin_pen_ha=(
                round((income - costs) / area_ha, 2)
                if margin_known and area_ha
                else None
            ),
            break_even_price_pen_kg=None,
            income_pen=round(income, 2) if income_complete else None,
            costs_pen=round(costs, 2) if costs_complete else None,
            production_kg=round(production, 2) if income_complete else None,
            missing_inputs=sorted(set(missing)),
        )
    margin = income - costs
    break_even = costs / production if production > 0 else None
    return EconomicsResultOut(
        margin_pen=round(margin, 2),
        margin_pen_ha=round(margin / area_ha, 2) if area_ha else None,
        break_even_price_pen_kg=round(break_even, 4) if break_even is not None else None,
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


def _priority_weights(preferences: dict[str, Any]) -> dict[str, float]:
    raw = preferences.get("priorities") or preferences.get("weights") or {}
    allowed = ("water", "margin", "budget", "soil")
    try:
        values = {key: max(0.0, float(raw.get(key, 0))) for key in allowed}
    except (TypeError, ValueError):
        values = {}
    if sum(values.values()) <= 0:
        return {"water": 0.5, "margin": 0.3, "budget": 0.2, "soil": 0.0}
    return values


def _select_baseline_and_alternatives(
    evaluated: list[PlanOut], preferences: dict[str, Any]
) -> tuple[list[PlanOut], list[PlanOut]]:
    """Return (selected_plans, pending_plans).

    selected: existing + up to 2 alternatives with distinct crop sets.
    pending: candidates not selected (incomplete economics or duplicates).
    """
    if len(evaluated) <= 1:
        return evaluated, []
    baseline, candidates = evaluated[0], [plan for plan in evaluated[1:] if plan.status != "invalid"]
    pending: list[PlanOut] = []

    # Deduplicate by crop set (unordered), keep first occurrence.
    seen_sets: set[frozenset[str]] = set()
    deduped: list[PlanOut] = []
    for plan in candidates:
        crop_set = frozenset(plan.crop_sequence)
        if crop_set in seen_sets:
            pending.append(plan)
            continue
        seen_sets.add(crop_set)
        deduped.append(plan)

    if not deduped:
        return [baseline], candidates

    weights = _priority_weights(preferences)
    scores = weighted_rank_scores(
        {
            "water": [plan.water.gross_irrigation_mm for plan in deduped],
            "margin": [plan.economics.margin_pen for plan in deduped],
            "budget": [plan.economics.costs_pen for plan in deduped],
            "soil": [
                {"measured": 1.0, "declared": 0.7, "not_measured": 0.5}.get(
                    plan.soil.fertility_status
                )
                for plan in deduped
            ],
        },
        weights,
        lower_is_better={"water", "budget"},
    )
    order = sorted(
        range(len(deduped)),
        key=lambda index: (scores[index] is not None, scores[index] or 0),
        reverse=True,
    )
    selected = [baseline]
    chosen_indexes = list(order[:2])
    # Guarantee at least one economically evaluable alternative when one
    # exists. Plans with a null margin stay visible in `pending_plans` instead
    # of pretending they can be compared on money.
    complete_indexes = [
        index for index in order if deduped[index].economics.margin_pen is not None
    ]
    if complete_indexes and not any(
        deduped[index].economics.margin_pen is not None for index in chosen_indexes
    ):
        best = complete_indexes[0]
        if chosen_indexes:
            chosen_indexes[-1] = best
        else:
            chosen_indexes.append(best)
    for position, index in enumerate(chosen_indexes):
        plan = deduped[index]
        plan.label = "Alternativa B" if position == 0 else "Alternativa C"
        selected.append(plan)
    chosen = set(chosen_indexes)
    pending.extend(plan for index, plan in enumerate(deduped) if index not in chosen)
    return selected, pending


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
    drafts, pending_drafts = build_plan_drafts(history, crops, start, end)
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
    # Use crop-stage window for effective rain, not the full horizon.
    # Fall back to horizon total when stage dates are unavailable.
    stage_days = 0
    for draft in drafts:
        for step in draft.steps:
            stage_days = max(stage_days, int(step.get("duration_days", 0) or 0))
    rain_period_days = stage_days if stage_days > 0 else horizon_days
    rain_effective = effective_rain(avg_precip * rain_period_days)

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

    evaluated_plans: list[PlanOut] = []
    all_plan_inputs: dict[str, Any] = {}
    # Evaluate the selected drafts plus the pending ones so the UI can explain
    # why some alternatives are missing data instead of silently hiding them.
    for draft in [*drafts, *pending_drafts]:
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
        evaluated_plans.append(plan)
        all_plan_inputs[draft.plan_id] = inputs

    preferences = parcel.preferences_json or {}
    plans, pending_plans = _select_baseline_and_alternatives(evaluated_plans, preferences)
    selected_ids = {plan.plan_id for plan in plans}
    plan_inputs = {
        plan_id: inputs
        for plan_id, inputs in all_plan_inputs.items()
        if plan_id in selected_ids
    }

    # If no alternatives are viable, add a note to the baseline plan.
    no_viable = len(plans) == 1 and all(
        p.status == "invalid" or p.economics.confidence in {"insufficient_inputs", "partial"}
        for p in evaluated_plans[1:]
    )
    if no_viable and plans:
        plans[0].assumptions.append(
            "No se encontraron alternativas viables con las restricciones actuales. "
            "Puedes relajar el agua disponible, el presupuesto o el horizonte."
        )

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
        draft = next(
            d for d in [*drafts, *pending_drafts] if d.plan_id == plan.plan_id
        )
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
        for step in draft.steps:
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
        pending_plans=pending_plans,
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
