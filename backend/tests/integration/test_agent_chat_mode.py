from __future__ import annotations

from app.agent.runtime import _capture_preview


def test_chat_mode_greeting_is_conversational_and_proposes_nothing(client, auth, demo_parcel):
    """Web chat opens with a real sentence, not the guided capture proposal."""
    thread = client.post(
        "/api/v1/agent/threads", json={"parcel_id": demo_parcel["id"]}, headers=auth
    )
    assert thread.status_code == 201, thread.text
    thread_id = thread.json()["thread_id"]

    response = client.post(
        f"/api/v1/agent/threads/{thread_id}/messages",
        json={"message": "Hola, ¿qué puedes hacer por mí?", "mode": "chat"},
        headers=auth,
    )
    assert response.status_code == 200, response.text
    body = response.json()

    # Freer opening: answers the question, names what it can save and reminds
    # the farmer that nothing is stored without confirmation.
    assert "Anden" in body["answer"]
    assert "confirmes" in body["answer"]
    assert body["pending_proposal_id"] is None
    assert body["save_preview"] == []


def test_guided_mode_still_creates_the_soft_proposal(client, auth, demo_parcel):
    thread = client.post(
        "/api/v1/agent/threads", json={"parcel_id": demo_parcel["id"]}, headers=auth
    )
    thread_id = thread.json()["thread_id"]

    response = client.post(
        f"/api/v1/agent/threads/{thread_id}/messages",
        json={"message": "Hola", "mode": "guided"},
        headers=auth,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["pending_proposal_id"] is not None
    assert body["save_preview"], "guided capture must tell what it will save"


def test_agent_explains_what_it_stores(client, auth, demo_parcel):
    thread = client.post(
        "/api/v1/agent/threads", json={"parcel_id": demo_parcel["id"]}, headers=auth
    )
    thread_id = thread.json()["thread_id"]
    client.post(
        f"/api/v1/agent/threads/{thread_id}/messages",
        json={"message": "Hola", "mode": "chat"},
        headers=auth,
    )
    response = client.post(
        f"/api/v1/agent/threads/{thread_id}/messages",
        json={"message": "¿Qué guardas de mis datos?", "mode": "chat"},
        headers=auth,
    )
    assert response.status_code == 200, response.text
    answer = response.json()["answer"]
    assert "declaras" in answer
    assert "confirmación" in answer or "confirmes" in answer


def test_capture_preview_uses_only_given_values():
    assert _capture_preview(
        "economics", {"crop_id": "onion", "price_pen_kg": 1.2, "costs_pen": 9000}
    ) == ["Precio de cebolla: S/ 1.20 / kg", "Costo de cebolla: S/ 9,000"]
    assert _capture_preview("water", {"mm": 1200}) == ["Agua disponible: 1200 mm"]
    assert _capture_preview("soil", {"variable": "ph", "value": 7.2}) == ["pH del suelo: 7.2"]
    # Nothing invented when the value is absent.
    assert _capture_preview("soil", {"variable": "ph", "value": None}) == [
        "pH del suelo: sin análisis (declarado)"
    ]
