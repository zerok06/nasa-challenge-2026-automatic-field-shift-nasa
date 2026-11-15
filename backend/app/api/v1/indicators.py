from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_parcel_or_404
from app.db.session import get_db
from app.models.entities import DataSource, DatasetSnapshot, User
from app.schemas.analysis import SourceOut
from app.use_cases.climate import ensure_power_snapshot
from app.use_cases.snapshots import snapshot_for_parcel
from services.indicators import monthly_indicators

router = APIRouter(tags=["indicators"])

GIBS_IMERG = (
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/"
    "IMERG_Precipitation_Rate/default/{date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png"
)
GIBS_NDVI = (
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/"
    "VIIRS_SNPP_L3_NDVI_Monthly/default/{date}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png"
)


@router.get("/parcels/{parcel_id}/indicators")
def indicators(
    parcel_id: str,
    start: str | None = Query(default=None, description="YYYY-MM"),
    end: str | None = Query(default=None, description="YYYY-MM"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    parcel = get_parcel_or_404(db, user, parcel_id)
    snapshot = ensure_power_snapshot(db, parcel)
    if snapshot is None:
        return {
            "parcel_id": parcel_id,
            "indicators": [],
            "warnings": ["snapshot_missing"],
            "missing_inputs": ["dataset_snapshot"],
        }
    months = monthly_indicators(snapshot.metadata_json)
    if start:
        months = [m for m in months if m["month"] >= start]
    if end:
        months = [m for m in months if m["month"] <= end]
    return {
        "parcel_id": parcel_id,
        "period": {"start": snapshot.period_start, "end": snapshot.period_end},
        "source": {
            "snapshot_id": snapshot.id,
            "source": "NASA POWER",
            "resolution": "native grid / point API",
            "quality_flag": "modeled_reanalysis",
            "is_simulated": snapshot.is_simulated,
            "retrieved_at": snapshot.retrieved_at,
        },
        "indicators": months,
        "warnings": [] if months else ["no_data_for_period"],
        "missing_inputs": [],
    }


@router.get("/parcels/{parcel_id}/layers")
def layers(
    parcel_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    get_parcel_or_404(db, user, parcel_id)
    return {
        "parcel_id": parcel_id,
        "layers": [
            {
                "id": "IMERG_Precipitation_Rate",
                "label": "Precipitación IMERG",
                "url_template": GIBS_IMERG,
                "max_z": 6,
                "min_z": 3,
                "unit": "mm/hr",
                "resolution": "0.1 degree (~11 km)",
                "source": "NASA GIBS / GPM IMERG",
                "quality_flag": "satellite_estimate",
                "default_date": "2024-06-01",
            },
            {
                "id": "VIIRS_SNPP_L3_NDVI_Monthly",
                "label": "NDVI VIIRS mensual",
                "url_template": GIBS_NDVI,
                "max_z": 7,
                "min_z": 3,
                "unit": "NDVI",
                "resolution": "~0.5-1 km",
                "source": "NASA GIBS / VIIRS Suomi NPP",
                "quality_flag": "satellite_estimate",
                "default_date": "2024-06-01",
            },
        ],
    }


@router.get("/parcels/{parcel_id}/layers/{layer_id}/stats")
def layer_stats(
    parcel_id: str,
    layer_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    parcel = get_parcel_or_404(db, user, parcel_id)
    snapshot = ensure_power_snapshot(db, parcel)
    months = monthly_indicators(snapshot.metadata_json) if snapshot else []
    key = "precip_mm" if layer_id == "IMERG_Precipitation_Rate" else "eto_mm"
    values = [m[key] for m in months if m.get(key) is not None]
    return {
        "layer_id": layer_id,
        "parcel_id": parcel_id,
        "values": months,
        "summary": {
            "count": len(values),
            "mean": round(sum(values) / len(values), 2) if values else None,
            "unit": "mm" if key == "precip_mm" else "mm",
        },
        "quality_flag": "satellite_estimate" if layer_id.startswith("IMERG") else "estimated",
    }


@router.get("/sources/{snapshot_id}", response_model=SourceOut)
def source(
    snapshot_id: str,
    db: Session = Depends(get_db),
) -> SourceOut:
    snapshot = db.get(DatasetSnapshot, snapshot_id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Snapshot no encontrado"})
    source = db.get(DataSource, snapshot.source_id)
    return SourceOut(
        snapshot_id=snapshot.id,
        provider=source.provider if source else "NASA",
        dataset=source.dataset if source else "NASA POWER",
        product_version=source.product_version if source else None,
        resolution=source.spatial_resolution if source else None,
        period={"start": snapshot.period_start, "end": snapshot.period_end},
        retrieved_at=snapshot.retrieved_at,
        method=snapshot.method,
        license=source.license if source else None,
        url=source.url if source else None,
        is_simulated=snapshot.is_simulated,
    )
