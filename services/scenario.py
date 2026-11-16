from __future__ import annotations

from typing import Any


def apply_scenario_values(
    *,
    water_multiplier: float,
    price_multiplier: float,
    available_mm: float | None,
    gross_irrigation_mm: float | None,
    deficit_mm: float | None,
    feasibility: str,
    margin_pen: float | None,
    margin_pen_ha: float | None,
    income_pen: float | None,
    costs_pen: float | None,
    status: str,
) -> dict[str, Any]:
    """Pure scenario math shared with the TypeScript offline implementation.

    Only derived water/economics values change. ETc, rainfall and crop
    coefficients are never recalculated here.
    """
    next_available = available_mm
    next_deficit = deficit_mm
    next_feasibility = feasibility
    if next_available is not None:
        next_available = round(next_available * water_multiplier, 3)
        if gross_irrigation_mm is not None:
            next_deficit = round(max(0.0, gross_irrigation_mm - next_available), 3)
            next_feasibility = "sufficient" if next_deficit <= 0 else "deficit"

    next_margin = margin_pen
    next_margin_ha = margin_pen_ha
    if income_pen is not None and costs_pen is not None:
        next_margin = round(income_pen * price_multiplier - costs_pen, 2)
        next_margin_ha = None
    elif margin_pen is not None:
        next_margin = round(margin_pen * price_multiplier, 2)

    return {
        "available_mm": next_available,
        "deficit_mm": next_deficit,
        "feasibility": next_feasibility,
        "margin_pen": next_margin,
        "margin_pen_ha": next_margin_ha,
        "status": "invalid" if next_feasibility == "deficit" else status,
    }
