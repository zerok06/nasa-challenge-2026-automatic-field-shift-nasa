from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_parcel_or_404
from app.db.session import get_db
from app.models.entities import AnalysisRun, User
from app.schemas.analysis import ComparisonOut, ComparisonRequest, ScenarioRequest
from app.use_cases.climate import ClimateDataUnavailable
from app.use_cases.comparison import create_comparison, get_comparison, simulate

router = APIRouter(prefix="/comparisons", tags=["comparisons"])


def _default_horizon() -> tuple[date, date]:
    year = date.today().year + 1
    return date(year, 1, 1), date(year, 12, 31)


@router.post("", response_model=ComparisonOut, status_code=status.HTTP_201_CREATED)
def create(
    payload: ComparisonRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> ComparisonOut:
    parcel = get_parcel_or_404(db, user, payload.parcel_id)
    start, end = _default_horizon()
    if payload.horizon_start:
        start = payload.horizon_start
    if payload.horizon_end:
        end = payload.horizon_end
    if end < start:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "Horizonte inválido"},
        )
    if idempotency_key:
        existing = db.scalar(
            select(AnalysisRun).where(
                AnalysisRun.idempotency_key == idempotency_key,
                AnalysisRun.parcel_id == parcel.id,
            )
        )
        if existing is not None:
            return ComparisonOut.model_validate(existing.results_json)
    try:
        return create_comparison(db, user, parcel, start, end, idempotency_key)
    except ClimateDataUnavailable as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "climate_unavailable",
                "message": (
                    "No pudimos obtener datos reales de NASA POWER para tu parcela. "
                    "Revisa la conexión e intenta de nuevo."
                ),
            },
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": str(exc)},
        ) from exc


@router.get("/{comparison_id}", response_model=ComparisonOut)
def read(
    comparison_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ComparisonOut:
    try:
        return get_comparison(db, user, comparison_id)
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Comparación no encontrada"},
        ) from exc


@router.post("/{comparison_id}/simulate", response_model=ComparisonOut)
def scenario(
    comparison_id: str,
    payload: ScenarioRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ComparisonOut:
    try:
        return simulate(db, user, comparison_id, payload)
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Comparación no encontrada"},
        ) from exc
