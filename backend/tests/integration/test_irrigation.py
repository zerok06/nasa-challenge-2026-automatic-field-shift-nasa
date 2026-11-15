from __future__ import annotations

from datetime import date, timedelta

from app.use_cases.weather import ForecastUnavailable


def _new_parcel(client, auth, *, area: float = 1.0) -> dict:
    response = client.post(
        "/api/v1/parcels",
        headers=auth,
        json={
            "name": "Parcela riego",
            "geometry": {"type": "Point", "coordinates": [-70.93, -17.19]},
            "area_ha": area,
            "district": "Moquegua",
            "preferences": {"weights": {"water": 0.4, "soil": 0.3, "margin": 0.3}},
            "is_simulated": False,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def _forecast(days: int = 7) -> dict:
    start = date(2026, 11, 15)
    return {
        "provider": "Open-Meteo",
        "dataset": "Open-Meteo forecast (ECMWF/GFS blend)",
        "url": "https://open-meteo.com/",
        "license": "CC BY 4.0",
        "timezone": "America/Lima",
        "retrieved_at": "2026-11-14T12:00:00+00:00",
        "days": [
            {
                "date": (start + timedelta(days=index)).isoformat(),
                "precip_mm": 0.0,
                "et0_mm": 4.0,
                "tmax_c": 20.0,
                "tmin_c": 8.0,
            }
            for index in range(days)
        ],
    }


def _terrain() -> dict:
    return {
        "elevation_m": 1420.0,
        "slope_pct": 3.2,
        "slope_class": "gentle",
        "source": "srtm90m",
        "provider": "OpenTopoData / NASA SRTM",
        "resolution": "90 m",
        "license": "NASA open data",
        "quality": "measured",
        "points": 9,
        "sampled_at": "2026-11-14T12:00:00+00:00",
    }


def test_irrigation_combines_forecast_water_and_terrain(
    client, auth, monkeypatch
):
    monkeypatch.setattr(
        "app.use_cases.irrigation.fetch_forecast",
        lambda lat, lon, days=7: _forecast(days),
    )
    monkeypatch.setattr(
        "app.use_cases.irrigation.ensure_terrain",
        lambda db, parcel, force=False: _terrain(),
    )
    parcel = _new_parcel(client, auth)
    water = client.post(
        f"/api/v1/parcels/{parcel['id']}/water",
        headers=auth,
        json={
            "start_at": "2026-11-01",
            "end_at": "2026-12-31",
            "mm": 100.0,
            "method": "estimate",
            "efficiency": 0.8,
            "confidence": "low",
        },
    )
    assert water.status_code == 201, water.text

    response = client.get(
        f"/api/v1/parcels/{parcel['id']}/irrigation",
        headers=auth,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert len(body["forecast"]) == 7
    assert body["totals"]["et0_mm"] == 28.0
    assert body["totals"]["net_demand_mm"] == 28.0
    assert body["water"]["available_mm"] == 100.0
    assert body["water_status"] == "water_sufficient"
    assert body["terrain"]["source"] == "srtm90m"
    assert "irrigation_needed" in body["advice"]
    assert body["is_simulated"] is False


def test_irrigation_keeps_missing_water_as_unknown(
    client, auth, monkeypatch
):
    monkeypatch.setattr(
        "app.use_cases.irrigation.fetch_forecast",
        lambda lat, lon, days=7: _forecast(days),
    )
    monkeypatch.setattr(
        "app.use_cases.irrigation.ensure_terrain",
        lambda db, parcel, force=False: None,
    )
    parcel = _new_parcel(client, auth)

    response = client.get(
        f"/api/v1/parcels/{parcel['id']}/irrigation",
        headers=auth,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["water"] is None
    assert body["water_status"] == "water_unknown"
    assert body["terrain"] is None
    assert "water_unknown" in body["advice"]
    assert "terrain_unavailable" in body["advice"]


def test_irrigation_fails_when_forecast_is_unavailable(
    client, auth, monkeypatch
):
    def failing_forecast(lat, lon, days=7):
        raise ForecastUnavailable("down")

    monkeypatch.setattr(
        "app.use_cases.irrigation.fetch_forecast",
        failing_forecast,
    )
    parcel = _new_parcel(client, auth)

    response = client.get(
        f"/api/v1/parcels/{parcel['id']}/irrigation",
        headers=auth,
    )
    assert response.status_code == 503, response.text
    body = response.json()
    code = body.get("detail", body.get("error", {})).get("code")
    assert code == "forecast_unavailable"
