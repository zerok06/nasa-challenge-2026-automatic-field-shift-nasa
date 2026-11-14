from __future__ import annotations

import json
import math
import random
from datetime import date, timedelta
from pathlib import Path


def build_demo_snapshot() -> dict:
    random.seed(42)
    records = []
    start = date(2024, 1, 1)
    for i in range(366):
        day = start + timedelta(days=i)
        # Semiarid highland demo pattern; labelled simulated.
        seasonal = math.sin(2 * math.pi * (day.timetuple().tm_yday - 20) / 365)
        eto = 4.2 + 1.1 * max(0, seasonal) + random.uniform(-0.5, 0.5)
        precip = max(0.0, random.gauss(0.7 + 0.6 * max(0, seasonal), 1.4))
        tmin = 6.0 + 3.0 * seasonal + random.uniform(-1.5, 1.5)
        tmax = tmin + 12.0 + random.uniform(-1.0, 2.0)
        records.append(
            {
                "date": day.isoformat(),
                "eto_mm": round(eto, 3),
                "precip_mm": round(precip, 3),
                "tmin_c": round(tmin, 2),
                "tmax_c": round(tmax, 2),
            }
        )
    return {
        "snapshot_id": "power_moquegua_2024_demo",
        "source": "NASA POWER (demo sintético)",
        "product": "MERRA-2 / POWER Daily",
        "version": "demo-v1",
        "bbox": [-70.94, -17.20, -70.92, -17.18],
        "period": {"start": "2024-01-01", "end": "2024-12-31"},
        "retrieved_at": "2026-11-14T00:00:00Z",
        "checksum": "demo",
        "missing_pct": 0.0,
        "method": "synthetic",
        "is_simulated": True,
        "records": records,
    }


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    out = root / "datasets" / "demo" / "power_moquegua_2024.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    snapshot = build_demo_snapshot()
    out.write_text(json.dumps(snapshot, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out} ({len(snapshot['records'])} records)")


if __name__ == "__main__":
    main()
