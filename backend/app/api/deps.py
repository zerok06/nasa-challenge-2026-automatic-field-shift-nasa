from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.entities import Parcel, User

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "Falta el token"},
        )
    payload = decode_token(credentials.credentials, "access")
    user = db.get(User, payload["sub"])
    if user is None or user.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "unauthorized", "message": "Usuario no encontrado"},
        )
    return user


def get_parcel_or_404(db: Session, user: User, parcel_id: str) -> Parcel:
    parcel = db.get(Parcel, parcel_id)
    if parcel is None or parcel.owner_user_id != user.id or parcel.deleted_at is not None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "not_found", "message": "Parcela no encontrada"},
        )
    return parcel
