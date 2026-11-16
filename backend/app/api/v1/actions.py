from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_parcel_or_404
from app.db.session import get_db
from app.models.entities import (
    ActionProposal,
    Parcel,
    ParcelCropHistory,
    SavedDecision,
    SoilObservation,
    User,
    WaterAvailability,
)
from app.schemas.agent import (
    ConfirmIn,
    ProposalOut,
    SavedPlanIn,
    SavedPlanOut,
    SavedPlanReviewOut,
)
from app.schemas.parcel import CropHistoryIn, SoilIn, WaterIn
from app.use_cases.climate import ClimateDataUnavailable
from app.use_cases.saved_plans import (
    review_saved_plan,
    save_saved_plan,
    saved_plan_out,
)

router = APIRouter(tags=["actions"])


def _apply_capture(
    db: Session, user: User, proposal: ActionProposal
) -> dict[str, Any]:
    """Apply a capture_* proposal. Raises HTTPException on invalid values."""
    data = proposal.payload_json or {}
    kind = data.get("kind")
    values = data.get("values") or {}
    if not isinstance(values, dict):
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": "Valores inválidos"},
        )
    parcel = db.get(Parcel, proposal.parcel_id)
    if parcel is None or parcel.owner_user_id != user.id:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Parcela no encontrada"},
        )
    if kind == "water":
        try:
            validated = WaterIn(**_water_defaults(values)).model_dump()
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail={"code": "validation_error", "message": f"Agua inválida: {exc}"},
            ) from exc
        row = WaterAvailability(parcel_id=parcel.id, **validated)
        db.add(row)
        db.flush()
        return {"water_id": row.id}
    if kind == "soil":
        try:
            validated = SoilIn(**values).model_dump()
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail={"code": "validation_error", "message": f"Suelo inválido: {exc}"},
            ) from exc
        row = SoilObservation(parcel_id=parcel.id, **validated)
        db.add(row)
        db.flush()
        return {"soil_id": row.id}
    if kind == "economics":
        crop = str(values.get("crop") or values.get("crop_id") or "").strip().lower()
        if not crop:
            raise HTTPException(
                status_code=422,
                detail={"code": "validation_error", "message": "Falta el cultivo"},
            )
        item: dict[str, Any] = {}
        for key in ("yield_kg_ha", "price_pen_kg", "costs_pen"):
            if values.get(key) is not None:
                try:
                    number = float(values[key])
                except (TypeError, ValueError) as exc:
                    raise HTTPException(
                        status_code=422,
                        detail={"code": "validation_error", "message": f"{key} inválido"},
                    ) from exc
                if number < 0:
                    raise HTTPException(
                        status_code=422,
                        detail={"code": "validation_error", "message": f"{key} inválido"},
                    )
                item[key] = number
        if not item:
            raise HTTPException(
                status_code=422,
                detail={"code": "validation_error", "message": "Sin valores de precio o gasto"},
            )
        prefs = dict(parcel.preferences_json or {})
        econ = dict(prefs.get("economics") or {})
        current = dict(econ.get(crop) or {})
        current.update(item)
        econ[crop] = current
        prefs["economics"] = econ
        if item.get("price_pen_kg") is not None:
            prefs["price_assumption_type"] = "farmer"
        parcel.preferences_json = prefs
        db.flush()
        return {"crop": crop, **item}
    if kind == "history":
        try:
            validated = CropHistoryIn(**values).model_dump()
        except Exception as exc:
            raise HTTPException(
                status_code=422,
                detail={"code": "validation_error", "message": f"Historial inválido: {exc}"},
            ) from exc
        row = ParcelCropHistory(parcel_id=parcel.id, **validated)
        db.add(row)
        db.flush()
        return {"history_id": row.id}
    raise HTTPException(
        status_code=422,
        detail={"code": "validation_error", "message": f"Tipo no soportado: {kind}"},
    )


def _water_defaults(values: dict[str, Any]) -> dict[str, Any]:
    from datetime import date

    out = dict(values)
    today = date.today()
    out.setdefault("start_at", date(today.year, 1, 1).isoformat())
    out.setdefault("end_at", date(today.year, 12, 31).isoformat())
    out.setdefault("method", "unknown")
    out.setdefault("confidence", "unknown")
    return out


@router.post("/actions/{proposal_id}/confirm", response_model=ProposalOut)
def confirm(
    proposal_id: str,
    payload: ConfirmIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProposalOut:
    proposal = db.get(ActionProposal, proposal_id)
    if proposal is None or proposal.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Propuesta no encontrada"})
    if proposal.status != "pending":
        raise HTTPException(status_code=409, detail={"code": "conflict", "message": "Propuesta ya procesada"})
    if proposal.expires_at and proposal.expires_at < datetime.now(timezone.utc):
        proposal.status = "expired"
        db.commit()
        raise HTTPException(status_code=409, detail={"code": "conflict", "message": "Propuesta expirada"})

    if payload.approved:
        if proposal.type == "save_plan":
            data = proposal.payload_json or {}
            parcel = db.get(Parcel, proposal.parcel_id)
            if parcel is None or parcel.owner_user_id != user.id:
                raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Parcela no encontrada"})
            db.add(
                SavedDecision(
                    parcel_id=proposal.parcel_id,
                    rotation_plan_id=data.get("rotation_plan_id"),
                    analysis_run_id=data.get("analysis_run_id"),
                    name=data.get("name", "Borrador"),
                    status="draft",
                )
            )
        elif proposal.type.startswith("capture_"):
            data = proposal.payload_json or {}
            applied = _apply_capture(db, user, proposal)
            merged = dict(data)
            merged["applied"] = applied
            proposal.payload_json = merged
        proposal.status = "confirmed"
    else:
        proposal.status = "rejected"
    db.commit()
    db.refresh(proposal)
    return ProposalOut(
        id=proposal.id,
        type=proposal.type,
        status=proposal.status,
        payload=proposal.payload_json or {},
        expires_at=proposal.expires_at,
    )


@router.get("/saved-plans", response_model=list[SavedPlanOut])
def list_saved(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SavedPlanOut]:
    rows = db.scalars(
        select(SavedDecision)
        .join(Parcel, Parcel.id == SavedDecision.parcel_id)
        .where(Parcel.owner_user_id == user.id)
        .order_by(SavedDecision.created_at.desc())
    ).all()
    return [saved_plan_out(row) for row in rows]


@router.post("/saved-plans", response_model=SavedPlanOut, status_code=status.HTTP_201_CREATED)
def save_plan(
    payload: SavedPlanIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedPlanOut:
    parcel = get_parcel_or_404(db, user, payload.parcel_id)
    try:
        return save_saved_plan(db, parcel, payload)
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Comparación no encontrada"},
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": str(exc)},
        ) from exc


@router.get("/saved-plans/{saved_plan_id}/review", response_model=SavedPlanReviewOut)
def review_saved_plan_endpoint(
    saved_plan_id: str,
    comparison_id: str | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedPlanReviewOut:
    try:
        return review_saved_plan(db, user, saved_plan_id, comparison_id)
    except LookupError as exc:
        raise HTTPException(
            status_code=404,
            detail={"code": "not_found", "message": "Plan guardado no encontrado"},
        ) from exc
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=422,
            detail={"code": "validation_error", "message": str(exc)},
        ) from exc
    except ClimateDataUnavailable as exc:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "climate_unavailable",
                "message": (
                    "No pudimos recalcular el clima actual para revisar el plan. "
                    "Revisa la conexión e intenta de nuevo."
                ),
            },
        ) from exc
