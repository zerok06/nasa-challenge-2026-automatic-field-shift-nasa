from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.agent.price_catalog import find_price_reference, list_price_references
from app.models.entities import Crop

router = APIRouter(prefix="/catalog", tags=["catalog"])


@router.get("/crops")
def list_crops(
    district: str | None = Query(
        default=None,
        max_length=120,
        description="Distrito de la parcela para proponer el precio más cercano.",
    ),
    db: Session = Depends(get_db),
) -> dict:
    rows = db.scalars(select(Crop).order_by(Crop.local_name)).all()
    return {
        "catalog_version": "v0.1",
        "review_status": "needs_review",
        "prices_chacra_2025": list_price_references(),
        "crops": [
            {
                "id": c.id,
                "catalog_id": c.catalog_id,
                "local_name": c.local_name,
                "scientific_name": c.scientific_name,
                "family": c.family,
                "duration_days": c.duration_days,
                "windows": c.windows_json,
                "kc": c.kc_json,
                "risks": c.risks_json,
                "source_refs": c.source_refs,
                "review_status": c.review_status,
                # Precio propuesto (distrito → provincia → región → histórico).
                # La UI lo muestra como editable y con su fuente/año.
                "price_reference": find_price_reference(
                    c.id, district, allow_regional=True
                ),
            }
            for c in rows
        ],
    }
