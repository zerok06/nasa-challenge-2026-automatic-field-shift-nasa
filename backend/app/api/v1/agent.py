from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.agent.runtime import run_agent
from app.api.deps import get_current_user, get_parcel_or_404
from app.db.session import get_db
from app.models.entities import AgentThread, User
from app.schemas.agent import AgentMessageOut, MessageIn, ThreadCreate

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/threads", status_code=status.HTTP_201_CREATED)
def create_thread(
    payload: ThreadCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    parcel = get_parcel_or_404(db, user, payload.parcel_id)
    thread = AgentThread(
        owner_user_id=user.id,
        parcel_id=parcel.id,
        graph_thread_id=f"{user.id}:{parcel.id}",
    )
    db.add(thread)
    db.commit()
    db.refresh(thread)
    return {"thread_id": thread.id, "parcel_id": parcel.id}


@router.get("/threads/{thread_id}")
def get_thread(
    thread_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    thread = db.get(AgentThread, thread_id)
    if thread is None or thread.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Hilo no encontrado"})
    return {
        "thread_id": thread.id,
        "parcel_id": thread.parcel_id,
        "last_message_at": thread.last_message_at,
    }


@router.post("/threads/{thread_id}/messages", response_model=AgentMessageOut)
def send_message(
    thread_id: str,
    payload: MessageIn,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AgentMessageOut:
    thread = db.get(AgentThread, thread_id)
    if thread is None or thread.owner_user_id != user.id:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Hilo no encontrado"})
    try:
        return run_agent(db, user, thread, payload.message, payload.ui_context, mode=payload.mode)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail={"code": "not_found", "message": "Parcela no encontrada"}) from exc
