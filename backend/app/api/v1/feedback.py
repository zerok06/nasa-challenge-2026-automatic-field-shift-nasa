from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_parcel_or_404
from app.db.session import get_db
from app.models.entities import Feedback, User
from app.schemas.feedback import FeedbackIn, FeedbackOut

router = APIRouter(tags=["feedback"])


@router.post("/feedback", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def create_feedback(
    payload: FeedbackIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FeedbackOut:
    if payload.parcel_id:
        get_parcel_or_404(db, user, payload.parcel_id)
    row = Feedback(
        user_id=user.id,
        parcel_id=payload.parcel_id,
        kind=payload.kind,
        rating=payload.rating,
        comment=payload.comment,
        context_json=payload.context,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return FeedbackOut(
        id=row.id,
        kind=row.kind,
        rating=row.rating,
        created_at=row.created_at,
    )
