from __future__ import annotations

import json
from datetime import date
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import Parcel, ParcelCropHistory, SoilObservation, WaterAvailability
from app.schemas.parcel import (
    CompletenessOut,
    ContextOut,
    CropHistoryOut,
    ParcelOut,
    SoilOut,
    WaterOut,
)
from services.water_engine import available_mm


def parcel_geometry(db: Session, parcel: Parcel) -> dict[str, Any]:
    raw = db.scalar(select(func.ST_AsGeoJSON(Parcel.geom)).where(Parcel.id == parcel.id))
    if not raw:
        return {"type": "Point", "coordinates": []}
    return json.loads(raw)


def parcel_to_out(db: Session, parcel: Parcel) -> ParcelOut:
    return ParcelOut(
        id=parcel.id,
        name=parcel.name,
        geometry=parcel_geometry(db, parcel),
        area_ha=float(parcel.area_ha) if parcel.area_ha is not None else None,
        district=parcel.district,
        timezone=parcel.timezone,
        preferences=parcel.preferences_json or {},
        is_simulated=parcel.is_simulated,
    )


def _latest_water(db: Session, parcel_id: str) -> WaterAvailability | None:
    return db.scalars(
        select(WaterAvailability)
        .where(WaterAvailability.parcel_id == parcel_id)
        .order_by(WaterAvailability.start_at.desc())
        .limit(1)
    ).first()


def _completeness(
    parcel: Parcel, history: list[ParcelCropHistory], water: WaterAvailability | None, soil: list[SoilObservation]
) -> CompletenessOut:
    missing: list[str] = []
    if parcel.area_ha is None:
        missing.append("area_ha")
    if not history:
        missing.append("crop_history")
    available = None
    if water is not None:
        available = available_mm(
            float(parcel.area_ha) if parcel.area_ha is not None else None,
            float(water.volume_m3) if water.volume_m3 is not None else None,
            float(water.mm) if water.mm is not None else None,
        )
    if available is None:
        missing.append("water_available")
    has_lab = any(o.method == "lab" for o in soil)
    if not has_lab:
        missing.append("soil_analysis")

    comparison = "blocked"
    if parcel.area_ha is not None and history:
        comparison = "ready" if available is not None else "partial"

    econ = (parcel.preferences_json or {}).get("economics") or {}
    margin = "blocked"
    if econ:
        margin = "ready" if all(
            all(k in crop for k in ("yield_kg_ha", "price_pen_kg", "costs_pen"))
            for crop in econ.values()
        ) else "partial"

    return CompletenessOut(
        comparison=comparison,
        water="ready" if available is not None else "unknown",
        margin=margin,
        missing=missing,
    )


def get_context(db: Session, parcel: Parcel) -> ContextOut:
    history = list(
        db.scalars(
            select(ParcelCropHistory)
            .where(ParcelCropHistory.parcel_id == parcel.id)
            .order_by(ParcelCropHistory.date_start.asc())
        ).all()
    )
    water = list(
        db.scalars(
            select(WaterAvailability)
            .where(WaterAvailability.parcel_id == parcel.id)
            .order_by(WaterAvailability.start_at.asc())
        ).all()
    )
    soil = list(
        db.scalars(
            select(SoilObservation)
            .where(SoilObservation.parcel_id == parcel.id)
            .order_by(SoilObservation.observed_at.asc())
        ).all()
    )
    completeness = _completeness(parcel, history, _latest_water(db, parcel.id), soil)
    flags: list[str] = []
    if parcel.is_simulated:
        flags.append("simulated")
    if completeness.water == "unknown":
        flags.append("water_unknown")
    if completeness.margin != "ready":
        flags.append("margin_partial")
    return ContextOut(
        parcel=parcel_to_out(db, parcel),
        history=[CropHistoryOut.model_validate(h) for h in history],
        water=[WaterOut.model_validate(w) for w in water],
        soil=[SoilOut.model_validate(s) for s in soil],
        missing_inputs=completeness.missing,
        completeness=completeness,
        quality_flags=flags,
    )
