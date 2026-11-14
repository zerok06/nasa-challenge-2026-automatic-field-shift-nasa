from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AnonymousIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    consent_version: str | None = Field(default=None, max_length=20)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    display_name: str | None = None
    is_anonymous: bool = True
    locale: str = "es-PE"
    consent_version: str | None = None
    consent_at: datetime | None = None


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class RefreshIn(BaseModel):
    refresh_token: str


class MeOut(BaseModel):
    user: UserOut
