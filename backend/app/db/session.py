from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.base import Base

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, class_=Session)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """Create PostGIS and tables if missing. Used by the migrate service and tests."""
    from app import models  # noqa: F401  (register tables)

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    Base.metadata.create_all(bind=engine)

    # Lightweight forward-compatible migration for the pilot database. The
    # project does not use Alembic yet, so create_all cannot add columns to an
    # existing table. Keep these statements idempotent.
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                "profile_json JSONB NOT NULL DEFAULT '{}'::jsonb"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE users ADD COLUMN IF NOT EXISTS "
                "onboarding_completed_at TIMESTAMPTZ"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE parcels ADD COLUMN IF NOT EXISTS "
                "terrain_json JSONB NOT NULL DEFAULT '{}'::jsonb"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE agent_threads ADD COLUMN IF NOT EXISTS "
                "state_json JSONB NOT NULL DEFAULT '{}'::jsonb"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE crops ADD COLUMN IF NOT EXISTS "
                "catalog_id VARCHAR(40)"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE crops ADD COLUMN IF NOT EXISTS "
                "crop_type VARCHAR(20)"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE crops ADD COLUMN IF NOT EXISTS "
                "duration_min_days INTEGER"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE crops ADD COLUMN IF NOT EXISTS "
                "duration_max_days INTEGER"
            )
        )
        conn.execute(
            text(
                "CREATE INDEX IF NOT EXISTS ix_crops_catalog_id ON crops (catalog_id)"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE saved_decisions ADD COLUMN IF NOT EXISTS "
                "comparison_id VARCHAR(36)"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE saved_decisions ADD COLUMN IF NOT EXISTS "
                "preferred_plan_id VARCHAR(36)"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE saved_decisions ADD COLUMN IF NOT EXISTS "
                "fallback_plan_id VARCHAR(36)"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE saved_decisions ADD COLUMN IF NOT EXISTS "
                "snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE saved_decisions ADD COLUMN IF NOT EXISTS "
                "thresholds_json JSONB NOT NULL DEFAULT '{}'::jsonb"
            )
        )
        conn.execute(
            text(
                "ALTER TABLE saved_decisions ADD COLUMN IF NOT EXISTS "
                "reviewed_at TIMESTAMPTZ"
            )
        )
