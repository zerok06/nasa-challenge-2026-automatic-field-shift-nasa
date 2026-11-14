from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.parcel import ParcelOut
from app.use_cases.context import parcel_to_out
from app.use_cases.seed import seed_demo_parcel

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/parcel", response_model=ParcelOut, status_code=status.HTTP_201_CREATED)
def create_demo_parcel(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ParcelOut:
    parcel = seed_demo_parcel(db, user)
    return parcel_to_out(db, parcel)
