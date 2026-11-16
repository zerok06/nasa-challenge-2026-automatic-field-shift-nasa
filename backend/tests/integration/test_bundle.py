from __future__ import annotations

import hashlib

from fastapi.testclient import TestClient


def test_bundle_has_integrity_and_catalog(client: TestClient, auth, demo_parcel) -> None:
    response = client.post(
        f"/api/v1/parcels/{demo_parcel['id']}/bundle",
        params={"live": "false"},
        headers=auth,
    )
    assert response.status_code == 200, response.text
    header_checksum = response.headers["x-bundle-checksum"]
    assert header_checksum == hashlib.sha256(response.content).hexdigest()
    assert int(response.headers["x-bundle-size"]) == len(response.content)

    body = response.json()
    assert body["parcel_id"] == demo_parcel["id"]
    assert body["engine_version"]
    assert body["expires_at"] > body["created_at"]
    assert body["catalog"]["review_status"] == "needs_review"
    assert len(body["catalog"]["crops"]) >= 3
    assert body["catalog"]["prices_chacra_2025"]
    assert {"cultivo_id", "precio_chacra", "periodo", "fuente_id", "estado"} <= set(
        body["catalog"]["prices_chacra_2025"][0]
    )
    assert any(
        row.get("crop_id") for row in body["catalog"]["prices_chacra_2025"]
    )
    assert len(body["comparison"]["plans"]) == 3
    assert body["integrity"]["algorithm"] == "sha256"


def test_bundle_requires_auth(client: TestClient, demo_parcel) -> None:
    response = client.post(f"/api/v1/parcels/{demo_parcel['id']}/bundle")
    assert response.status_code == 401
