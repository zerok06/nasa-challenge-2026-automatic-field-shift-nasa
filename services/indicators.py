from __future__ import annotations

import json
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path
from typing import Any


def load_snapshot(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as fh:
        return json.load(fh)


def monthly_indicators(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    buckets: dict[str, dict[str, list[float]]] = defaultdict(lambda: defaultdict(list))
    for record in snapshot.get("records", []):
        day = record.get("date")
        if not day:
            continue
        month = str(day)[:7]
        for key in ("precip_mm", "tmin_c", "tmax_c", "eto_mm"):
            value = record.get(key)
            if value is not None:
                buckets[month][key].append(float(value))

    out: list[dict[str, Any]] = []
    for month in sorted(buckets):
        bucket = buckets[month]
        out.append(
            {
                "month": month,
                "precip_mm": round(sum(bucket.get("precip_mm", [])), 2)
                if bucket.get("precip_mm")
                else None,
                "tmin_c": min(bucket.get("tmin_c", [])) if bucket.get("tmin_c") else None,
                "tmax_c": max(bucket.get("tmax_c", [])) if bucket.get("tmax_c") else None,
                "eto_mm": round(sum(bucket.get("eto_mm", [])), 2) if bucket.get("eto_mm") else None,
            }
        )
    return out


def indicator_rows(snapshot: dict[str, Any]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for month in monthly_indicators(snapshot):
        start = date.fromisoformat(f"{month['month']}-01")
        next_month = date(start.year + (start.month // 12), (start.month % 12) + 1, 1)
        end = next_month - timedelta(days=1)
        for key, unit in (
            ("precip_mm", "mm"),
            ("tmin_c", "C"),
            ("tmax_c", "C"),
            ("eto_mm", "mm"),
        ):
            if month.get(key) is not None:
                rows.append(
                    {
                        "indicator": key,
                        "value": month[key],
                        "unit": unit,
                        "time_start": start,
                        "time_end": end,
                        "quality_flag": "modeled_reanalysis",
                        "method": "monthly_aggregate",
                    }
                )
    return rows
