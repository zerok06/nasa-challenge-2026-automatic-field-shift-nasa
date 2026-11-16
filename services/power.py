from __future__ import annotations

from datetime import date
from typing import Any

import httpx

from services.water_engine import eto_hargreaves

POWER_DAILY_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
POWER_PARAMETERS = "PRECTOTCORR,T2M_MAX,T2M_MIN"
FILL_VALUE = -999.0


def _dates(start: date, end: date):
    current = start
    while current <= end:
        yield current
        current = date.fromordinal(current.toordinal() + 1)


def parse_power_daily(
    payload: dict[str, Any],
    *,
    lat: float,
    lon: float,
    start: date,
    end: date,
) -> dict[str, Any]:
    parameter = payload.get("properties", {}).get("parameter", {})
    precip = parameter.get("PRECTOTCORR", {})
    tmax = parameter.get("T2M_MAX", {})
    tmin = parameter.get("T2M_MIN", {})
    records: list[dict[str, Any]] = []
    missing = 0

    for day in _dates(start, end):
        key = day.strftime("%Y%m%d")
        values = (precip.get(key), tmax.get(key), tmin.get(key))
        if any(value is None or float(value) <= FILL_VALUE for value in values):
            missing += 1
            continue
        p, tx, tn = (float(value) for value in values)
        records.append(
            {
                "date": day.isoformat(),
                "precip_mm": p,
                "tmin_c": tn,
                "tmax_c": tx,
                "eto_mm": eto_hargreaves(tx, tn, lat, day),
            }
        )

    return {
        "snapshot_id": f"power_{lat:.2f}_{lon:.2f}_{start.year}".replace("-", "m"),
        "method": "power_daily_hargreaves",
        "is_simulated": False,
        "period_start": start,
        "period_end": end,
        "records": records,
        "missing_days": missing,
        "source": {
            "provider": "NASA",
            "dataset": "POWER Daily (MERRA-2)",
            "product_version": "v2.10.3",
            "url": "https://power.larc.nasa.gov/",
            "license": "NASA open data",
            "resolution": "native grid / point API",
            "quality_flag": "modeled_reanalysis",
        },
    }


def fetch_power_daily(lat: float, lon: float, start: date, end: date) -> dict[str, Any]:
    response = httpx.get(
        POWER_DAILY_URL,
        params={
            "parameters": POWER_PARAMETERS,
            "community": "AG",
            "longitude": lon,
            "latitude": lat,
            "start": start.strftime("%Y%m%d"),
            "end": end.strftime("%Y%m%d"),
            "format": "JSON",
        },
        timeout=20.0,
    )
    response.raise_for_status()
    return parse_power_daily(
        response.json(),
        lat=lat,
        lon=lon,
        start=start,
        end=end,
    )
