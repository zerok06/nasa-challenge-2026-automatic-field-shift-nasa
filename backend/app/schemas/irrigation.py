from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class IrrigationDayOut(BaseModel):
    date: str
    precip_mm: float | None = None
    et0_mm: float | None = None
    effective_rain_mm: float | None = None
    net_demand_mm: float | None = None
    tmax_c: float | None = None
    tmin_c: float | None = None


class IrrigationTotalsOut(BaseModel):
    days: int
    precip_mm: float
    effective_rain_mm: float
    et0_mm: float
    net_demand_mm: float | None = None


class IrrigationWaterOut(BaseModel):
    available_mm: float | None = None
    period_start: str
    period_end: str
    method: str
    efficiency: float | None = None
    confidence: str


class TerrainOut(BaseModel):
    elevation_m: float
    slope_pct: float | None = None
    slope_class: Literal["flat", "gentle", "moderate", "steep", "unknown"]
    source: str
    provider: str
    resolution: str
    license: str
    quality: str
    points: int
    sampled_at: str


class IrrigationOut(BaseModel):
    parcel_id: str
    generated_at: str
    forecast_source: dict[str, Any]
    forecast: list[IrrigationDayOut]
    totals: IrrigationTotalsOut
    water: IrrigationWaterOut | None = None
    water_status: Literal[
        "unknown",
        "rain_covers",
        "water_unknown",
        "water_sufficient",
        "water_tight",
        "water_insufficient",
    ]
    terrain: TerrainOut | None = None
    advice: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    is_simulated: bool = False
