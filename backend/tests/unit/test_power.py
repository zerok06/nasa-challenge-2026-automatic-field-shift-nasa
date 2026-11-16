from __future__ import annotations

from datetime import date

from services.power import parse_power_daily


def test_parse_power_daily_skips_fill_values() -> None:
    payload = {
        "properties": {
            "parameter": {
                "PRECTOTCORR": {"20250101": 0.4, "20250102": -999.0},
                "T2M_MAX": {"20250101": 24.0, "20250102": 23.0},
                "T2M_MIN": {"20250101": 12.0, "20250102": 11.0},
            }
        }
    }
    result = parse_power_daily(
        payload,
        lat=-17.19,
        lon=-70.93,
        start=date(2025, 1, 1),
        end=date(2025, 1, 2),
    )
    assert result["is_simulated"] is False
    assert result["missing_days"] == 1
    assert len(result["records"]) == 1
    record = result["records"][0]
    assert record["date"] == "2025-01-01"
    assert record["precip_mm"] == 0.4
    assert record["eto_mm"] is not None and record["eto_mm"] >= 0
    assert result["snapshot_id"].startswith("power_")
