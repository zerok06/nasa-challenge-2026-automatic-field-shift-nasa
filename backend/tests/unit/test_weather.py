from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.use_cases import weather
from app.use_cases.weather import ForecastUnavailable, fetch_forecast


@pytest.fixture(autouse=True)
def clear_cache():
    weather._CACHE.clear()
    yield
    weather._CACHE.clear()


def test_fetch_forecast_parses_real_series(monkeypatch):
    start = date(2026, 11, 15)
    dates = [(start + timedelta(days=i)).isoformat() for i in range(7)]

    def fake_json(url, params):
        assert params["forecast_days"] == 7
        return {
            "timezone": "America/Lima",
            "daily": {
                "time": dates,
                "precipitation_sum": [0, 2.0, 0, 5.0, 0, 1.0, 0],
                "et0_fao_evapotranspiration": [4.0, 4.2, 4.4, 4.1, 4.3, 3.9, 4.0],
                "temperature_2m_max": [20] * 7,
                "temperature_2m_min": [8] * 7,
            },
        }

    monkeypatch.setattr(weather, "_get_json", fake_json)
    payload = fetch_forecast(-17.19, -70.93, days=7)

    assert payload["provider"] == "Open-Meteo"
    assert len(payload["days"]) == 7
    assert payload["days"][1]["precip_mm"] == 2.0
    assert payload["days"][1]["et0_mm"] == 4.2
    assert payload["timezone"] == "America/Lima"


def test_fetch_forecast_fails_honestly(monkeypatch):
    def failing_json(url, params):
        raise RuntimeError("network down")

    monkeypatch.setattr(weather, "_get_json", failing_json)
    with pytest.raises(ForecastUnavailable):
        fetch_forecast(-17.19, -70.93)


def test_fetch_forecast_rejects_empty_series(monkeypatch):
    monkeypatch.setattr(
        weather,
        "_get_json",
        lambda url, params: {"daily": {"time": []}},
    )
    with pytest.raises(ForecastUnavailable):
        fetch_forecast(-17.19, -70.93)
