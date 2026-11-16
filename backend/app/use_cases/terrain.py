from __future__ import annotations

import math
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.models.entities import Parcel
from app.use_cases.context import parcel_geometry

SRTM_URL = "https://api.opentopodata.org/v1/srtm90m"
OPEN_METEO_ELEVATION_URL = "https://api.open-meteo.com/v1/elevation"
TERRAIN_TTL_DAYS = 180
_SAMPLE_STEP_DEG = 0.0008


class TerrainUnavailable(RuntimeError):
    """No elevation provider returned a usable terrain sample."""


def _center(geometry: dict[str, Any]) -> tuple[float, float]:
    coords = geometry.get("coordinates") or []
    if geometry.get("type") == "Point" and len(coords) >= 2:
        return float(coords[1]), float(coords[0])
    if geometry.get("type") == "Polygon" and coords:
        ring = coords[0]
        points = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
        if points:
            return (
                sum(float(point[1]) for point in points) / len(points),
                sum(float(point[0]) for point in points) / len(points),
            )
    raise TerrainUnavailable("La parcela no tiene coordenadas válidas")


def sample_grid(lat: float, lon: float) -> list[tuple[float, float]]:
    """Return center plus 8 neighbors at roughly 90 m spacing."""
    dlat = _SAMPLE_STEP_DEG
    dlon = dlat / max(0.2, math.cos(math.radians(lat)))
    points: list[tuple[float, float]] = []
    for row in (-1, 0, 1):
        for column in (-1, 0, 1):
            points.append((round(lat + row * dlat, 6), round(lon + column * dlon, 6)))
    return points


def _get_json(url: str, params: dict[str, Any]) -> dict[str, Any]:
    response = httpx.get(url, params=params, timeout=15.0)
    response.raise_for_status()
    return response.json()


def _srtm(lat: float, lon: float) -> dict[str, Any]:
    points = sample_grid(lat, lon)
    body = _get_json(
        SRTM_URL,
        {"locations": "|".join(f"{point[0]},{point[1]}" for point in points)},
    )
    results = body.get("results") or []
    elevations = [
        (float(item["elevation"]) if item.get("elevation") is not None else None)
        for item in results[:9]
    ]
    return _terrain_payload(
        elevations,
        source="srtm90m",
        provider="OpenTopoData / NASA SRTM",
        resolution="90 m",
        license="NASA open data",
        quality="measured",
        step_m=_SAMPLE_STEP_DEG * 111_320.0,
    )


def _copernicus(lat: float, lon: float) -> dict[str, Any]:
    points = sample_grid(lat, lon)
    body = _get_json(
        OPEN_METEO_ELEVATION_URL,
        {
            "latitude": ",".join(f"{point[0]}" for point in points),
            "longitude": ",".join(f"{point[1]}" for point in points),
        },
    )
    raw = body.get("elevation") or []
    elevations = [float(value) if value is not None else None for value in raw[:9]]
    return _terrain_payload(
        elevations,
        source="copernicus_dem_glo90",
        provider="Open-Meteo / Copernicus DEM GLO-90",
        resolution="90 m",
        license="Copernicus DEM",
        quality="modeled",
        step_m=_SAMPLE_STEP_DEG * 111_320.0,
    )


def _terrain_payload(
    elevations: list[float | None],
    *,
    source: str,
    provider: str,
    resolution: str,
    license: str,
    quality: str,
    step_m: float,
) -> dict[str, Any]:
    if len(elevations) < 9 or elevations[4] is None:
        raise TerrainUnavailable("El proveedor no devolvió la elevación del centro")

    center = float(elevations[4])
    grid = [elevations[0:3], elevations[3:6], elevations[6:9]]
    slope_pct: float | None = None
    if all(value is not None for row in grid for value in row):
        # Symmetric finite difference over two grid steps. Longitude spacing
        # is scaled by cos(latitude) in sample_grid, so both axes are in metres.
        dz_dx = (float(grid[1][2]) - float(grid[1][0])) / (2.0 * step_m)
        dz_dy = (float(grid[2][1]) - float(grid[0][1])) / (2.0 * step_m)
        slope_pct = round(math.hypot(dz_dx, dz_dy) * 100.0, 1)

    if slope_pct is None:
        slope_class = "unknown"
    elif slope_pct < 2:
        slope_class = "flat"
    elif slope_pct < 5:
        slope_class = "gentle"
    elif slope_pct < 10:
        slope_class = "moderate"
    else:
        slope_class = "steep"

    return {
        "elevation_m": round(center, 1),
        "slope_pct": slope_pct,
        "slope_class": slope_class,
        "source": source,
        "provider": provider,
        "resolution": resolution,
        "license": license,
        "quality": quality,
        "points": len(elevations),
        "sampled_at": datetime.now(timezone.utc).isoformat(),
    }


def fetch_terrain(lat: float, lon: float) -> dict[str, Any]:
    """Try real SRTM first, then openly labelled Copernicus fallback."""
    try:
        return _srtm(lat, lon)
    except Exception:  # noqa: BLE001 - provider failure is expected
        try:
            return _copernicus(lat, lon)
        except Exception as exc:  # noqa: BLE001
            raise TerrainUnavailable("No se pudo obtener elevación SRTM") from exc


def _is_fresh(value: dict[str, Any]) -> bool:
    raw = value.get("sampled_at")
    if not raw:
        return False
    try:
        sampled = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return False
    if sampled.tzinfo is None:
        sampled = sampled.replace(tzinfo=timezone.utc)
    return datetime.now(timezone.utc) - sampled < timedelta(days=TERRAIN_TTL_DAYS)


def ensure_terrain(
    db: Session,
    parcel: Parcel,
    *,
    force: bool = False,
) -> dict[str, Any] | None:
    cached = parcel.terrain_json or {}
    if not force and cached.get("elevation_m") is not None and _is_fresh(cached):
        return cached

    lat, lon = _center(parcel_geometry(db, parcel))
    try:
        terrain = fetch_terrain(lat, lon)
    except TerrainUnavailable:
        return None
    parcel.terrain_json = terrain
    db.commit()
    db.refresh(parcel)
    return terrain
