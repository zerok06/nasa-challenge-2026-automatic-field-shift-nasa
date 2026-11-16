from __future__ import annotations


def _comparison(client, auth, parcel_id):
    response = client.post(
        "/api/v1/comparisons",
        json={"parcel_id": parcel_id},
        headers=auth,
    )
    assert response.status_code == 201, response.text
    return response.json()


def _save(client, auth, comparison, preferred, fallback):
    response = client.post(
        "/api/v1/saved-plans",
        json={
            "parcel_id": comparison["parcel_id"],
            "comparison_id": comparison["comparison_id"],
            "preferred_plan_id": preferred["plan_id"],
            "fallback_plan_id": fallback["plan_id"],
            "name": "Campaña de prueba",
        },
        headers=auth,
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_save_plan_with_fallback_and_review_unchanged(client, auth):
    parcel = client.post("/api/v1/demo/parcel", headers=auth).json()
    comparison = _comparison(client, auth, parcel["id"])
    preferred, fallback = comparison["plans"][0], comparison["plans"][1]

    saved = _save(client, auth, comparison, preferred, fallback)
    assert saved["status"] == "saved"
    assert saved["comparison_id"] == comparison["comparison_id"]
    assert saved["preferred_plan_id"] == preferred["plan_id"]
    assert saved["fallback_plan_id"] == fallback["plan_id"]
    assert saved["preferred"]["crop_sequence"] == preferred["crop_sequence"]
    assert saved["fallback"]["crop_sequence"] == fallback["crop_sequence"]
    assert saved["thresholds"]["available_mm"] == preferred["water"]["available_mm"]

    listed = client.get("/api/v1/saved-plans", headers=auth)
    assert listed.status_code == 200
    assert any(row["id"] == saved["id"] for row in listed.json())

    review = client.get(
        f"/api/v1/saved-plans/{saved['id']}/review",
        params={"comparison_id": comparison["comparison_id"]},
        headers=auth,
    )
    assert review.status_code == 200, review.text
    body = review.json()
    assert body["changed"] is False
    assert body["alerts"] == []
    assert body["current_preferred"]["crop_sequence"] == preferred["crop_sequence"]


def test_review_flags_water_drop(client, auth):
    parcel = client.post("/api/v1/demo/parcel", headers=auth).json()
    comparison = _comparison(client, auth, parcel["id"])
    saved = _save(client, auth, comparison, comparison["plans"][0], comparison["plans"][1])

    scenario = client.post(
        f"/api/v1/comparisons/{comparison['comparison_id']}/simulate",
        json={"water_multiplier": 0.8, "price_multiplier": 1},
        headers=auth,
    )
    assert scenario.status_code == 200, scenario.text

    review = client.get(
        f"/api/v1/saved-plans/{saved['id']}/review",
        params={"comparison_id": scenario.json()["comparison_id"]},
        headers=auth,
    )
    assert review.status_code == 200, review.text
    body = review.json()
    assert body["changed"] is True
    codes = {alert["code"] for alert in body["alerts"]}
    assert "water_below_saved" in codes or "deficit_appeared" in codes


def test_review_recomputes_without_comparison_id(client, auth):
    parcel = client.post("/api/v1/demo/parcel", headers=auth).json()
    comparison = _comparison(client, auth, parcel["id"])
    saved = _save(client, auth, comparison, comparison["plans"][0], comparison["plans"][1])

    review = client.get(
        f"/api/v1/saved-plans/{saved['id']}/review",
        headers=auth,
    )
    assert review.status_code == 200, review.text
    body = review.json()
    assert body["current_preferred"] is not None
    assert body["alerts"] == []


def test_save_plan_rejects_same_fallback(client, auth):
    parcel = client.post("/api/v1/demo/parcel", headers=auth).json()
    comparison = _comparison(client, auth, parcel["id"])
    plan = comparison["plans"][0]

    response = client.post(
        "/api/v1/saved-plans",
        json={
            "parcel_id": comparison["parcel_id"],
            "comparison_id": comparison["comparison_id"],
            "preferred_plan_id": plan["plan_id"],
            "fallback_plan_id": plan["plan_id"],
            "name": "Inválido",
        },
        headers=auth,
    )
    assert response.status_code == 422


def test_save_plan_rejects_foreign_plan(client, auth):
    parcel = client.post("/api/v1/demo/parcel", headers=auth).json()
    comparison = _comparison(client, auth, parcel["id"])

    response = client.post(
        "/api/v1/saved-plans",
        json={
            "parcel_id": comparison["parcel_id"],
            "comparison_id": comparison["comparison_id"],
            "preferred_plan_id": "not-a-plan",
            "name": "Inválido",
        },
        headers=auth,
    )
    assert response.status_code == 422


def test_save_plan_is_scoped_to_owner(client, auth):
    parcel = client.post("/api/v1/demo/parcel", headers=auth).json()
    comparison = _comparison(client, auth, parcel["id"])
    saved = _save(client, auth, comparison, comparison["plans"][0], comparison["plans"][1])

    other = client.post(
        "/api/v1/auth/anonymous",
        json={"display_name": "Otra persona", "consent_version": "v1"},
    )
    assert other.status_code == 201
    other_headers = {"Authorization": f"Bearer {other.json()['access_token']}"}

    response = client.get(
        f"/api/v1/saved-plans/{saved['id']}/review",
        headers=other_headers,
    )
    assert response.status_code == 404
