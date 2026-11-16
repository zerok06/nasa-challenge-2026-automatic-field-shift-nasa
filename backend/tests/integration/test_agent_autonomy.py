from __future__ import annotations


def test_propose_capture_creates_pending_proposal(client, auth, demo_parcel):
    thread = client.post(
        "/api/v1/agent/threads", json={"parcel_id": demo_parcel["id"]}, headers=auth
    )
    assert thread.status_code == 201, thread.text
    from app.agent.tools import AgentTools
    from app.db.session import SessionLocal
    from app.models.entities import Parcel, User

    db = SessionLocal()
    try:
        parcel = db.get(Parcel, demo_parcel["id"])
        user = db.get(User, parcel.owner_user_id)
        tools = AgentTools(db, user, parcel)
        outcome = tools.execute(
            "propose_capture",
            {
                "kind": "economics",
                "values": {"crop": "onion", "price_pen_kg": 1.5},
                "source_text": "vendo a 1.5 el kilo",
            },
        )
        assert outcome.trace.status == "ok"
        proposal_id = outcome.data["proposal_id"]
        assert outcome.actions[0].action == "capture_draft"
    finally:
        db.close()

    confirm = client.post(
        f"/api/v1/actions/{proposal_id}/confirm", json={"approved": True}, headers=auth
    )
    assert confirm.status_code == 200, confirm.text
    assert confirm.json()["status"] == "confirmed"

    context = client.get(
        f"/api/v1/parcels/{demo_parcel['id']}/context", headers=auth
    )
    assert context.status_code == 200, context.text
    econ = context.json()["parcel"]["preferences"].get("economics", {})
    assert econ["onion"]["price_pen_kg"] == 1.5


def test_confirm_reject_leaves_data_untouched(client, auth, demo_parcel):
    from app.agent.tools import AgentTools
    from app.db.session import SessionLocal
    from app.models.entities import Parcel, User

    db = SessionLocal()
    try:
        parcel = db.get(Parcel, demo_parcel["id"])
        user = db.get(User, parcel.owner_user_id)
        tools = AgentTools(db, user, parcel)
        outcome = tools.execute(
            "propose_capture",
            {"kind": "soil", "values": {"variable": "ph", "value": 7.2}},
        )
        proposal_id = outcome.data["proposal_id"]
    finally:
        db.close()

    denied = client.post(
        f"/api/v1/actions/{proposal_id}/confirm", json={"approved": False}, headers=auth
    )
    assert denied.status_code == 200, denied.text
    assert denied.json()["status"] == "rejected"

    soil = client.get(f"/api/v1/parcels/{demo_parcel['id']}/soil", headers=auth)
    assert soil.status_code == 200, soil.text
    assert all(row["value"] != 7.2 for row in soil.json())


def test_pending_yes_confirms_without_llm(client, auth, demo_parcel):
    from app.agent.tools import AgentTools
    from app.db.session import SessionLocal
    from app.models.entities import Parcel, User

    db = SessionLocal()
    try:
        parcel = db.get(Parcel, demo_parcel["id"])
        user = db.get(User, parcel.owner_user_id)
        tools = AgentTools(db, user, parcel)
        tools.execute(
            "propose_capture",
            {"kind": "history", "values": {"crop_id": "onion"}},
        )
    finally:
        db.close()

    thread = client.post(
        "/api/v1/agent/threads", json={"parcel_id": demo_parcel["id"]}, headers=auth
    )
    thread_id = thread.json()["thread_id"]
    # The first message resolves the pending proposal via the deterministic
    # yes/no path (the proposal was created above via propose_capture). The
    # greeting is skipped because resolution happens first.
    answer = client.post(
        f"/api/v1/agent/threads/{thread_id}/messages",
        json={"message": "sí", "ui_context": {}},
        headers=auth,
    )
    assert answer.status_code == 200, answer.text
    body = answer.json()
    assert "guardado" in body["answer"].lower() or "listo" in body["answer"].lower()


def test_rank_explain_audit_price_tools(client, auth, demo_parcel):
    from app.agent.tools import AgentTools
    from app.db.session import SessionLocal
    from app.models.entities import Parcel, User

    db = SessionLocal()
    try:
        parcel = db.get(Parcel, demo_parcel["id"])
        user = db.get(User, parcel.owner_user_id)
        tools = AgentTools(db, user, parcel)

        ranked = tools.execute("rank_plans", {})
        assert ranked.trace.status == "ok"
        assert ranked.data["best_plan_id"]

        explained = tools.execute(
            "explain_plan", {"plan_id": ranked.data["best_plan_id"]}
        )
        assert explained.trace.status == "ok"
        assert explained.data["plan_id"] == ranked.data["best_plan_id"]

        audit = tools.execute("audit_parcel", {})
        assert audit.trace.status == "ok"
        assert "issues" in audit.data

        ref = tools.execute("get_catalog_price_reference", {"crop_id": "aji"})
        assert ref.trace.status == "ok"
        assert "price_pen_kg" in ref.data or "error" in ref.data

        missing = tools.execute("get_catalog_price_reference", {"crop_id": "kiwicha"})
        assert missing.trace.status in ("ok", "error")

        questions = tools.execute("get_next_questions", {})
        assert questions.trace.status == "ok"
        assert questions.data["next"] is not None
    finally:
        db.close()
