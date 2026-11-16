from __future__ import annotations


def test_catalog_exposes_editable_price_reference_per_crop(client):
    response = client.get("/api/v1/catalog/crops?district=Moquegua")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["prices_chacra_2025"]
    crops = {crop["id"]: crop for crop in body["crops"]}
    # The district lookup finds the 2025 row for these crops.
    for crop_id in ("onion", "pumpkin", "chili", "potato"):
        reference = crops[crop_id]["price_reference"]
        assert reference is not None, crop_id
        assert reference["price_pen_kg"] > 0
        assert reference["year"]
        assert reference["source_id"]
        assert reference["editable_assumption"] is True
    # A district outside the crop's province still gets an editable value,
    # explicitly marked as non-local instead of pretending it is the district.
    regional_response = client.get("/api/v1/catalog/crops?district=Ilo")
    regional_crops = {
        crop["id"]: crop.get("price_reference") for crop in regional_response.json()["crops"]
    }
    regional = [
        reference
        for reference in regional_crops.values()
        if reference and reference.get("is_local") is False
    ]
    assert regional, "expected at least one regional fallback"
    assert all(item["scope"] in {"departamento", "historico"} for item in regional)


def test_price_intent_quotes_catalog_and_offers_the_editor(client, auth, demo_parcel):
    thread = client.post(
        "/api/v1/agent/threads", json={"parcel_id": demo_parcel["id"]}, headers=auth
    )
    thread_id = thread.json()["thread_id"]
    # First turn is the greeting; the price question comes next.
    client.post(
        f"/api/v1/agent/threads/{thread_id}/messages",
        json={"message": "Hola", "mode": "chat"},
        headers=auth,
    )
    response = client.post(
        f"/api/v1/agent/threads/{thread_id}/messages",
        json={"message": "¿A cómo está el ají?", "mode": "chat"},
        headers=auth,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert "S/" in body["answer"]
    assert "ají" in body["answer"].lower() or "aji" in body["answer"].lower()
    # ReAct trace: observation first, then the catalog lookup.
    tools = [trace["tool"] for trace in body["tool_trace"]]
    assert tools[0] == "get_parcel_context"
    assert "get_catalog_price_reference" in tools
    assert [trace["step"] for trace in body["tool_trace"]] == list(
        range(1, len(body["tool_trace"]) + 1)
    )
    # The farmer is taken to the price editor with the crop preselected.
    actions = [action for action in body["ui_actions"] if action["action"] == "open_screen"]
    assert actions, body["ui_actions"]
    assert "crop=" in actions[0]["payload"]["path"]
    assert "guiado=1" in actions[0]["payload"]["path"]


def test_recommendation_includes_catalog_prices(client, auth, demo_parcel):
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
        json={"message": "Compara rotaciones que usen menos agua", "mode": "chat"},
        headers=auth,
    )
    assert response.status_code == 200, response.text
    answer = response.json()["answer"]
    assert "Precio de referencia" in answer
    assert "S/" in answer
