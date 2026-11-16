from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import DatasetSnapshot, Parcel


def snapshot_for_parcel(db: Session, parcel: Parcel) -> DatasetSnapshot | None:
    snapshots = db.scalars(
        select(DatasetSnapshot).order_by(DatasetSnapshot.retrieved_at.desc())
    ).all()
    for snapshot in snapshots:
        metadata = snapshot.metadata_json or {}
        if metadata.get("parcel_id") == parcel.id:
            return snapshot
    # The seeded demo snapshot predates per-parcel tagging. Keep the demo
    # working while new parcels require their own downloaded bundle.
    if parcel.name == "Parcela demo":
        return db.get(DatasetSnapshot, "power_moquegua_2024_demo")
    return None
