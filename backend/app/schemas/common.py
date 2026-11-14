from __future__ import annotations

from pydantic import BaseModel


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict = {}
    request_id: str | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorBody


class HealthOut(BaseModel):
    status: str = "ok"
    version: str = "0.1.0"
    commit: str = "dev"


class ReadyOut(BaseModel):
    status: str
    checks: dict[str, bool]
