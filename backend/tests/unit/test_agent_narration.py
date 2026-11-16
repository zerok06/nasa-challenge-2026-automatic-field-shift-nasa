"""Unit tests for the deterministic proactive greeting (spec 036).

The greeting is the first-turn narrator: it reads the parcel context, picks the
single highest-priority missing input and creates a soft `propose_capture`
proposal (never auto-saved). If the parcel is complete it invites comparison.
"""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import patch

from app.agent.runtime import _proactive_greeting
from app.models.entities import ActionProposal, AgentThread, Parcel, User
from app.schemas.agent import NextStep


class FakeDB:
    """Barely enough of an ORM session for _proactive_greeting and _remember."""

    def __init__(self) -> None:
        self.proposals: list[ActionProposal] = []
        self.messages: list[object] = []

    def add(self, obj) -> None:
        if isinstance(obj, ActionProposal):
            self.proposals.append(obj)
        else:
            self.messages.append(obj)

    def commit(self) -> None:
        for p in self.proposals:
            if p.expires_at is None:
                p.expires_at = datetime.now(UTC)

    def refresh(self, obj) -> None:  # no-op for the fake
        pass


def _user() -> User:
    u = User(id="u1", locale="es-PE")
    u.profile_json = {}
    return u


def _parcel() -> Parcel:
    p = Parcel(id="p1", owner_user_id="u1", name="Chacra demo", area_ha=1.0, district="Ilo")
    p.preferences_json = {}
    p.terrain_json = {}
    return p


def _thread(turn_count: int = 0) -> AgentThread:
    return AgentThread(
        id="t1",
        owner_user_id="u1",
        parcel_id="p1",
        graph_thread_id="u1:p1",
        state_json={"turn_count": turn_count} if turn_count else {},
    )


def _context(missing: list[str]):
    class _Ctx:
        def __init__(self, missing):
            self.missing_inputs = missing

    return _Ctx(missing)


def test_new_thread_with_missing_inputs_proposes_capture():
    db = FakeDB()
    with patch(
        "app.agent.runtime.get_context", return_value=_context(["water_available", "crop_history"])
    ):
        result = _proactive_greeting(db, _user(), _thread(), _parcel(), "hola")
    assert result is not None
    assert result.next_step is not None and result.next_step.phase == "datos"
    assert result.pending_proposal_id is not None
    assert any(a.action == "capture_draft" for a in result.ui_actions)
    assert "agua" in result.answer
    # i18n contract: a stable key + params so the frontend can translate.
    assert result.answer_key == "agent.greeting.missing"
    assert result.answer_params == {"name": "Chacra demo", "what": "agent.missing.water_available"}
    # A pending proposal was created (soft, not auto-saved).
    assert len(db.proposals) == 1
    assert db.proposals[0].status == "pending"
    assert db.proposals[0].type == "capture_water"
    assert db.proposals[0].owner_user_id == "u1"


def test_new_thread_complete_parcel_invites_comparison():
    db = FakeDB()
    with patch("app.agent.runtime.get_context", return_value=_context([])):
        result = _proactive_greeting(db, _user(), _thread(), _parcel(), "hola")
    assert result is not None
    assert result.next_step is not None and result.next_step.phase == "comparar"
    assert result.pending_proposal_id is None
    assert not result.ui_actions
    assert not db.proposals
    # i18n contract: complete-parcel greeting is also a translatable key.
    assert result.answer_key == "agent.greeting.complete"
    assert result.answer_params == {"name": "Chacra demo"}


def test_non_new_thread_returns_none():
    db = FakeDB()
    with patch("app.agent.runtime.get_context", return_value=_context(["water_available"])):
        result = _proactive_greeting(db, _user(), _thread(turn_count=1), _parcel(), "hola")
    assert result is None
    assert not db.proposals
