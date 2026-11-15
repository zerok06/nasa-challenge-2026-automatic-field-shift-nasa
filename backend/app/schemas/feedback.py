from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class FeedbackIn(BaseModel):
    parcel_id: str | None = None
    kind: Literal["comparison", "onboarding", "general"] = "comparison"
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, max_length=500)
    context: dict[str, Any] = Field(default_factory=dict)


class FeedbackOut(BaseModel):
    id: str
    kind: str
    rating: int | None = None
    created_at: datetime
