from __future__ import annotations

from fastapi.testclient import TestClient


def test_discover_requires_auth(client: TestClient) -> None:
    response = client.get("/api/v1/geo/discover", params={"lat": -17.19, "lon": -70.93})
    assert response.status_code == 401


def test_discover_returns_sources(client: TestClient, auth) -> None:
    response = client.get(
        "/api/v1/geo/discover",
        params={"lat": -17.19, "lon": -70.93, "probe": "false"},
        headers=auth,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["cell"]["lat"] == -17.0
    assert body["cell"]["lon"] == -71.0
    ids = {source["id"] for source in body["sources"]}
    assert {"nasa_power", "gibs_imerg", "gibs_ndvi", "soil_local"} <= ids
    soil = next(source for source in body["sources"] if source["id"] == "soil_local")
    assert soil["status"] == "unavailable"
    assert soil["reason"] == "no_local_soil_catalog"
