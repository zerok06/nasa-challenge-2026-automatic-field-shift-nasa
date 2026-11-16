from __future__ import annotations

import time
from datetime import date, datetime, timezone
from typing import Any

import httpx

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
FORECAST_TTL_SECONDS = 30 * 60
_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}


class ForecastUnavailable(RuntimeError):
    """Open-Meteo did not return a usable forecast for this point."""


def _number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return round(float(value), 1)
    except (TypeError, ValueError):
        return None


def _get_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    response = httpx.get(url, params=params, timeout=12.0)
    response.raise_for_status()
    return response.json()


def fetch_forecast(
    lat: float,
    lon: float,
    *,
    days: int = 7,
    use_cache: bool = True,
) -> dict[str, Any]:
    """Fetch a real daily forecast from Open-Meteo.

    The returned series is only reference evapotranspiration. Crop demand is
    deliberately not invented here because the active crop may be unknown.
    """
    cache_key = f"{lat:.3f},{lon:.3f},{date.today().isoformat()},{days}"
    now = time.monotonic()
    if use_cache and cache_key in _CACHE:
        cached_at, payload = _CACHE[cache_key]
        if now - cached_at < FORECAST_TTL_SECONDS:
            return payload

    try:
        body = _get_json(
            OPEN_METEO_FORECAST_URL,
            {
                "latitude": round(lat, 5),
                "longitude": round(lon, 5),
                "daily": (
                    "precipitation_sum,et0_fao_evapotranspiration,"
                    "temperature_2m_max,temperature_2m_min"
                ),
                "timezone": "auto",
                "forecast_days": days,
            },
        )
    except Exception as exc:  # noqa: BLE001 - surfaced as a typed domain error
        raise ForecastUnavailable("No se pudo consultar Open-Meteo") from exc

    daily = body.get("daily") or {}
    dates = daily.get("time") or []
    rain = daily.get("precipitation_sum") or []
    et0 = daily.get("et0_fao_evapotranspiration") or []
    tmax = daily.get("temperature_2m_max") or []
    tmin = daily.get("temperature_2m_min") or []

    records: list[dict[str, Any]] = []
    for index, raw_date in enumerate(dates[:days]):
        records.append(
            {
                "date": str(raw_date),
                "precip_mm": _number(rain[index] if index < len(rain) else None),
                "et0_mm": _number(et0[index] if index < len(et0) else None),
                "tmax_c": _number(tmax[index] if index < len(tmax) else None),
                "tmin_c": _number(tmin[index] if index < len(tmin) else None),
            }
        )

    if not records:
        raise ForecastUnavailable("Open-Meteo devolvió un pronóstico vacío")

    payload = {
        "provider": "Open-Meteo",
        "dataset": "Open-Meteo forecast (ECMWF/GFS blend)",
        "url": "https://open-meteo.com/",
        "license": "CC BY 4.0",
        "timezone": body.get("timezone"),
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "days": records,
    }
    if use_cache:
        _CACHE[cache_key] = (now, payload)
    return payload
