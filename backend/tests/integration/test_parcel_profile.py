from __future__ import annotations


def test_preferences_patch_merges_without_losing_economics(client, auth, demo_parcel):
    parcel_id = demo_parcel["id"]
    before = client.get(f"/api/v1/parcels/{parcel_id}", headers=auth).json()
    assert before["preferences"].get("economics")

    patched = client.patch(
        f"/api/v1/parcels/{parcel_id}",
        headers=auth,
        json={
            "preferences": {
                "priorities": {"water": 3, "soil": 2, "margin": 1},
                "constraints": {"labor": "limited"},
            }
        },
    )
    assert patched.status_code == 200, patched.text
    preferences = patched.json()["preferences"]
    assert preferences["priorities"] == {"water": 3, "soil": 2, "margin": 1}
    assert preferences["constraints"] == {"labor": "limited"}
    assert preferences["economics"] == before["preferences"]["economics"]
    assert preferences["price_assumption_type"] == before["preferences"]["price_assumption_type"]


def test_parcel_history_water_and_soil_feed_context(client, auth, demo_parcel):
    parcel_id = demo_parcel["id"]

    history = client.post(
        f"/api/v1/parcels/{parcel_id}/crop-history",
        headers=auth,
        json={
            "crop_id": "onion",
            "family": "Amaryllidaceae",
            "date_start": "2025-06-01",
            "date_end": "2025-11-01",
            "notes": "Campaña anterior",
            "source": "farmer",
        },
    )
    assert history.status_code == 201, history.text

    water = client.post(
        f"/api/v1/parcels/{parcel_id}/water",
        headers=auth,
        json={
            "start_at": "2025-01-01",
            "end_at": "2025-12-31",
            "mm": 300,
            "method": "estimate",
            "efficiency": 0.6,
            "confidence": "low",
        },
    )
    assert water.status_code == 201, water.text

    soil = client.post(
        f"/api/v1/parcels/{parcel_id}/soil",
        headers=auth,
        json={
            "variable": "ph",
            "value": 7.2,
            "unit": "pH",
            "method": "lab",
            "source": "farmer",
        },
    )
    assert soil.status_code == 201, soil.text

    context = client.get(f"/api/v1/parcels/{parcel_id}/context", headers=auth)
    assert context.status_code == 200, context.text
    body = context.json()
    assert body["history"]
    assert body["water"]
    assert body["soil"]
    assert "soil_analysis" not in body["missing_inputs"]
    assert body["completeness"]["water"] == "ready"
