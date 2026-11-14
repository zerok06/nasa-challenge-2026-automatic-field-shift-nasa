from __future__ import annotations

from datetime import date
from math import acos, cos, exp, log, pi, radians, sin, sqrt, tan

from services.results import WaterResultOut

METHOD_VERSION = "water-v0.1"


def _ra_mj(lat_deg: float, day_of_year: int) -> float:
    lat = radians(lat_deg)
    dr = 1 + 0.033 * cos(2 * pi / 365 * day_of_year)
    decl = 0.409 * sin(2 * pi / 365 * day_of_year - 1.39)
    x = -tan(lat) * tan(decl)
    x = max(-1.0, min(1.0, x))
    ws = acos(x)
    ra = (
        (24 * 60 / pi)
        * 0.0820
        * dr
        * (ws * sin(lat) * sin(decl) + cos(lat) * cos(decl) * sin(ws))
    )
    return max(0.0, ra)


def eto_hargreaves(tmax_c: float, tmin_c: float, lat: float, day: date) -> float:
    tmean = (tmax_c + tmin_c) / 2
    ra_mm = _ra_mj(lat, day.timetuple().tm_yday) * 0.408
    eto = 0.0023 * (tmean + 17.8) * sqrt(max(0.0, tmax_c - tmin_c)) * ra_mm
    return max(0.0, round(eto, 3))


def eto_fao56(
    tmax_c: float,
    tmin_c: float,
    rh_pct: float,
    ws_ms: float,
    rs_mj: float,
    lat: float,
    elev_m: float,
    day: date,
) -> float:
    """FAO-56 Penman-Monteith, daily. Falls back to Hargreaves on bad inputs."""
    if rs_mj <= 0 or rh_pct <= 0 or ws_ms < 0:
        return eto_hargreaves(tmax_c, tmin_c, lat, day)

    tmean = (tmax_c + tmin_c) / 2
    es = 0.6108 * exp(17.27 * tmean / (tmean + 237.3))
    ea = es * rh_pct / 100
    delta = 4098 * es / ((tmean + 237.3) ** 2)
    pressure = 101.3 * ((293 - 0.0065 * elev_m) / 293) ** 5.26
    gamma = 0.000665 * pressure

    ra = _ra_mj(lat, day.timetuple().tm_yday)
    rs0 = (0.75 + 2e-5 * elev_m) * ra
    cloud = 1.35 * (rs_mj / rs0) - 0.35 if rs0 > 0 else 0.0
    cloud = max(0.05, min(1.0, cloud))
    rnl = (
        4.903e-9
        * (((tmax_c + 273.16) ** 4 + (tmin_c + 273.16) ** 4) / 2)
        * (0.34 - 0.14 * sqrt(max(ea, 0)))
        * cloud
    )
    rn = 0.77 * rs_mj - rnl
    u2 = max(0.0, ws_ms)
    numerator = 0.408 * delta * rn + gamma * (900 / (tmean + 273)) * u2 * (es - ea)
    denominator = delta + gamma * (1 + 0.34 * u2)
    eto = max(0.0, numerator / denominator) if denominator > 0 else 0.0
    return round(eto, 3)


def effective_rain(precip_mm: float) -> float:
    """USDA-SCS simplified effective rainfall (mm)."""
    p = max(0.0, precip_mm)
    if p <= 250:
        pe = p * (125 - 0.2 * p) / 125
    else:
        pe = 125 + 0.1 * p
    return round(min(p, max(0.0, pe)), 3)


def etc_from_stages(stages: list[dict], eto_mm_day: float | list[float]) -> float | None:
    if not stages:
        return None
    total = 0.0
    day_index = 0
    for stage in stages:
        days = int(stage.get("days", 0))
        kc = stage.get("kc")
        if kc is None or days <= 0:
            return None
        for _ in range(days):
            if isinstance(eto_mm_day, list):
                if not eto_mm_day:
                    return None
                eto = eto_mm_day[min(day_index, len(eto_mm_day) - 1)]
            else:
                eto = eto_mm_day
            total += float(kc) * float(eto)
            day_index += 1
    return round(total, 3)


def available_mm(area_ha: float | None, volume_m3: float | None, mm: float | None) -> float | None:
    if mm is not None:
        return round(float(mm), 3)
    if area_ha and volume_m3 is not None and area_ha > 0:
        return round(float(volume_m3) / (float(area_ha) * 10), 3)
    return None


def water_balance(
    etc_mm: float | None,
    rain_effective_mm: float | None,
    available: float | None,
    efficiency: float | None,
    area_ha: float | None,
    volume_m3: float | None,
) -> WaterResultOut:
    missing: list[str] = []
    assumptions: list[str] = []

    if etc_mm is None:
        missing.append("etc_mm")
    if rain_effective_mm is None:
        missing.append("rain_effective_mm")
    if available is None:
        available = available_mm(area_ha, volume_m3, None)
    if available is None:
        missing.append("water_available")
    if efficiency is None:
        efficiency = 0.7
        assumptions.append("Eficiencia de riego 0.7 asumida; confirmar con el agricultor.")
    if efficiency <= 0 or efficiency > 1:
        efficiency = 0.7
        assumptions.append("Eficiencia fuera de rango; se usó 0.7.")

    if etc_mm is None or rain_effective_mm is None:
        return WaterResultOut(
            net_irrigation_mm=None,
            gross_irrigation_mm=None,
            deficit_mm=None,
            available_mm=available,
            feasibility="unknown",
            missing_inputs=sorted(set(missing)),
            assumptions=assumptions,
            method_version=METHOD_VERSION,
        )

    net = max(0.0, etc_mm - rain_effective_mm)
    gross = net / efficiency
    deficit = max(0.0, gross - available) if available is not None else None
    if available is None:
        feasibility = "unknown"
    elif deficit is not None and deficit <= 0:
        feasibility = "sufficient"
    else:
        feasibility = "deficit"

    return WaterResultOut(
        net_irrigation_mm=round(net, 3),
        gross_irrigation_mm=round(gross, 3),
        deficit_mm=round(deficit, 3) if deficit is not None else None,
        available_mm=available,
        feasibility=feasibility,
        missing_inputs=sorted(set(missing)),
        assumptions=assumptions,
        method_version=METHOD_VERSION,
    )
