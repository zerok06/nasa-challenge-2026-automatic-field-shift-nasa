from __future__ import annotations

from datetime import date
from typing import Any

from services.results import EconomicsResultOut, SoilResultOut

ECON_VERSION = "econ-v0.1"
SOIL_VERSION = "soil-v0.1"


def calculate_economics(
    area_ha: float | None,
    yield_kg_ha: float | None,
    price_pen_kg: float | None,
    costs_pen: float | None,
    price_type: str = "farmer",
) -> EconomicsResultOut:
    missing: list[str] = []
    for name, value in (
        ("area_ha", area_ha),
        ("yield_kg_ha", yield_kg_ha),
        ("price_pen_kg", price_pen_kg),
        ("costs_pen", costs_pen),
    ):
        if value is None:
            missing.append(name)

    if any(value is None for value in (area_ha, yield_kg_ha, price_pen_kg, costs_pen)):
        return EconomicsResultOut(
            margin_pen=None,
            margin_pen_ha=None,
            break_even_price_pen_kg=None,
            confidence="insufficient_inputs",
            price_assumption_type=price_type if price_type != "none" else "none",
            missing_inputs=missing,
            method_version=ECON_VERSION,
        )

    assert area_ha is not None and yield_kg_ha is not None
    assert price_pen_kg is not None and costs_pen is not None
    production_kg = yield_kg_ha * area_ha
    income = production_kg * price_pen_kg
    # costs_pen is the total cost for the plan. The app label must say so.
    margin = income - costs_pen
    break_even = costs_pen / production_kg if production_kg > 0 else None
    return EconomicsResultOut(
        margin_pen=round(margin, 2),
        margin_pen_ha=round(margin / area_ha, 2) if area_ha > 0 else None,
        break_even_price_pen_kg=round(break_even, 4) if break_even is not None else None,
        income_pen=round(income, 2),
        costs_pen=round(costs_pen, 2),
        production_kg=round(production_kg, 2),
        confidence="complete",
        price_assumption_type=price_type if price_type != "none" else "farmer",
        missing_inputs=[],
        method_version=ECON_VERSION,
    )


def evaluate_soil(
    history: list[dict[str, Any]],
    soil_observations: list[dict[str, Any]],
    plan_steps: list[dict[str, Any]],
) -> SoilResultOut:
    flags: list[str] = []
    notes: list[str] = []

    lab = [o for o in soil_observations if o.get("method") == "lab"]
    reported = [o for o in soil_observations if o.get("method") in {"reported", "lab"}]
    if lab:
        fertility = "measured"
    elif reported:
        fertility = "declared"
    else:
        fertility = "not_measured"
        notes.append("Fertilidad por verificar: no hay análisis de suelo.")

    crops = [step.get("crop_id") for step in plan_steps if step.get("crop_id")]
    families = [step.get("family") for step in plan_steps if step.get("family")]
    if len(families) >= 2 and any(families[i] == families[i + 1] for i in range(len(families) - 1)):
        flags.append("family_repeat")
    if len(set(families)) < len(families):
        flags.append("family_diversity_low")

    for prev, nxt in zip(plan_steps, plan_steps[1:]):
        harvest = prev.get("harvest_date")
        sowing = nxt.get("sowing_date")
        if isinstance(harvest, date) and isinstance(sowing, date):
            gap = (sowing - harvest).days
            if gap > 60:
                flags.append("bare_soil_gt_60d")

    if history and crops:
        last_family = history[-1].get("family")
        if last_family and last_family == families[0]:
            flags.append("previous_family_repeat")

    return SoilResultOut(
        fertility_status=fertility,
        risk_flags=sorted(set(flags)),
        notes=notes,
        method_version=SOIL_VERSION,
    )
