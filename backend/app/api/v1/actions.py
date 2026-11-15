from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_parcel_or_404
from app.db.session import get_db
from app.models.entities import ActionProposal, Parcel, SavedDecision, User
from app.schemas.agent import ConfirmIn, ProposalOut, SavedPlanIn, SavedPlanOut

router = APIRouter(tags=["actions"])


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
    return [
        SavedPlanOut(
            id=row.id,
            parcel_id=row.parcel_id,
            name=row.name,
            status=row.status,
            rotation_plan_id=row.rotation_plan_id,
            analysis_run_id=row.analysis_run_id,
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.post("/saved-plans", response_model=SavedPlanOut, status_code=status.HTTP_201_CREATED)
def save_plan(
    payload: SavedPlanIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedPlanOut:
    get_parcel_or_404(db, user, payload.parcel_id)
    row = SavedDecision(
        parcel_id=payload.parcel_id,
        rotation_plan_id=payload.rotation_plan_id,
        analysis_run_id=payload.analysis_run_id,
        name=payload.name,
        status="draft",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return SavedPlanOut(
        id=row.id,
        parcel_id=row.parcel_id,
        name=row.name,
        status=row.status,
        rotation_plan_id=row.rotation_plan_id,
        analysis_run_id=row.analysis_run_id,
        created_at=row.created_at,
    )
