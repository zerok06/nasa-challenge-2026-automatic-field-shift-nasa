from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_token, decode_token
from app.db.session import get_db
from app.models.entities import User
from app.schemas.auth import AnonymousIn, MeOut, ProfileIn, RefreshIn, TokenOut, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


def _tokens(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_token(user.id, "access"),
        refresh_token=create_token(user.id, "refresh", 60 * 24 * 30),
        token_type="bearer",
        expires_in=settings.jwt_expire_minutes * 60,
        user=UserOut.model_validate(user),
    )


@router.post("/anonymous", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def anonymous(payload: AnonymousIn, db: Session = Depends(get_db)) -> TokenOut:
    user = User(
        display_name=payload.display_name,
        is_anonymous=True,
        consent_version=payload.consent_version,
        consent_at=datetime.now(timezone.utc) if payload.consent_version else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _tokens(user)


@router.post("/refresh", response_model=TokenOut)
def refresh(payload: RefreshIn, db: Session = Depends(get_db)) -> TokenOut:
    data = decode_token(payload.refresh_token, "refresh")
    user = db.get(User, data["sub"])
    if user is None or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "Usuario no encontrado"},
        )
    return _tokens(user)


@router.get("/me", response_model=MeOut)
def me(user: User = Depends(get_current_user)) -> MeOut:
    return MeOut(user=UserOut.model_validate(user))


@router.patch("/me", response_model=MeOut)
def update_me(
    payload: ProfileIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MeOut:
    user.display_name = payload.display_name
    user.locale = payload.locale
    user.profile_json = payload.profile
    if payload.consent_version:
        user.consent_version = payload.consent_version
        user.consent_at = user.consent_at or datetime.now(timezone.utc)
    if payload.onboarding_completed and user.onboarding_completed_at is None:
        user.onboarding_completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(user)
    return MeOut(user=UserOut.model_validate(user))
