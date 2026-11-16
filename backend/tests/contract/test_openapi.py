from __future__ import annotations


def test_openapi_contract(client):
    response = client.get("/api/v1/openapi.json")
    assert response.status_code == 200
    spec = response.json()
    paths = spec["paths"]
    for path in [
        "/api/v1/health",
        "/api/v1/ready",
        "/api/v1/auth/anonymous",
        "/api/v1/auth/me",
        "/api/v1/parcels",
        "/api/v1/parcels/{parcel_id}/context",
        "/api/v1/catalog/crops",
        "/api/v1/comparisons",
        "/api/v1/comparisons/{comparison_id}/simulate",
        "/api/v1/agent/threads",
        "/api/v1/actions/{proposal_id}/confirm",
        "/api/v1/saved-plans",
        "/api/v1/saved-plans/{saved_plan_id}/review",
        "/api/v1/sources/{snapshot_id}",
    ]:
        assert path in paths, path

    catalog = client.get("/api/v1/catalog/crops")
    assert catalog.status_code == 200
    assert catalog.json()["prices_chacra_2025"]
    assert any(row.get("crop_id") for row in catalog.json()["prices_chacra_2025"])

    comparison_schema = spec["components"]["schemas"]["ComparisonOut"]
    assert "plans" in comparison_schema["properties"]
    assert "source_snapshots" in comparison_schema["properties"]
