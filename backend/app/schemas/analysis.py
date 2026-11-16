from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from services.results import EconomicsResultOut, SoilResultOut, WaterResultOut


class ComparisonRequest(BaseModel):
    parcel_id: str
    horizon_start: date | None = None
    horizon_end: date | None = None
    priorities: dict[str, float] | None = None


class PlanOut(BaseModel):
    plan_id: str
    label: str
    kind: Literal["existing", "candidate", "example"]
    status: Literal["draft", "eligible", "needs_review", "invalid", "saved"]
    crop_sequence: list[str]
    horizon: dict[str, date]
    water: WaterResultOut
    soil: SoilResultOut
    economics: EconomicsResultOut
    risk_flags: list[str] = Field(default_factory=list)
    missing_inputs: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)
    why_this_plan: list[str] = Field(default_factory=list)
    tradeoffs: list[str] = Field(default_factory=list)


class ComparisonOut(BaseModel):
    comparison_id: str
    parcel_id: str
    analysis_period: dict[str, date]
    plans: list[PlanOut]
    pending_plans: list[PlanOut] = Field(default_factory=list)
    source_snapshots: list[str] = Field(default_factory=list)
    model_version: str = "rotation-engine-v0.2"
    catalog_version: str = "v0.2.5"
    scenario_type: str = "baseline"
    warnings: list[str] = Field(default_factory=list)
    is_simulated: bool = True
    disclaimer: str = (
        "Comparación de apoyo a decisiones bajo supuestos; no es una recomendación "
        "agronómica validada."
    )


class ScenarioRequest(BaseModel):
    water_multiplier: float = Field(default=1.0, gt=0, le=2)
    price_multiplier: float = Field(default=1.0, gt=0, le=2)
    rainfall_case: Literal["historical_typical", "historical_dry"] = "historical_typical"


class SourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    snapshot_id: str
    provider: str
    dataset: str
    product_version: str | None = None
    resolution: str | None = None
    period: dict[str, date]
    retrieved_at: Any
    method: str
    license: str | None = None
    url: str | None = None
    is_simulated: bool = False
