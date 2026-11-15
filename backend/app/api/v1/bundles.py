from __future__ import annotations

import hashlib
import json
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_parcel_or_404
from app.db.session import get_db
from app.models.entities import Crop, Parcel, User
from app.use_cases.climate import store_power_snapshot
from app.use_cases.comparison import CATALOG_VERSION, MODEL_VERSION, create_comparison
from app.use_cases.context import parcel_geometry, parcel_to_out
from app.use_cases.snapshots import snapshot_for_parcel
from services.indicators import monthly_indicators
from services.power import fetch_power_daily

router = APIRouter(tags=["bundle"])

BUNDLE_DAYS = 30
BUNDLE_ENGINE_VERSION = MODEL_VERSION


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
    raise HTTPException(
        status_code=422,
        detail={"code": "invalid_geometry", "message": "La parcela no tiene coordenadas válidas"},
    )


def _catalog(db: Session) -> dict[str, Any]:
    crops = db.scalars(select(Crop).order_by(Crop.local_name)).all()
    return {
        "version": CATALOG_VERSION,
        "review_status": "needs_review",
        "crops": [
            {
                "id": crop.id,
                "local_name": crop.local_name,
                "scientific_name": crop.scientific_name,
                "family": crop.family,
                "duration_days": crop.duration_days,
                "windows": crop.windows_json,
                "kc": crop.kc_json,
                "risks": crop.risks_json,
                "source_refs": crop.source_refs,
                "review_status": crop.review_status,
            }
            for crop in crops
        ],
    }


def create_bundle(
    db: Session,
    user: User,
    parcel: Parcel,
    *,
    live_power: bool = True,
) -> dict[str, Any]:
    lat, lon = _center(parcel_geometry(db, parcel))
    warnings: list[str] = []
    climate: list[dict[str, Any]] = []
    climate_source: dict[str, Any] | None = None
    dataset: dict[str, Any] | None = None

    if live_power:
        try:
            dataset = fetch_power_daily(lat, lon, date(2025, 1, 1), date(2025, 12, 31))
            store_power_snapshot(db, parcel, dataset)
            climate = monthly_indicators(dataset)
            climate_source = {
                **dataset["source"],
                "is_simulated": False,
                "retrieved_at": datetime.now(timezone.utc).isoformat(),
                "record_count": len(dataset["records"]),
                "missing_days": dataset["missing_days"],
            }
        except Exception:
            warnings.append("power_unavailable")
    else:
        snapshot = snapshot_for_parcel(db, parcel)
        if snapshot is not None:
            climate = monthly_indicators(snapshot.metadata_json)
            climate_source = {
                "snapshot_id": snapshot.id,
                "is_simulated": snapshot.is_simulated,
                "retrieved_at": snapshot.retrieved_at.isoformat(),
            }
        else:
            warnings.append("climate_snapshot_missing")

    start = date(date.today().year + 1, 1, 1)
    end = date(date.today().year + 1, 12, 31)
    try:
        comparison = create_comparison(db, user, parcel, start, end)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "code": "comparison_failed",
                "message": "No se pudo construir el paquete de la parcela",
            },
        ) from exc

    warnings.extend(comparison.warnings)
    if any(crop.review_status == "needs_review" for crop in db.scalars(select(Crop)).all()):
        warnings.append("catalog_needs_review")
    warnings = sorted(set(warnings))
    created = datetime.now(timezone.utc)
    bundle = {
        "bundle_id": f"{parcel.id[:8]}-{start.year}-{BUNDLE_ENGINE_VERSION}",
        "parcel_id": parcel.id,
        "created_at": created.isoformat(),
        "expires_at": (created + timedelta(days=BUNDLE_DAYS)).isoformat(),
        "engine_version": BUNDLE_ENGINE_VERSION,
        "catalog_version": CATALOG_VERSION,
        "parcel": parcel_to_out(db, parcel).model_dump(mode="json"),
        "climate": climate,
        "climate_source": climate_source,
        "catalog": _catalog(db),
        "comparison": comparison.model_dump(mode="json"),
        "assumptions": parcel.preferences_json or {},
        "warnings": warnings,
        "is_simulated": comparison.is_simulated,
        "integrity": {
            "algorithm": "sha256",
            "header": "X-Bundle-Checksum",
        },
    }
    return bundle


@router.post("/parcels/{parcel_id}/bundle")
def bundle(
    parcel_id: str,
    live: bool = Query(default=True, description="Fetch NASA POWER for the parcel"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    parcel = get_parcel_or_404(db, user, parcel_id)
    payload = create_bundle(db, user, parcel, live_power=live)
    body = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode("utf-8")
    checksum = hashlib.sha256(body).hexdigest()
    return Response(
        content=body,
        media_type="application/json",
        headers={
            "X-Bundle-Checksum": checksum,
            "X-Bundle-Size": str(len(body)),
        },
    )
