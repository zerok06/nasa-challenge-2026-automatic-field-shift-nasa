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


# Mapping from catalog Spanish IDs to English DB IDs (backward compatible).
# New code should use catalog_id; this mapping preserves existing data.
CATALOG_ID_MAP: dict[str, str] = {
    "cebolla": "onion",
    "zapallo": "pumpkin",
    "aji": "chili",
    "papa": "potato",
    "maiz_amilaceo": "corn",
    "maiz_choclo": "corn",
    "haba_seca": "haba",
    "haba": "haba",
    "tomate": "tomato",
    "alfalfa": "alfalfa",
    "palto": "palto",
    "tuna": "tuna",
    "vid": "vid",
    "oregano": "oregano",
    "limon": "limon",
    "ajo": "ajo",
    "sandia": "sandia",
    "zanahoria": "carrot",
    "lechuga": "lettuce",
    "beterraga": "beetroot",
    "camote": "sweet_potato",
    "coliflor": "cauliflower",
    "arveja_verde": "green_pea",
    "pepinillo": "pickle_cucumber",
    "caigua": "caigua",
    "vainita": "vainita",
}


def _catalog_path() -> Path:
    path = settings.datasets_dir.parent / "catalogo_moquegua_v0_2_5.json"
    if not path.exists():
        path = Path(__file__).resolve().parents[3] / "catalogo_moquegua_v0_2_5.json"
    return path


def _load_catalog_crops() -> list[dict[str, Any]]:
    path = _catalog_path()
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
        return data.get("cultivos", [])
    except (OSError, json.JSONDecodeError):
        return []


def _crop_type_from_tipo(tipo: str | None) -> str | None:
    if not tipo:
        return None
    mapping = {
        "Transitorio": "annual",
        "Perenne aromático": "perennial_aromatic",
        "Perenne forrajero": "perennial_forage",
        "Perenne frutal": "perennial_fruit",
    }
    return mapping.get(tipo)


def _build_kc_from_catalog(cultivo: dict[str, Any]) -> dict[str, Any]:
    """Build kc_json from catalog referencias_agronomicas."""
    refs = cultivo.get("referencias_agronomicas", {})
    kc = refs.get("kc", {})
    if not kc:
        return {"stages": [{"name": "mid", "days": 90, "kc": 1.0}]}
    context = kc.get("contexto", "")
    # Catalog cells can be explicitly null; `.get(key, default)` does not apply
    # the default when the key is present with a null value.
    mid = kc.get("etapa_media")
    mid = float(mid) if mid is not None else 1.0
    fin = kc.get("fin_ciclo")
    fin = float(fin) if fin is not None else mid * 0.8
    # Estimate stage breakdown from params if available.
    params = refs.get("parametros_estructurados", {}) or {}
    dur = params.get("duracion", {}) or {}
    total_days = dur.get("max") or dur.get("min") or 90
    initial_days = max(10, int(total_days * 0.15))
    dev_days = max(15, int(total_days * 0.25))
    mid_days = max(20, int(total_days * 0.40))
    late_days = max(10, total_days - initial_days - dev_days - mid_days)
    return {
        "stages": [
            {"name": "initial", "days": initial_days, "kc": round(mid * 0.6, 2)},
            {"name": "development", "days": dev_days, "kc": round(mid * 0.85, 2)},
            {"name": "mid", "days": mid_days, "kc": round(mid, 2)},
            {"name": "late", "days": late_days, "kc": round(fin, 2)},
        ],
        "source": "catalog_v025",
        "contexto": context,
    }


def _build_risks(cultivo: dict[str, Any]) -> dict[str, Any]:
    """Build risks_json from catalog data."""
    refs = cultivo.get("referencias_agronomicas", {}) or {}
    evidencia = refs.get("evidencia_local", []) or []
    frost = any(
        e.get("parametro") == "afectacion_por_heladas"
        for e in evidencia
    )
    nitrogen_fixing = cultivo.get("familia") == "Fabaceae"
    forage = cultivo.get("familia") == "Fabaceae" and cultivo.get("id") in ("alfalfa",)
    return {
        "frost": frost,
        "water": "medium",
        "nitrogen_fixing": nitrogen_fixing,
        "forage": forage,
        "source": "catalog_v025",
        "local_evidence": [
            {
                "fuente_id": e.get("fuente_id"),
                "parametro": e.get("parametro"),
                "reporte": e.get("reporte"),
            }
            for e in evidencia[:3]
        ],
    }


def _duration_days(value: Any, unit: str | None) -> int | None:
    """Normalize a catalog duration to days.

    The catalog mixes `dias`, `meses` and (rarely) `semanas`; treating every
    number as days made maize look like an 8-day crop.
    """
    if value is None:
        return None
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None
    normalized = (unit or "dias").strip().lower()
    if normalized.startswith("mes"):
        amount *= 30.44
    elif normalized.startswith("sem"):
        amount *= 7
    elif normalized.startswith("año") or normalized.startswith("ano"):
        amount *= 365
    return int(round(amount))


def _catalog_crop_rows() -> list[tuple[str, str, dict[str, Any]]]:
    """Return (db_id, catalog_id, cultivo) with one row per app crop id.

    Two catalog entries can collapse into one app crop (maíz amiláceo and maíz
    choclo share `corn`). Keeping the first avoids inserting the same primary
    key twice during the seed.
    """
    rows: list[tuple[str, str, dict[str, Any]]] = []
    seen_db_ids: set[str] = set()
    for cultivo in _load_catalog_crops():
        catalog_id = cultivo.get("id")
        if not catalog_id:
            continue
        db_id = CATALOG_ID_MAP.get(catalog_id, catalog_id)
        if db_id in seen_db_ids:
            continue
        seen_db_ids.add(db_id)
        rows.append((db_id, catalog_id, cultivo))
    return rows


def seed_reference_data(db: Session) -> None:
    for db_id, catalog_id, cultivo in _catalog_crop_rows():
        refs = cultivo.get("referencias_agronomicas", {}) or {}
        params = refs.get("parametros_estructurados", {}) or {}
        dur = params.get("duracion", {}) or {}
        duration_min = _duration_days(dur.get("min"), dur.get("unidad"))
        duration_max = _duration_days(dur.get("max"), dur.get("unidad"))
        # Prefer max; fall back to min; fall back to default 90.
        duration_days = duration_max or duration_min or 90
        # Clamp to reasonable bounds.
        duration_days = max(30, min(365, duration_days))

        crop_data = {
            "id": db_id,
            "local_name": cultivo.get("nombre", db_id),
            "scientific_name": cultivo.get("especie"),
            "family": cultivo.get("familia", ""),
            "catalog_version": "v0.2.5",
            "catalog_id": catalog_id,
            "crop_type": _crop_type_from_tipo(cultivo.get("tipo")),
            "duration_days": duration_days,
            "duration_min_days": duration_min,
            "duration_max_days": duration_max,
            "windows_json": cultivo.get("territorio_piloto", {}) or {},
            "kc_json": _build_kc_from_catalog(cultivo),
            "risks_json": _build_risks(cultivo),
            "source_refs": {
                "catalog": "catalogo_moquegua_v0_2_5.json",
                "version": "0.2.5",
                "compiled": "2026-11-14",
                "local_review": "pending",
            },
            "review_status": "needs_review",
        }
        existing = db.get(Crop, db_id)
        if existing is None:
            db.add(Crop(**crop_data))
        else:
            for key, value in crop_data.items():
                if key != "id":
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

    _ensure_demo_snapshot(db)
    db.commit()


def _ensure_demo_snapshot(db: Session) -> None:
    path = settings.datasets_dir / "demo" / "power_moquegua_2024.json"
    if not path.exists():
        fallback = Path(__file__).resolve().parents[3] / "datasets" / "demo" / "power_moquegua_2024.json"
        if fallback.exists():
            path = fallback
    snapshot_data: dict[str, Any] = {}
    if path.exists():
        try:
            snapshot_data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            pass
    if not snapshot_data.get("records"):
        snapshot_data = {
            "snapshot_id": "power_moquegua_2024_demo",
            "records": [
                {"date": f"2024-{month:02d}-15", "eto_mm": 4.0, "precip_mm": 1.0,
                 "tmin_c": 6.0, "tmax_c": 18.0}
                for month in range(1, 13)
            ],
            "is_simulated": True,
        }
    snapshot_id = snapshot_data.get("snapshot_id", "power_moquegua_2024_demo")
    existing = db.get(DatasetSnapshot, snapshot_id)
    if existing is None:
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
                method=snapshot_data.get("method", "synthetic"),
                metadata_json=snapshot_data,
                is_simulated=bool(snapshot_data.get("is_simulated", True)),
            )
        )
    else:
        existing.metadata_json = snapshot_data


def _tag_demo_snapshot(db: Session, parcel: Parcel) -> None:
    snapshot = db.get(DatasetSnapshot, "power_moquegua_2024_demo")
    if snapshot is not None:
        snapshot.metadata_json = {**snapshot.metadata_json, "parcel_id": parcel.id}
        db.commit()


def _demo_economics() -> dict[str, dict[str, Any]]:
    """Synthetic prices for the demo plot, already confirmed by the farmer.

    The demo must exercise the full path (margin computed, plans comparable),
    so its prices are explicitly confirmed; they remain editable.
    """
    return {
        "onion": {
            "yield_kg_ha": 12000,
            "price_pen_kg": 1.2,
            "costs_pen": 9000,
            "price_source": "catalog_reference",
            "price_confirmed": True,
            "marketable_share": 1.0,
        },
        "pumpkin": {
            "yield_kg_ha": 15000,
            "price_pen_kg": 0.9,
            "costs_pen": 8000,
            "price_source": "catalog_reference",
            "price_confirmed": True,
            "marketable_share": 1.0,
        },
        "chili": {
            "yield_kg_ha": 8000,
            "price_pen_kg": 2.5,
            "costs_pen": 9500,
            "price_source": "catalog_reference",
            "price_confirmed": True,
            "marketable_share": 1.0,
        },
    }


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
        # Keep the demo usable after this fix: refresh its economics so the
        # confirmed prices reach the deterministic engine.
        preferences = dict(existing.preferences_json or {})
        preferences["economics"] = _demo_economics()
        preferences.setdefault("price_assumption_type", "historical")
        existing.preferences_json = preferences
        db.commit()
        _tag_demo_snapshot(db, existing)
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
            "economics": _demo_economics(),
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
    _tag_demo_snapshot(db, parcel)
    return parcel
