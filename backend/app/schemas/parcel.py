from __future__ import annotations

from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class GeometryIn(BaseModel):
    type: Literal["Point", "Polygon"]
    coordinates: list[Any]


class PreferencesIn(BaseModel):
    weights: dict[str, float] = Field(
        default_factory=lambda: {"water": 0.4, "soil": 0.3, "margin": 0.3}
    )
    constraints: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="after")
    def validate_weights(self) -> "PreferencesIn":
        if any(value < 0 for value in self.weights.values()):
            raise ValueError("Los pesos no pueden ser negativos")
        if sum(self.weights.values()) <= 0:
            raise ValueError("La suma de pesos debe ser mayor que cero")
        return self


class ParcelCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    geometry: GeometryIn
    area_ha: float | None = Field(default=None, gt=0)
    district: str | None = Field(default=None, max_length=120)
    preferences: PreferencesIn = Field(default_factory=PreferencesIn)
    is_simulated: bool = True


class ParcelUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    geometry: GeometryIn | None = None
    area_ha: float | None = Field(default=None, gt=0)
    district: str | None = Field(default=None, max_length=120)
    preferences: PreferencesIn | None = None


class CompletenessOut(BaseModel):
    comparison: Literal["ready", "partial", "blocked"]
    water: Literal["ready", "unknown"]
    margin: Literal["ready", "partial", "blocked"]
    missing: list[str]


class ParcelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    geometry: dict[str, Any]
    area_ha: float | None = None
    district: str | None = None
    timezone: str = "America/Lima"
    preferences: dict[str, Any] = Field(default_factory=dict)
    is_simulated: bool = True


class CropHistoryIn(BaseModel):
    crop_id: str | None = None
    family: str | None = None
    date_start: date | None = None
    date_end: date | None = None
    notes: str | None = None
    source: str = "farmer"


class CropHistoryOut(CropHistoryIn):
    model_config = ConfigDict(from_attributes=True)

    id: str


class WaterIn(BaseModel):
    start_at: date
    end_at: date
    volume_m3: float | None = Field(default=None, ge=0)
    mm: float | None = Field(default=None, ge=0)
    method: Literal["meter", "turn", "estimate", "unknown"] = "unknown"
    efficiency: float | None = Field(default=None, gt=0, le=1)
    confidence: Literal["high", "medium", "low", "unknown"] = "unknown"
    notes: str | None = None

    @model_validator(mode="after")
    def validate_dates(self) -> "WaterIn":
        if self.end_at < self.start_at:
            raise ValueError("end_at debe ser >= start_at")
        if self.volume_m3 is None and self.mm is None and self.method != "unknown":
            raise ValueError("Se requiere volume_m3 o mm")
        return self


class WaterOut(WaterIn):
    model_config = ConfigDict(from_attributes=True)

    id: str


class SoilIn(BaseModel):
    variable: Literal["texture", "ph", "organic_matter", "n", "p", "k", "erosion", "other"]
    value: float | None = None
    unit: str | None = None
    observed_at: date | None = None
    method: Literal["lab", "reported", "unknown"] = "unknown"
    source: str | None = None
    notes: str | None = None


class SoilOut(SoilIn):
    model_config = ConfigDict(from_attributes=True)

    id: str


class ContextOut(BaseModel):
    parcel: ParcelOut
    history: list[CropHistoryOut]
    water: list[WaterOut]
    soil: list[SoilOut]
    missing_inputs: list[str]
    completeness: CompletenessOut
    quality_flags: list[str] = Field(default_factory=list)
