from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class WaterResultOut(BaseModel):
    net_irrigation_mm: float | None = None
    gross_irrigation_mm: float | None = None
    deficit_mm: float | None = None
    available_mm: float | None = None
    feasibility: Literal["sufficient", "deficit", "unknown"] = "unknown"
    missing_inputs: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    method_version: str = "water-v0.1"


class SoilResultOut(BaseModel):
    fertility_status: Literal["not_measured", "declared", "measured"] = "not_measured"
    risk_flags: list[str] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)
    method_version: str = "soil-v0.1"


class EconomicsResultOut(BaseModel):
    margin_pen: float | None = None
    margin_pen_ha: float | None = None
    break_even_price_pen_kg: float | None = None
    income_pen: float | None = None
    costs_pen: float | None = None
    production_kg: float | None = None
    confidence: Literal["complete", "partial", "insufficient_inputs"] = "insufficient_inputs"
    price_assumption_type: Literal["farmer", "historical", "hypothetical", "none"] = "none"
    missing_inputs: list[str] = Field(default_factory=list)
    method_version: str = "econ-v0.1"
