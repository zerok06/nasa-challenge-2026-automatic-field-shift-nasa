from __future__ import annotations

from datetime import date

from services.economics import calculate_economics, evaluate_soil
from services.water_engine import (
    available_mm,
    effective_rain,
    etc_from_stages,
    eto_fao56,
    eto_hargreaves,
    water_balance,
)


def test_effective_rain_zero_and_positive():
    assert effective_rain(0) == 0
    assert 0 < effective_rain(10) <= 10
    assert effective_rain(-5) == 0


def test_eto_positive_fao_and_hargreaves():
    fao = eto_fao56(24, 12, 65, 2.0, 20, -17.19, 1400, date(2024, 6, 1))
    har = eto_hargreaves(24, 12, -17.19, date(2024, 6, 1))
    assert 0 < fao < 20
    assert 0 < har < 20


def test_etc_from_stages_and_missing_kc():
    stages = [
        {"days": 10, "kc": 0.7},
        {"days": 10, "kc": 1.0},
    ]
    etc = etc_from_stages(stages, 4.0)
    assert etc == 68.0
    assert etc_from_stages([{"days": 10}], 4.0) is None


def test_water_balance_deficit_and_unknown():
    result = water_balance(
        etc_mm=700,
        rain_effective_mm=100,
        available=500,
        efficiency=0.7,
        area_ha=1.2,
        volume_m3=None,
    )
    assert result.feasibility == "deficit"
    assert result.gross_irrigation_mm == 857.143
    assert result.deficit_mm == 357.143

    unknown = water_balance(700, 100, None, 0.7, None, None)
    assert unknown.feasibility == "unknown"
    assert unknown.deficit_mm is None
    assert "water_available" in unknown.missing_inputs


def test_available_mm_from_volume():
    assert available_mm(1.2, 1200, None) == 100.0
    assert available_mm(None, 1200, None) is None
    assert available_mm(1.2, 1200, 80) == 80.0


def test_economics_complete_and_missing():
    complete = calculate_economics(1.2, 12000, 1.2, 9000)
    assert complete.confidence == "complete"
    assert complete.margin_pen == 8280.0
    assert complete.break_even_price_pen_kg == 0.625

    missing = calculate_economics(None, 12000, None, 9000)
    assert missing.margin_pen is None
    assert missing.confidence == "insufficient_inputs"


def test_soil_not_measured_and_family_repeat():
    result = evaluate_soil([], [], [])
    assert result.fertility_status == "not_measured"
    assert "Fertilidad por verificar" in result.notes[0]

    repeated = evaluate_soil(
        [],
        [],
        [
            {"crop_id": "onion", "family": "Amaryllidaceae", "sowing_date": date(2027, 1, 1), "harvest_date": date(2027, 4, 1)},
            {"crop_id": "onion", "family": "Amaryllidaceae", "sowing_date": date(2027, 5, 1), "harvest_date": date(2027, 8, 1)},
        ],
    )
    assert "family_repeat" in repeated.risk_flags
