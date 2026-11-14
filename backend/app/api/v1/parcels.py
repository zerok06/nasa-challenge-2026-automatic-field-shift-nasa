from __future__ import annotations

import json
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_parcel_or_404
from app.db.session import get_db
from app.models.entities import (
    Parcel,
    ParcelCropHistory,
    SoilObservation,
    User,
    WaterAvailability,
)
from app.schemas.parcel import (
    ContextOut,
    CropHistoryIn,
    CropHistoryOut,
    GeometryIn,
    ParcelCreate,
    ParcelOut,
    ParcelUpdate,
    SoilIn,
    SoilOut,
    WaterIn,
    WaterOut,
)
from app.use_cases.context import get_context, parcel_to_out

router = APIRouter(prefix="/parcels", tags=["parcels"])


def _check_point(point: list | tuple) -> None:
    if not isinstance(point, (list, tuple)) or len(point) < 2:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "Coordenada inválida"},
        )
    lon, lat = float(point[0]), float(point[1])
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "Latitud/longitud fuera de rango"},
        )


def _validate_geometry(geo: GeometryIn) -> None:
    if geo.type == "Point":
        _check_point(geo.coordinates)
        return
    rings = geo.coordinates
    if not isinstance(rings, list) or not rings:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "Polígono inválido"},
        )
    outer = rings[0]
    if not isinstance(outer, list) or len(outer) < 4:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "El polígono necesita al menos 4 puntos"},
        )
    for point in outer:
        _check_point(point)
    if list(outer[0]) != list(outer[-1]):
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "El polígono debe estar cerrado"},
        )


def _geom_expr(geo: GeometryIn):
    return func.ST_SetSRID(func.ST_GeomFromGeoJSON(json.dumps(geo.model_dump())), 4326)


def _area_ha(db: Session, parcel_id: str) -> float | None:
    value = db.scalar(select(func.ST_Area(Parcel.geom, True)).where(Parcel.id == parcel_id))
    if value is None:
        return None
    area = float(value) / 10000.0
    return round(area, 4) if area > 0 else None


@router.get("", response_model=list[ParcelOut])
def list_parcels(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ParcelOut]:
    rows = db.scalars(
        select(Parcel)
        .where(Parcel.owner_user_id == user.id, Parcel.deleted_at.is_(None))
        .order_by(Parcel.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()
    return [parcel_to_out(db, p) for p in rows]


@router.post("", response_model=ParcelOut, status_code=status.HTTP_201_CREATED)
def create_parcel(
    payload: ParcelCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ParcelOut:
    _validate_geometry(payload.geometry)
    parcel = Parcel(
        owner_user_id=user.id,
        name=payload.name,
        geom=_geom_expr(payload.geometry),
        area_ha=payload.area_ha,
        district=payload.district,
        preferences_json=payload.preferences.model_dump(),
        is_simulated=payload.is_simulated,
    )
    db.add(parcel)
    db.flush()
    if parcel.area_ha is None and payload.geometry.type == "Polygon":
        parcel.area_ha = _area_ha(db, parcel.id)
    db.commit()
    db.refresh(parcel)
    return parcel_to_out(db, parcel)


@router.get("/{parcel_id}", response_model=ParcelOut)
def get_parcel(
    parcel_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ParcelOut:
    parcel = get_parcel_or_404(db, user, parcel_id)
    return parcel_to_out(db, parcel)


@router.patch("/{parcel_id}", response_model=ParcelOut)
def update_parcel(
    parcel_id: str,
    payload: ParcelUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ParcelOut:
    parcel = get_parcel_or_404(db, user, parcel_id)
    fields = payload.model_fields_set
    if "name" in fields and payload.name is not None:
        parcel.name = payload.name
    if "district" in fields:
        parcel.district = payload.district
    if "preferences" in fields and payload.preferences is not None:
        parcel.preferences_json = payload.preferences.model_dump()
    if "geometry" in fields and payload.geometry is not None:
        _validate_geometry(payload.geometry)
        parcel.geom = _geom_expr(payload.geometry)
        db.flush()
        if payload.geometry.type == "Polygon" and "area_ha" not in fields:
            parcel.area_ha = _area_ha(db, parcel.id)
    if "area_ha" in fields:
        parcel.area_ha = payload.area_ha
    db.commit()
    db.refresh(parcel)
    return parcel_to_out(db, parcel)


@router.delete("/{parcel_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_parcel(
    parcel_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    parcel = get_parcel_or_404(db, user, parcel_id)
    parcel.deleted_at = datetime.now(timezone.utc)
    db.commit()


@router.get("/{parcel_id}/context", response_model=ContextOut)
def context(
    parcel_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ContextOut:
    parcel = get_parcel_or_404(db, user, parcel_id)
    return get_context(db, parcel)


@router.get("/{parcel_id}/crop-history", response_model=list[CropHistoryOut])
def list_history(
    parcel_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CropHistoryOut]:
    get_parcel_or_404(db, user, parcel_id)
    rows = db.scalars(
        select(ParcelCropHistory)
        .where(ParcelCropHistory.parcel_id == parcel_id)
        .order_by(ParcelCropHistory.date_start.asc())
    ).all()
    return [CropHistoryOut.model_validate(row) for row in rows]


@router.post("/{parcel_id}/crop-history", response_model=CropHistoryOut, status_code=201)
def add_history(
    parcel_id: str,
    payload: CropHistoryIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CropHistoryOut:
    get_parcel_or_404(db, user, parcel_id)
    if payload.date_start and payload.date_end and payload.date_end < payload.date_start:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "Fechas de campaña inválidas"},
        )
    row = ParcelCropHistory(parcel_id=parcel_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return CropHistoryOut.model_validate(row)


@router.delete("/{parcel_id}/crop-history/{row_id}", status_code=204)
def delete_history(
    parcel_id: str,
    row_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    get_parcel_or_404(db, user, parcel_id)
    row = db.get(ParcelCropHistory, row_id)
    if row is None or row.parcel_id != parcel_id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "No encontrado"})
    db.delete(row)
    db.commit()


@router.get("/{parcel_id}/water", response_model=list[WaterOut])
def list_water(
    parcel_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[WaterOut]:
    get_parcel_or_404(db, user, parcel_id)
    rows = db.scalars(
        select(WaterAvailability)
        .where(WaterAvailability.parcel_id == parcel_id)
        .order_by(WaterAvailability.start_at.asc())
    ).all()
    return [WaterOut.model_validate(row) for row in rows]


@router.post("/{parcel_id}/water", response_model=WaterOut, status_code=201)
def add_water(
    parcel_id: str,
    payload: WaterIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> WaterOut:
    get_parcel_or_404(db, user, parcel_id)
    row = WaterAvailability(parcel_id=parcel_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return WaterOut.model_validate(row)


@router.get("/{parcel_id}/soil", response_model=list[SoilOut])
def list_soil(
    parcel_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SoilOut]:
    get_parcel_or_404(db, user, parcel_id)
    rows = db.scalars(
        select(SoilObservation)
        .where(SoilObservation.parcel_id == parcel_id)
        .order_by(SoilObservation.observed_at.asc())
    ).all()
    return [SoilOut.model_validate(row) for row in rows]


@router.post("/{parcel_id}/soil", response_model=SoilOut, status_code=201)
def add_soil(
    parcel_id: str,
    payload: SoilIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SoilOut:
    get_parcel_or_404(db, user, parcel_id)
    row = SoilObservation(parcel_id=parcel_id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return SoilOut.model_validate(row)
