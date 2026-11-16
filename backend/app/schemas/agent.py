from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ThreadCreate(BaseModel):
    parcel_id: str


class MessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    ui_context: dict[str, Any] = Field(default_factory=dict)
    # "guided" keeps the structured one-datum-at-a-time opening used by the
    # Android app; "chat" is a freer conversation for the web chat: the agent
    # answers the actual question and only proposes a capture when it helps.
    mode: Literal["guided", "chat"] = "guided"


class ToolTrace(BaseModel):
    tool: str
    status: Literal["ok", "error", "timeout", "skipped"]
    latency_ms: int = 0
    summary: str = ""
    # ReAct step number (1-based). 0 means the runtime did not label it.
    step: int = 0


class UiAction(BaseModel):
    action: Literal[
        "open_comparison",
        "open_scenario",
        "show_sources",
        "save_plan_draft",
        "capture_draft",
        "open_screen",
    ]
    payload: dict[str, Any] = Field(default_factory=dict)


class NextStep(BaseModel):
    phase: Literal["datos", "comparar", "probar", "guardar", "listo"]


class AgentMessageOut(BaseModel):
    thread_id: str
    status: str = "completed"
    answer: str
    # Optional i18n key + params so the frontend can render the answer in the
    # user's language. When present, the client should call
    # t(answer_key, answer_params) instead of using `answer` raw.
    answer_key: str | None = None
    answer_params: dict[str, Any] = Field(default_factory=dict)
    tool_trace: list[ToolTrace] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)
    ui_actions: list[UiAction] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    analysis_run_id: str | None = None
    pending_proposal_id: str | None = None
    next_step: NextStep | None = None
    # Human-readable list of what the pending proposal would save if the farmer
    # confirms. Empty when there is nothing pending.
    save_preview: list[str] = Field(default_factory=list)


class ProposalOut(BaseModel):
    id: str
    type: str
    status: str
    payload: dict[str, Any]
    expires_at: datetime | None = None


class ConfirmIn(BaseModel):
    approved: bool


class SavedPlanIn(BaseModel):
    parcel_id: str
    comparison_id: str | None = None
    preferred_plan_id: str | None = None
    fallback_plan_id: str | None = None
    rotation_plan_id: str | None = None
    analysis_run_id: str | None = None
    name: str = Field(min_length=1, max_length=120)


class SavedPlanSnapshotPlanOut(BaseModel):
    plan_id: str
    label: str
    kind: str
    status: str
    crop_sequence: list[str] = Field(default_factory=list)
    water: dict[str, Any] = Field(default_factory=dict)
    economics: dict[str, Any] = Field(default_factory=dict)


class SavedPlanOut(BaseModel):
    id: str
    parcel_id: str
    name: str
    status: str
    rotation_plan_id: str | None = None
    analysis_run_id: str | None = None
    comparison_id: str | None = None
    preferred_plan_id: str | None = None
    fallback_plan_id: str | None = None
    preferred: SavedPlanSnapshotPlanOut | None = None
    fallback: SavedPlanSnapshotPlanOut | None = None
    thresholds: dict[str, Any] = Field(default_factory=dict)
    reviewed_at: datetime | None = None
    created_at: datetime | None = None


class SavedPlanReviewAlertOut(BaseModel):
    code: Literal[
        "plan_no_longer_available",
        "water_below_saved",
        "deficit_appeared",
        "margin_below_saved",
        "status_changed",
    ]
    severity: Literal["info", "warning", "critical"]
    message: str


class SavedPlanReviewOut(BaseModel):
    saved_plan_id: str
    changed: bool
    checked_at: datetime
    alerts: list[SavedPlanReviewAlertOut] = Field(default_factory=list)
    saved_preferred: SavedPlanSnapshotPlanOut | None = None
    current_preferred: SavedPlanSnapshotPlanOut | None = None
    saved_available_mm: float | None = None
    current_available_mm: float | None = None
    saved_margin_pen: float | None = None
    current_margin_pen: float | None = None
