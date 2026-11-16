from __future__ import annotations

from datetime import date, timedelta
from typing import Any


def _fake_power(
    lat: float,
    lon: float,
    start: date,
    end: date,
) -> dict[str, Any]:
    records = []
    current = start
    while current <= end:
        records.append(
            {
                "date": current.isoformat(),
                "eto_mm": 4.2,
                "precip_mm": 0.8,
                "tmin_c": 5.0,
                "tmax_c": 18.0,
            }
        )
        current += timedelta(days=1)
    return {
        "snapshot_id": "power_test_2025",
        "method": "power_daily_hargreaves",
        "is_simulated": False,
        "period_start": start,
        "period_end": end,
        "records": records,
        "missing_days": 0,
        "source": {
            "provider": "NASA",
            "dataset": "POWER Daily (MERRA-2)",
            "product_version": "test",
            "url": "https://power.larc.nasa.gov/",
            "license": "NASA open data",
            "resolution": "native grid / point API",
            "quality_flag": "modeled_reanalysis",
        },
    }


def _new_parcel(client, auth, *, area: float = 1.0) -> dict:
    response = client.post(
        "/api/v1/parcels",
        headers=auth,
        json={
            "name": "Parcela real",
            "geometry": {"type": "Point", "coordinates": [-70.93, -17.19]},
            "area_ha": area,
            "district": "Moquegua",
            "preferences": {"weights": {"water": 0.4, "soil": 0.3, "margin": 0.3}},
            "is_simulated": False,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_new_parcel_fetches_real_power_and_reuses_snapshot(
    client, auth, monkeypatch
):
    calls: list[tuple[float, float]] = []

    def fake_fetch(lat, lon, start, end):
        calls.append((lat, lon))
        return _fake_power(lat, lon, start, end)

    monkeypatch.setattr("app.use_cases.climate.fetch_power_daily", fake_fetch)
    parcel = _new_parcel(client, auth)

    indicators = client.get(f"/api/v1/parcels/{parcel['id']}/indicators", headers=auth)
    assert indicators.status_code == 200, indicators.text
    body = indicators.json()
    assert body["source"]["is_simulated"] is False
    assert body["indicators"]
    assert calls == [(-17.19, -70.93)]

    # The real snapshot is reused by the comparison; no second NASA call.
    comparison = client.post(
        "/api/v1/comparisons",
        headers=auth,
        json={"parcel_id": parcel["id"]},
    )
    assert comparison.status_code == 201, comparison.text
    assert calls == [(-17.19, -70.93)]
    assert comparison.json()["source_snapshots"]


def test_new_parcel_without_climate_does_not_invent_a_comparison(
    client, auth, monkeypatch
):
    def failing_fetch(lat, lon, start, end):
        raise RuntimeError("NASA unavailable")

    monkeypatch.setattr("app.use_cases.climate.fetch_power_daily", failing_fetch)
    parcel = _new_parcel(client, auth)
    comparison = client.post(
        "/api/v1/comparisons",
        headers=auth,
        json={"parcel_id": parcel["id"]},
    )
    assert comparison.status_code == 503, comparison.text
    body = comparison.json()
    code = body.get("detail", body.get("error", {})).get("code")
    assert code == "climate_unavailable", body


def test_economics_are_farmer_declared_and_produce_margin(
    client, auth, monkeypatch
):
    monkeypatch.setattr(
        "app.use_cases.climate.fetch_power_daily",
        lambda lat, lon, start, end: _fake_power(lat, lon, start, end),
    )
    parcel = _new_parcel(client, auth)
    patched = client.patch(
        f"/api/v1/parcels/{parcel['id']}",
        headers=auth,
        json={
            "preferences": {
                "economics": {
                    "onion": {
                        "yield_kg_ha": 12000,
                        "price_pen_kg": 1.2,
                        "costs_pen": 9000,
                    },
                    "pumpkin": {
                        "yield_kg_ha": 15000,
                        "price_pen_kg": 0.9,
                        "costs_pen": 8000,
                    },
                    "chili": {
                        "yield_kg_ha": 8000,
                        "price_pen_kg": 2.5,
                        "costs_pen": 9500,
                    },
                },
                "price_assumption_type": "farmer",
            }
        },
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["preferences"]["price_assumption_type"] == "farmer"

    comparison = client.post(
        "/api/v1/comparisons",
        headers=auth,
        json={"parcel_id": parcel["id"]},
    )
    assert comparison.status_code == 201, comparison.text
    margins = [plan["economics"]["margin_pen"] for plan in comparison.json()["plans"]]
    assert any(margin is not None for margin in margins)
    assert any(margin is None for margin in margins)
    assert comparison.json()["plans"][0]["economics"]["price_assumption_type"] == "farmer"

def test_partial_economics_returns_null_margin_without_500(
    client, auth, monkeypatch
):
    monkeypatch.setattr(
        "app.use_cases.climate.fetch_power_daily",
        lambda lat, lon, start, end: _fake_power(lat, lon, start, end),
    )
    parcel = _new_parcel(client, auth)
    patched = client.patch(
        f"/api/v1/parcels/{parcel['id']}",
        headers=auth,
        json={
            "preferences": {
                "economics": {
                    "onion": {
                        "yield_kg_ha": None,
                        "price_pen_kg": 1.2,
                        "costs_pen": None,
                    },
                },
                "price_assumption_type": "farmer",
            }
        },
    )
    assert patched.status_code == 200, patched.text

    comparison = client.post(
        "/api/v1/comparisons",
        headers=auth,
        json={"parcel_id": parcel["id"]},
    )
    assert comparison.status_code == 201, comparison.text
    plans = comparison.json()["plans"]
    assert all(plan["economics"]["margin_pen"] is None for plan in plans)
    assert any(
        "economics.onion" in missing
        for plan in plans
        for missing in plan["economics"]["missing_inputs"]
    )
