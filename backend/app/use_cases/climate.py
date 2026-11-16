from __future__ import annotations

import hashlib
import json
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.entities import DatasetSnapshot, Parcel
from app.use_cases.context import parcel_geometry
from app.use_cases.snapshots import snapshot_for_parcel
from services.power import fetch_power_daily


class ClimateDataUnavailable(RuntimeError):
    """No real NASA POWER data is available for this parcel."""


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
    raise ClimateDataUnavailable("La parcela no tiene coordenadas válidas")


def _is_real_power(snapshot: DatasetSnapshot | None) -> bool:
    if snapshot is None:
        return False
    metadata = snapshot.metadata_json or {}
    return bool(metadata.get("records")) and not snapshot.is_simulated


def store_power_snapshot(
    db: Session,
    parcel: Parcel,
    dataset: dict[str, Any],
) -> DatasetSnapshot:
    """Persist a real POWER dataset, one snapshot per parcel and year."""
    metadata = json.loads(json.dumps(dataset, default=str))
    metadata["parcel_id"] = parcel.id
    snapshot_id = f"{dataset['snapshot_id']}_{parcel.id[:8]}"
    existing = db.get(DatasetSnapshot, snapshot_id)
    values = {
        "source_id": "nasa_power",
        "bbox": parcel_geometry(db, parcel),
        "period_start": dataset["period_start"],
        "period_end": dataset["period_end"],
        "retrieved_at": datetime.now(timezone.utc),
        "object_path": "inline://nasa-power-daily",
        "checksum": hashlib.sha256(
            json.dumps(dataset["records"], sort_keys=True).encode("utf-8")
        ).hexdigest(),
        "missing_pct": round(
            100
            * dataset["missing_days"]
            / max(1, (dataset["period_end"] - dataset["period_start"]).days + 1),
            2,
        ),
        "method": dataset["method"],
        "metadata_json": metadata,
        "is_simulated": False,
    }
    if existing is None:
        snapshot = DatasetSnapshot(id=snapshot_id, **values)
        db.add(snapshot)
    else:
        snapshot = existing
        for key, value in values.items():
            setattr(snapshot, key, value)
    db.commit()
    db.refresh(snapshot)
    return snapshot


def _last_complete_year() -> int:
    today = date.today()
    # ASSUME: the previous calendar year is complete in POWER.
    return today.year - 1


def ensure_power_snapshot(
    db: Session,
    parcel: Parcel,
    *,
    force: bool = False,
) -> DatasetSnapshot | None:
    """Return a real per-parcel POWER snapshot, fetching it once if needed.

    The synthetic demo snapshot is intentionally kept for the demo parcel, but
    it is never treated as real data for a farmer-created parcel.
    """
    current = snapshot_for_parcel(db, parcel)
    if not force and _is_real_power(current):
        return current
    if parcel.is_simulated and current is not None:
        return current

    lat, lon = _center(parcel_geometry(db, parcel))
    for year in (_last_complete_year(), _last_complete_year() - 1):
        try:
            dataset = fetch_power_daily(
                lat,
                lon,
                date(year, 1, 1),
                date(year, 12, 31),
            )
        except Exception:
            continue
        if dataset.get("records"):
            return store_power_snapshot(db, parcel, dataset)
    return current if _is_real_power(current) else None


def latest_real_snapshot(db: Session, parcel: Parcel) -> DatasetSnapshot | None:
    snapshot = snapshot_for_parcel(db, parcel)
    return snapshot if _is_real_power(snapshot) else None
