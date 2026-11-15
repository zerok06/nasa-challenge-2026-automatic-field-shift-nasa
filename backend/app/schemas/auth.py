from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AnonymousIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    consent_version: str | None = Field(default=None, max_length=20)


class ProfileIn(BaseModel):
    display_name: str | None = Field(default=None, max_length=120)
    locale: str = Field(default="es-PE", max_length=10)
    profile: dict[str, Any] = Field(default_factory=dict)
    onboarding_completed: bool = True
    consent_version: str | None = Field(default=None, max_length=20)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: str
    display_name: str | None = None
    is_anonymous: bool = True
    locale: str = "es-PE"
    consent_version: str | None = None
    consent_at: datetime | None = None
    profile: dict[str, Any] = Field(
        default_factory=dict, validation_alias="profile_json", serialization_alias="profile"
    )
    onboarding_completed_at: datetime | None = None


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
