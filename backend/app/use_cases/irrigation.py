from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import Parcel, WaterAvailability
from app.use_cases.context import parcel_geometry
from app.use_cases.terrain import ensure_terrain
from app.use_cases.weather import fetch_forecast
from services.water_engine import available_mm

EFFECTIVE_RAIN_FACTOR = 0.8


def _center(geometry: dict[str, Any]) -> tuple[float, float]:
    coords = geometry.get("coordinates") or []
    if geometry.get("type") == "Point" and len(coords) >= 2:
        return float(coords[1]), float(coords[0])
    if geometry.get("type") == "Polygon" and coords:
        ring = coords[0]
        points = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
        if points:
            return (
                sum(float(point[1]) for point in points) / len(points),
                sum(float(point[0]) for point in points) / len(points),
            )
    raise ValueError("La parcela no tiene coordenadas válidas")


def _latest_water(db: Session, parcel_id: str) -> WaterAvailability | None:
    return db.scalars(
        select(WaterAvailability)
        .where(WaterAvailability.parcel_id == parcel_id)
        .order_by(WaterAvailability.start_at.desc())
        .limit(1)
    ).first()


def build_irrigation(
    db: Session,
    parcel: Parcel,
    *,
    days: int = 7,
) -> dict[str, Any]:
    lat, lon = _center(parcel_geometry(db, parcel))
    forecast = fetch_forecast(lat, lon, days=days)
    terrain = ensure_terrain(db, parcel)

    water = _latest_water(db, parcel.id)
    available = (
        available_mm(
            float(parcel.area_ha) if parcel.area_ha is not None else None,
            float(water.volume_m3) if water is not None and water.volume_m3 is not None else None,
            float(water.mm) if water is not None and water.mm is not None else None,
        )
        if water is not None
        else None
    )

    rows: list[dict[str, Any]] = []
    for day in forecast["days"]:
        rain = day.get("precip_mm")
        et0 = day.get("et0_mm")
        effective_rain = round(rain * EFFECTIVE_RAIN_FACTOR, 1) if rain is not None else None
        net = (
            round(max(0.0, et0 - effective_rain), 1)
            if et0 is not None and effective_rain is not None
            else None
        )
        rows.append(
            {
                **day,
                "effective_rain_mm": effective_rain,
                "net_demand_mm": net,
            }
        )

    rain_total = round(sum(day["precip_mm"] for day in rows if day["precip_mm"] is not None), 1)
    effective_rain_total = round(
        sum(day["effective_rain_mm"] for day in rows if day["effective_rain_mm"] is not None),
        1,
    )
    et0_total = round(sum(day["et0_mm"] for day in rows if day["et0_mm"] is not None), 1)
    demand_values = [day["net_demand_mm"] for day in rows if day["net_demand_mm"] is not None]
    demand_total = round(sum(demand_values), 1) if demand_values else None
    missing_et0 = any(day["et0_mm"] is None for day in rows)
    missing_rain = any(day["precip_mm"] is None for day in rows)

    if demand_total is None:
        water_status = "unknown"
    elif demand_total <= 0:
        water_status = "rain_covers"
    elif available is None:
        water_status = "water_unknown"
    elif available >= demand_total:
        water_status = "water_sufficient"
    elif available >= demand_total * 0.5:
        water_status = "water_tight"
    else:
        water_status = "water_insufficient"

    advice: list[str] = []
    if demand_total is not None and demand_total > 0:
        advice.append("irrigation_needed")
    elif demand_total == 0:
        advice.append("rain_covers")
    if available is None:
        advice.append("water_unknown")
    if terrain is None:
        advice.append("terrain_unavailable")
    if missing_et0 or missing_rain:
        advice.append("forecast_incomplete")

    warnings = [
        "forecast_and_reference_et0",
        "effective_rain_assumption",
        "not_agronomic_prescription",
    ]
    if terrain is None:
        warnings.append("terrain_unavailable")
    if parcel.is_simulated:
        warnings.append("simulated_parcel")

    water_payload = None
    if water is not None:
        water_payload = {
            "available_mm": available,
            "period_start": water.start_at.isoformat(),
            "period_end": water.end_at.isoformat(),
            "method": water.method,
            "efficiency": float(water.efficiency) if water.efficiency is not None else None,
            "confidence": water.confidence,
        }

    return {
        "parcel_id": parcel.id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "forecast_source": {
            key: forecast[key]
            for key in ("provider", "dataset", "url", "license", "timezone", "retrieved_at")
        },
        "forecast": rows,
        "totals": {
            "days": len(rows),
            "precip_mm": rain_total,
            "effective_rain_mm": effective_rain_total,
            "et0_mm": et0_total,
            "net_demand_mm": demand_total,
        },
        "water": water_payload,
        "water_status": water_status,
        "terrain": terrain,
        "advice": advice,
        "warnings": warnings,
        "is_simulated": bool(parcel.is_simulated),
    }
