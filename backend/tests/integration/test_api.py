from __future__ import annotations


def test_health_and_ready(client):
    for path in ("/api/v1/health", "/health"):
        health = client.get(path)
        assert health.status_code == 200
        assert health.json()["status"] == "ok"

    for path in ("/api/v1/ready", "/ready"):
        ready = client.get(path)
        assert ready.status_code == 200
        body = ready.json()
        assert body["checks"]["database"] is True
        assert body["checks"]["crops"] is True
        assert body["checks"]["snapshot"] is True


def test_auth_demo_context_and_parcel(client, auth):
    me = client.get("/api/v1/auth/me", headers=auth)
    assert me.status_code == 200
    user_id = me.json()["user"]["id"]

    demo = client.post("/api/v1/demo/parcel", headers=auth)
    assert demo.status_code == 201
    parcel = demo.json()
    assert parcel["is_simulated"] is True
    assert parcel["area_ha"] == 1.2

    context = client.get(f"/api/v1/parcels/{parcel['id']}/context", headers=auth)
    assert context.status_code == 200
    body = context.json()
    assert body["parcel"]["id"] == parcel["id"]
    assert "soil_analysis" in body["missing_inputs"]

    # The demo endpoint is idempotent for the same user.
    again = client.post("/api/v1/demo/parcel", headers=auth)
    assert again.status_code == 201
    assert again.json()["id"] == parcel["id"]

    assert user_id


def test_idor_returns_404(client, auth):
    parcel = client.post("/api/v1/demo/parcel", headers=auth).json()

    other = client.post(
        "/api/v1/auth/anonymous",
        json={"display_name": "Other", "consent_version": "v1"},
    )
    assert other.status_code == 201
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    response = client.get(f"/api/v1/parcels/{parcel['id']}", headers=other_headers)
    assert response.status_code == 404


def test_comparison_scenario_and_idempotency(client, auth):
    parcel = client.post("/api/v1/demo/parcel", headers=auth).json()
    body = {"parcel_id": parcel["id"]}
    headers = {**auth, "Idempotency-Key": "test-key-1"}

    first = client.post("/api/v1/comparisons", json=body, headers=headers)
    assert first.status_code == 201, first.text
    comparison = first.json()
    assert len(comparison["plans"]) == 3
    assert {p["kind"] for p in comparison["plans"]} == {"existing", "candidate"}
    assert comparison["source_snapshots"]

    second = client.post("/api/v1/comparisons", json=body, headers=headers)
    assert second.status_code == 201
    assert second.json()["comparison_id"] == comparison["comparison_id"]

    scenario = client.post(
        f"/api/v1/comparisons/{comparison['comparison_id']}/simulate",
        json={"water_multiplier": 0.8, "price_multiplier": 0.85},
        headers=auth,
    )
    assert scenario.status_code == 200, scenario.text
    assert scenario.json()["scenario_type"] == "hypothetical"
    assert scenario.json()["comparison_id"] != comparison["comparison_id"]


def test_agent_comparison_and_save_flow(client, auth):
    parcel = client.post("/api/v1/demo/parcel", headers=auth).json()
    thread = client.post("/api/v1/agent/threads", json={"parcel_id": parcel["id"]}, headers=auth)
    assert thread.status_code == 201, thread.text
    thread_id = thread.json()["thread_id"]

    message = client.post(
        f"/api/v1/agent/threads/{thread_id}/messages",
        json={"message": "Compara rotaciones que usen menos agua"},
        headers=auth,
    )
    assert message.status_code == 200, message.text
    body = message.json()
    assert body["answer"]
    assert body["tool_trace"]
    assert body["ui_actions"][0]["action"] == "open_comparison"

    save = client.post(
        f"/api/v1/agent/threads/{thread_id}/messages",
        json={"message": "Guardar un borrador"},
        headers=auth,
    )
    assert save.status_code == 200, save.text
    action = save.json()["ui_actions"][0]
    assert action["action"] == "save_plan_draft"
    proposal_id = action["payload"]["proposal_id"]

    confirmed = client.post(
        f"/api/v1/actions/{proposal_id}/confirm",
        json={"approved": True},
        headers=auth,
    )
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["status"] == "confirmed"

    saved = client.get("/api/v1/saved-plans", headers=auth)
    assert saved.status_code == 200
    assert len(saved.json()) == 1
    assert saved.json()[0]["status"] == "draft"
