from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.entities import Crop

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/crops")
def list_crops(db: Session = Depends(get_db)) -> dict:
    rows = db.scalars(select(Crop).order_by(Crop.local_name)).all()
    return {
        "catalog_version": "v0.1",
        "review_status": "needs_review",
        "crops": [
            {
                "id": c.id,
                "local_name": c.local_name,
                "scientific_name": c.scientific_name,
                "family": c.family,
                "duration_days": c.duration_days,
                "windows": c.windows_json,
                "kc": c.kc_json,
                "risks": c.risks_json,
                "source_refs": c.source_refs,
                "review_status": c.review_status,
            }
            for c in rows
        ],
    }
