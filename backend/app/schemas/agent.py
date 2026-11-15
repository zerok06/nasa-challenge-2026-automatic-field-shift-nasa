from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class ThreadCreate(BaseModel):
    parcel_id: str


class MessageIn(BaseModel):
    message: str = Field(min_length=1, max_length=500)
    ui_context: dict[str, Any] = Field(default_factory=dict)


class ToolTrace(BaseModel):
    tool: str
    status: Literal["ok", "error", "timeout", "skipped"]
    latency_ms: int = 0
    summary: str = ""


class UiAction(BaseModel):
    action: Literal[
        "open_comparison",
        "open_scenario",
        "show_sources",
        "save_plan_draft",
    ]
    payload: dict[str, Any] = Field(default_factory=dict)


class NextStep(BaseModel):
    phase: Literal["datos", "comparar", "probar", "guardar", "listo"]


class AgentMessageOut(BaseModel):
    thread_id: str
    status: str = "completed"
    answer: str
    tool_trace: list[ToolTrace] = Field(default_factory=list)
    evidence_refs: list[str] = Field(default_factory=list)
    ui_actions: list[UiAction] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    analysis_run_id: str | None = None
    next_step: NextStep | None = None


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
    rotation_plan_id: str | None = None
    analysis_run_id: str | None = None
    name: str = Field(min_length=1, max_length=120)


class SavedPlanOut(BaseModel):
    id: str
    parcel_id: str
    name: str
    status: str
    rotation_plan_id: str | None = None
    analysis_run_id: str | None = None
    created_at: datetime | None = None
