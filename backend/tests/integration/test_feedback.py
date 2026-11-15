from __future__ import annotations


def test_feedback_is_stored_for_owned_parcel(client, auth):
    parcel = client.post(
        "/api/v1/parcels",
        headers=auth,
        json={
            "name": "Parcela feedback",
            "geometry": {"type": "Point", "coordinates": [-70.93, -17.19]},
            "area_ha": 1.0,
            "is_simulated": False,
        },
    )
    assert parcel.status_code == 201, parcel.text
    response = client.post(
        "/api/v1/feedback",
        headers=auth,
        json={
            "parcel_id": parcel.json()["id"],
            "kind": "comparison",
            "rating": 3,
            "comment": "Entendí el agua, no la ganancia.",
            "context": {"screen": "comparison"},
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["kind"] == "comparison"
    assert body["rating"] == 3
