from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from geoalchemy2 import Geometry
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin


def new_id() -> str:
    return str(uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    locale: Mapped[str] = mapped_column(String(10), default="es-PE", nullable=False)
    consent_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    consent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    parcels: Mapped[list[Parcel]] = relationship(back_populates="owner")


class Parcel(Base, TimestampMixin):
    __tablename__ = "parcels"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    geom: Mapped[Any] = mapped_column(Geometry("GEOMETRY", srid=4326), nullable=False)
    area_ha: Mapped[float | None] = mapped_column(Numeric(10, 4), nullable=True)
    district: Mapped[str | None] = mapped_column(String(120), nullable=True)
    timezone: Mapped[str] = mapped_column(String(40), default="America/Lima", nullable=False)
    preferences_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped[User] = relationship(back_populates="parcels")
    history: Mapped[list[ParcelCropHistory]] = relationship(back_populates="parcel")
    water: Mapped[list[WaterAvailability]] = relationship(back_populates="parcel")
    soil: Mapped[list[SoilObservation]] = relationship(back_populates="parcel")


class ParcelCropHistory(Base):
    __tablename__ = "parcel_crop_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    parcel_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("parcels.id", ondelete="CASCADE"), index=True, nullable=False
    )
    crop_id: Mapped[str | None] = mapped_column(String(40), ForeignKey("crops.id"), nullable=True)
    family: Mapped[str | None] = mapped_column(String(80), nullable=True)
    date_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str] = mapped_column(String(20), default="farmer", nullable=False)

    parcel: Mapped[Parcel] = relationship(back_populates="history")


class WaterAvailability(Base):
    __tablename__ = "water_availability"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    parcel_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("parcels.id", ondelete="CASCADE"), index=True, nullable=False
    )
    start_at: Mapped[date] = mapped_column(Date, nullable=False)
    end_at: Mapped[date] = mapped_column(Date, nullable=False)
    volume_m3: Mapped[float | None] = mapped_column(Numeric(14, 2), nullable=True)
    mm: Mapped[float | None] = mapped_column(Numeric(10, 2), nullable=True)
    method: Mapped[str] = mapped_column(String(20), default="unknown", nullable=False)
    efficiency: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence: Mapped[str] = mapped_column(String(20), default="unknown", nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    parcel: Mapped[Parcel] = relationship(back_populates="water")


class SoilObservation(Base):
    __tablename__ = "soil_observations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    parcel_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("parcels.id", ondelete="CASCADE"), index=True, nullable=False
    )
    variable: Mapped[str] = mapped_column(String(40), nullable=False)
    value: Mapped[float | None] = mapped_column(Numeric(12, 4), nullable=True)
    unit: Mapped[str | None] = mapped_column(String(20), nullable=True)
    observed_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    method: Mapped[str] = mapped_column(String(20), default="unknown", nullable=False)
    source: Mapped[str | None] = mapped_column(String(120), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    parcel: Mapped[Parcel] = relationship(back_populates="soil")


class Crop(Base):
    __tablename__ = "crops"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    local_name: Mapped[str] = mapped_column(String(80), nullable=False)
    scientific_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    family: Mapped[str] = mapped_column(String(80), nullable=False)
    catalog_version: Mapped[str] = mapped_column(String(20), default="v0.1", nullable=False)
    duration_days: Mapped[int] = mapped_column(Integer, nullable=False)
    windows_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    kc_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    risks_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    source_refs: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    review_status: Mapped[str] = mapped_column(String(20), default="needs_review", nullable=False)


class DataSource(Base):
    __tablename__ = "data_sources"

    id: Mapped[str] = mapped_column(String(60), primary_key=True)
    provider: Mapped[str] = mapped_column(String(80), nullable=False)
    dataset: Mapped[str] = mapped_column(String(160), nullable=False)
    product_version: Mapped[str | None] = mapped_column(String(40), nullable=True)
    spatial_resolution: Mapped[str | None] = mapped_column(String(80), nullable=True)
    temporal_resolution: Mapped[str | None] = mapped_column(String(80), nullable=True)
    license: Mapped[str | None] = mapped_column(String(120), nullable=True)
    url: Mapped[str | None] = mapped_column(String(300), nullable=True)


class DatasetSnapshot(Base):
    __tablename__ = "dataset_snapshots"

    id: Mapped[str] = mapped_column(String(80), primary_key=True)
    source_id: Mapped[str] = mapped_column(String(60), ForeignKey("data_sources.id"), nullable=False)
    bbox: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    retrieved_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    object_path: Mapped[str] = mapped_column(String(300), nullable=False)
    checksum: Mapped[str | None] = mapped_column(String(80), nullable=True)
    missing_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    method: Mapped[str] = mapped_column(String(80), nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    is_simulated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class ParcelIndicator(Base):
    __tablename__ = "parcel_indicators"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    parcel_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("parcels.id", ondelete="CASCADE"), index=True, nullable=False
    )
    snapshot_id: Mapped[str] = mapped_column(String(80), ForeignKey("dataset_snapshots.id"), nullable=False)
    indicator: Mapped[str] = mapped_column(String(60), nullable=False)
    value: Mapped[float | None] = mapped_column(Float, nullable=True)
    unit: Mapped[str] = mapped_column(String(20), nullable=False)
    time_start: Mapped[date] = mapped_column(Date, nullable=False)
    time_end: Mapped[date] = mapped_column(Date, nullable=False)
    quality_flag: Mapped[str] = mapped_column(String(30), default="estimated", nullable=False)
    method: Mapped[str] = mapped_column(String(80), nullable=False)


class RotationPlan(Base):
    __tablename__ = "rotation_plans"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    parcel_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("parcels.id", ondelete="CASCADE"), index=True, nullable=False
    )
    analysis_run_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("analysis_runs.id", ondelete="CASCADE"), index=True, nullable=True
    )
    label: Mapped[str] = mapped_column(String(80), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    horizon_start: Mapped[date] = mapped_column(Date, nullable=False)
    horizon_end: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    assumptions_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    steps: Mapped[list[RotationPlanStep]] = relationship(back_populates="plan", cascade="all, delete-orphan")


class RotationPlanStep(Base):
    __tablename__ = "rotation_plan_steps"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    plan_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("rotation_plans.id", ondelete="CASCADE"), index=True, nullable=False
    )
    crop_id: Mapped[str] = mapped_column(String(40), ForeignKey("crops.id"), nullable=False)
    sowing_date: Mapped[date] = mapped_column(Date, nullable=False)
    harvest_date: Mapped[date] = mapped_column(Date, nullable=False)
    ordinal: Mapped[int] = mapped_column(Integer, nullable=False)

    plan: Mapped[RotationPlan] = relationship(back_populates="steps")


class AnalysisRun(Base):
    __tablename__ = "analysis_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    parcel_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("parcels.id", ondelete="CASCADE"), index=True, nullable=False
    )
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    model_version: Mapped[str] = mapped_column(String(40), nullable=False)
    catalog_version: Mapped[str] = mapped_column(String(20), nullable=False)
    inputs_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    snapshot_ids: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="completed", nullable=False)
    results_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    warnings_json: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)
    parent_run_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class AgentThread(Base):
    __tablename__ = "agent_threads"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parcel_id: Mapped[str] = mapped_column(String(36), ForeignKey("parcels.id"), nullable=False)
    graph_thread_id: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    last_message_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class ActionProposal(Base):
    __tablename__ = "action_proposals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    owner_user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    parcel_id: Mapped[str] = mapped_column(String(36), ForeignKey("parcels.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(40), nullable=False)
    payload_json: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    idempotency_key: Mapped[str | None] = mapped_column(String(120), unique=True, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class SavedDecision(Base):
    __tablename__ = "saved_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    parcel_id: Mapped[str] = mapped_column(String(36), ForeignKey("parcels.id"), nullable=False)
    rotation_plan_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("rotation_plans.id"), nullable=True)
    analysis_run_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("analysis_runs.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="draft", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
