from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Crop, DatasetSnapshot
from app.schemas.common import HealthOut, ReadyOut

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
def health() -> HealthOut:
    return HealthOut()


@router.get("/ready", response_model=ReadyOut)
def ready(db: Session = Depends(get_db)) -> ReadyOut:
    checks = {"database": False, "crops": False, "snapshot": False}
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = True
    except Exception:
        return ReadyOut(status="not_ready", checks=checks)
    checks["crops"] = (db.scalar(select(func.count()).select_from(Crop)) or 0) > 0
    checks["snapshot"] = (
        db.scalar(select(func.count()).select_from(DatasetSnapshot)) or 0
    ) > 0
    status = "ready" if all(checks.values()) else "partial"
    return ReadyOut(status=status, checks=checks)
