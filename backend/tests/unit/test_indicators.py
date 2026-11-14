from __future__ import annotations

from services.indicators import indicator_rows, monthly_indicators


def test_monthly_indicators_aggregate():
    snapshot = {
        "records": [
            {"date": "2024-01-01", "precip_mm": 1.0, "tmin_c": 5, "tmax_c": 18, "eto_mm": 4.0},
            {"date": "2024-01-02", "precip_mm": 2.0, "tmin_c": 4, "tmax_c": 19, "eto_mm": 4.5},
            {"date": "2024-02-01", "precip_mm": 0.0, "tmin_c": 6, "tmax_c": 20, "eto_mm": 4.2},
        ]
    }
    months = monthly_indicators(snapshot)
    assert len(months) == 2
    assert months[0]["precip_mm"] == 3.0
    assert months[0]["tmin_c"] == 4
    assert months[0]["tmax_c"] == 19
    assert months[0]["eto_mm"] == 8.5

    rows = indicator_rows(snapshot)
    assert len(rows) == 8
    assert all(row["quality_flag"] == "modeled_reanalysis" for row in rows)
