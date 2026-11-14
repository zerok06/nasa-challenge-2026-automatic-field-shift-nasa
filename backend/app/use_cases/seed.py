from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import (
    Crop,
    DataSource,
    DatasetSnapshot,
    Parcel,
    ParcelCropHistory,
    User,
    WaterAvailability,
)

CROPS = [
    {
        "id": "onion",
        "local_name": "Cebolla",
        "scientific_name": "Allium cepa",
        "family": "Amaryllidaceae",
        "duration_days": 120,
        "windows_json": {"sowing": [{"start": "2027-01-01", "end": "2027-12-31"}]},
        "kc_json": {
            "stages": [
                {"name": "initial", "days": 20, "kc": 0.7},
                {"name": "development", "days": 30, "kc": 0.85},
                {"name": "mid", "days": 50, "kc": 1.05},
                {"name": "late", "days": 20, "kc": 0.9},
            ]
        },
        "risks_json": {"frost": True, "water": "medium"},
        "source_refs": {"fao56": "FAO-56", "local": "review_pending"},
        "review_status": "needs_review",
    },
    {
        "id": "pumpkin",
        "local_name": "Zapallo",
        "scientific_name": "Cucurbita maxima",
        "family": "Cucurbitaceae",
        "duration_days": 100,
        "windows_json": {"sowing": [{"start": "2027-01-01", "end": "2027-12-31"}]},
        "kc_json": {
            "stages": [
                {"name": "initial", "days": 15, "kc": 0.5},
                {"name": "development", "days": 25, "kc": 0.8},
                {"name": "mid", "days": 40, "kc": 1.0},
                {"name": "late", "days": 20, "kc": 0.8},
            ]
        },
        "risks_json": {"frost": False, "water": "medium"},
        "source_refs": {"fao56": "FAO-56", "local": "review_pending"},
        "review_status": "needs_review",
    },
    {
        "id": "chili",
        "local_name": "Ají",
        "scientific_name": "Capsicum spp.",
        "family": "Solanaceae",
        "duration_days": 140,
        "windows_json": {"sowing": [{"start": "2027-01-01", "end": "2027-12-31"}]},
        "kc_json": {
            "stages": [
                {"name": "initial", "days": 25, "kc": 0.6},
                {"name": "development", "days": 35, "kc": 0.8},
                {"name": "mid", "days": 55, "kc": 1.0},
                {"name": "late", "days": 25, "kc": 0.85},
            ]
        },
        "risks_json": {"frost": True, "water": "high"},
        "source_refs": {"fao56": "FAO-56", "local": "review_pending"},
        "review_status": "needs_review",
    },
]


def _demo_snapshot() -> dict:
    path = settings.datasets_dir / "demo" / "power_moquegua_2024.json"
    if not path.exists():
        fallback = Path(__file__).resolve().parents[3] / "datasets" / "demo" / "power_moquegua_2024.json"
        if fallback.exists():
            path = fallback
    if path.exists():
        with path.open("r", encoding="utf-8") as fh:
            return json.load(fh)
    # Minimal fallback; the demo script should create the full file.
    return {
        "snapshot_id": "power_moquegua_2024_demo",
        "records": [
            {"date": f"2024-{month:02d}-15", "eto_mm": 4.0, "precip_mm": 1.0,
             "tmin_c": 6.0, "tmax_c": 18.0}
            for month in range(1, 13)
        ],
        "is_simulated": True,
    }


def seed_reference_data(db: Session) -> None:
    for item in CROPS:
        existing = db.get(Crop, item["id"])
        if existing is None:
            db.add(Crop(catalog_version="v0.1", **item))
        else:
            for key, value in item.items():
                setattr(existing, key, value)

    source = db.get(DataSource, "nasa_power")
    if source is None:
        source = DataSource(
            id="nasa_power",
            provider="NASA",
            dataset="POWER Daily (MERRA-2)",
            product_version="v2.10.3",
            spatial_resolution="native grid / point API",
            temporal_resolution="daily",
            license="NASA open data",
            url="https://power.larc.nasa.gov/",
        )
        db.add(source)

    snapshot = _demo_snapshot()
    snapshot_id = snapshot.get("snapshot_id", "power_moquegua_2024_demo")
    existing_snapshot = db.get(DatasetSnapshot, snapshot_id)
    if existing_snapshot is None:
        db.add(
            DatasetSnapshot(
                id=snapshot_id,
                source_id="nasa_power",
                bbox={"type": "Point", "coordinates": [-70.93, -17.19]},
                period_start=date(2024, 1, 1),
                period_end=date(2024, 12, 31),
                retrieved_at=datetime.now(timezone.utc),
                object_path="datasets/demo/power_moquegua_2024.json",
                checksum="demo",
                missing_pct=0.0,
                method=snapshot.get("method", "synthetic"),
                metadata_json=snapshot,
                is_simulated=bool(snapshot.get("is_simulated", True)),
            )
        )
    else:
        existing_snapshot.metadata_json = snapshot

    db.commit()


def seed_demo_parcel(db: Session, user: User) -> Parcel:
    existing = db.scalar(
        select(Parcel).where(Parcel.owner_user_id == user.id, Parcel.name == "Parcela demo")
    )
    if existing is not None:
        water = db.scalar(
            select(WaterAvailability)
            .where(WaterAvailability.parcel_id == existing.id)
            .order_by(WaterAvailability.start_at.desc())
            .limit(1)
        )
        if water is not None and float(water.volume_m3 or 0) < 10000:
            water.volume_m3 = 13200
            db.commit()
        return existing

    point = {"type": "Point", "coordinates": [-70.93, -17.19]}
    parcel = Parcel(
        owner_user_id=user.id,
        name="Parcela demo",
        geom=func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(point)), 4326),
        area_ha=1.2,
        district="Moquegua",
        timezone="America/Lima",
        preferences_json={
            "weights": {"water": 0.5, "soil": 0.3, "margin": 0.2},
            "economics": {
                "onion": {"yield_kg_ha": 12000, "price_pen_kg": 1.2, "costs_pen": 9000},
                "pumpkin": {"yield_kg_ha": 15000, "price_pen_kg": 0.9, "costs_pen": 8000},
                "chili": {"yield_kg_ha": 8000, "price_pen_kg": 2.5, "costs_pen": 9500},
            },
            "price_assumption_type": "historical",
        },
        is_simulated=True,
    )
    db.add(parcel)
    db.flush()

    db.add_all(
        [
            ParcelCropHistory(
                parcel_id=parcel.id,
                crop_id="onion",
                family="Amaryllidaceae",
                date_start=date(2025, 9, 1),
                date_end=date(2026, 1, 15),
                source="demo",
            ),
            ParcelCropHistory(
                parcel_id=parcel.id,
                crop_id="pumpkin",
                family="Cucurbitaceae",
                date_start=date(2026, 2, 1),
                date_end=date(2026, 6, 1),
                source="demo",
            ),
            WaterAvailability(
                parcel_id=parcel.id,
                start_at=date(2026, 8, 1),
                end_at=date(2026, 12, 31),
                volume_m3=13200,
                method="estimate",
                efficiency=0.7,
                confidence="medium",
                notes="Dato sintético de demostración.",
            ),
        ]
    )
    db.commit()
    db.refresh(parcel)
    return parcel
