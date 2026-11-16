from __future__ import annotations

import math
import time
from datetime import date
from typing import Any, Callable

import httpx
from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.models.entities import User

router = APIRouter(prefix="/geo", tags=["geo"])

DISCOVERY_VERSION = "1.0.0"
CELL_SIZE = 0.5
CACHE_TTL_SECONDS = 15 * 60
_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}

POWER_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
GIBS_IMERG = (
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/"
    "IMERG_Precipitation_Rate/default/{date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png"
)
GIBS_NDVI = (
    "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/"
    "VIIRS_SNPP_L3_NDVI_Monthly/default/{date}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png"
)


def discovery_cell(lat: float, lon: float) -> tuple[float, float]:
    """Snap coordinates to a stable 0.5 degree cell for caching and sharing."""
    return (round(lat / CELL_SIZE) * CELL_SIZE, round(lon / CELL_SIZE) * CELL_SIZE)


def _power_probe(lat: float, lon: float) -> bool:
    year = date.today().year - 1
    response = httpx.get(
        POWER_URL,
        params={
            "parameters": "PRECTOTCORR,T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN",
            "community": "AG",
            "longitude": lon,
            "latitude": lat,
            "start": str(year),
            "end": str(year),
            "format": "JSON",
        },
        timeout=8.0,
    )
    response.raise_for_status()
    parameter = response.json().get("properties", {}).get("parameter", {})
    return any(key in parameter for key in ("PRECTOTCORR", "T2M_MAX"))


def _gibs_probe(url: str) -> bool:
    response = httpx.get(url, timeout=8.0)
    response.raise_for_status()
    return response.headers.get("content-type", "").startswith("image/")


def _tile(lat: float, lon: float, zoom: int = 1) -> tuple[int, int]:
    count = 2**zoom
    x = int((lon + 180.0) / 360.0 * count)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.asinh(math.tan(lat_rad)) / math.pi) / 2.0 * count)
    return max(0, min(count - 1, x)), max(0, min(count - 1, y))


def _default_live_probe(source_id: str, lat: float, lon: float) -> bool:
    if source_id == "nasa_power":
        return _power_probe(lat, lon)
    x, y = _tile(lat, lon)
    if source_id == "gibs_imerg":
        return _gibs_probe(GIBS_IMERG.format(date="2024-06-01", z=1, y=y, x=x))
    if source_id == "gibs_ndvi":
        return _gibs_probe(GIBS_NDVI.format(date="2024-06-01", z=1, y=y, x=x))
    return False


def _base_sources() -> list[dict[str, Any]]:
    return [
        {
            "id": "nasa_power",
            "label": "NASA POWER",
            "kind": "climate",
            "status": "available",
            "resolution": "native grid / point API",
            "temporal_resolution": "daily / monthly",
            "quality": "modeled_reanalysis",
            "license": "NASA open data",
            "url": "https://power.larc.nasa.gov/",
            "reason": None,
        },
        {
            "id": "gibs_imerg",
            "label": "GPM IMERG",
            "kind": "precipitation",
            "status": "available",
            "resolution": "0.1° (~11 km)",
            "temporal_resolution": "daily",
            "quality": "satellite_estimate",
            "license": "NASA open data",
            "url": "https://gibs.earthdata.nasa.gov/",
            "reason": None,
        },
        {
            "id": "gibs_ndvi",
            "label": "VIIRS NDVI",
            "kind": "vegetation",
            "status": "available",
            "resolution": "~0.5–1 km",
            "temporal_resolution": "monthly",
            "quality": "satellite_estimate",
            "license": "NASA open data",
            "url": "https://gibs.earthdata.nasa.gov/",
            "reason": None,
        },
        {
            "id": "srtm",
            "label": "SRTM elevation",
            "kind": "terrain",
            "status": "available",
            "resolution": "90 m",
            "temporal_resolution": "static",
            "quality": "measured",
            "license": "NASA open data",
            "url": "https://www.earthdata.nasa.gov/",
            "reason": None,
        },
        {
            "id": "open_meteo",
            "label": "Open-Meteo forecast",
            "kind": "forecast",
            "status": "available",
            "resolution": "~1–11 km",
            "temporal_resolution": "hourly / daily",
            "quality": "modeled_forecast",
            "license": "CC BY 4.0",
            "url": "https://open-meteo.com/",
            "reason": None,
        },
        {
            "id": "copernicus_dem",
            "label": "Copernicus DEM GLO-90",
            "kind": "terrain",
            "status": "available",
            "resolution": "90 m",
            "temporal_resolution": "static",
            "quality": "modeled",
            "license": "Copernicus DEM",
            "url": "https://open-meteo.com/en/docs/elevation-api",
            "reason": None,
        },
        {
            "id": "soil_local",
            "label": "Suelo local",
            "kind": "soil",
            "status": "unavailable",
            "resolution": None,
            "temporal_resolution": None,
            "quality": "unknown",
            "license": None,
            "url": None,
            "reason": "no_local_soil_catalog",
        },
        {
            "id": "market_local",
            "label": "Precios locales",
            "kind": "market",
            "status": "unavailable",
            "resolution": None,
            "temporal_resolution": None,
            "quality": "unknown",
            "license": None,
            "url": None,
            "reason": "no_local_price_feed",
        },
    ]


def discover_sources(
    lat: float,
    lon: float,
    *,
    live: bool = True,
    probe: Callable[[str, float, float], bool] | None = None,
    use_cache: bool = True,
) -> dict[str, Any]:
    cell_lat, cell_lon = discovery_cell(lat, lon)
    cache_key = f"{cell_lat:.1f},{cell_lon:.1f}"
    now = time.monotonic()
    if use_cache and cache_key in _CACHE:
        cached_at, payload = _CACHE[cache_key]
        if now - cached_at < CACHE_TTL_SECONDS:
            return payload

    sources = _base_sources()
    if live:
        probe_fn = probe or _default_live_probe
        for source in sources:
            if source["status"] != "available" or source["id"] not in {
                "nasa_power",
                "gibs_imerg",
                "gibs_ndvi",
            }:
                continue
            try:
                available = probe_fn(source["id"], cell_lat, cell_lon)
                if not available:
                    source["status"] = "error"
                    source["reason"] = "probe_returned_no_data"
            except Exception:
                source["status"] = "error"
                source["reason"] = "probe_failed"

    payload = {
        "discovery_version": DISCOVERY_VERSION,
        "cell": {
            "lat": cell_lat,
            "lon": cell_lon,
            "size_deg": CELL_SIZE,
        },
        "requested": {"lat": lat, "lon": lon},
        "generated_at": date.today().isoformat(),
        "sources": sources,
        "warnings": [
            "NASA layers are regional context, not a measurement of your plot.",
            "Soil and market sources require a validated local catalog.",
        ],
    }
    if use_cache:
        _CACHE[cache_key] = (now, payload)
    return payload


@router.get("/discover")
def discover(
    lat: float = Query(ge=-90, le=90),
    lon: float = Query(ge=-180, le=180),
    probe: bool = Query(default=True, description="Probe live NASA endpoints"),
    _: User = Depends(get_current_user),
) -> dict[str, Any]:
    return discover_sources(lat, lon, live=probe)
