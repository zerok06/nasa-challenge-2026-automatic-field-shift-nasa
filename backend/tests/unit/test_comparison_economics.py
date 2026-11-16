from app.use_cases.comparison import _plan_economics


def _prefs(economics: dict, price_type: str = "farmer") -> dict:
    return {"price_assumption_type": price_type, "economics": economics}


def test_complete_farmer_data_produces_margin_and_break_even():
    result = _plan_economics(
        [{"crop_id": "onion"}],
        _prefs(
            {
                "onion": {
                    "yield_kg_ha": 10000,
                    "price_pen_kg": 1.2,
                    "costs_pen": 8000,
                }
            }
        ),
        1,
    )
    assert result.margin_pen == 4000
    assert result.income_pen == 12000
    assert result.costs_pen == 8000
    assert result.break_even_price_pen_kg == 0.8
    assert result.confidence == "complete"
    assert result.missing_inputs == []


def test_unconfirmed_catalog_price_does_not_produce_margin_but_keeps_known_budget():
    result = _plan_economics(
        [{"crop_id": "onion"}],
        _prefs(
            {
                "onion": {
                    "yield_kg_ha": 10000,
                    "price_pen_kg": 1.2,
                    "costs_pen": 8000,
                    "price_source": "catalog_reference",
                    "price_confirmed": False,
                }
            },
            price_type="historical",
        ),
        1,
    )
    assert result.margin_pen is None
    assert result.costs_pen == 8000
    assert "economics.onion.price_confirmation" in result.missing_inputs
    assert "economics.onion.price_pen_kg" in result.missing_inputs


def test_confirmed_catalog_price_can_be_used_as_historical_assumption():
    result = _plan_economics(
        [{"crop_id": "onion"}],
        _prefs(
            {
                "onion": {
                    "yield_kg_ha": 10000,
                    "price_pen_kg": 1.2,
                    "costs_pen": 8000,
                    "price_source": "catalog_reference",
                    "price_confirmed": True,
                }
            },
            price_type="historical",
        ),
        1,
    )
    assert result.margin_pen == 4000
    assert result.price_assumption_type == "historical"


def test_missing_costs_keeps_margin_null_instead_of_assuming_zero_cost():
    result = _plan_economics(
        [{"crop_id": "onion"}],
        _prefs(
            {
                "onion": {
                    "yield_kg_ha": 10000,
                    "price_pen_kg": 1.2,
                    "costs_pen": None,
                }
            }
        ),
        1,
    )
    assert result.margin_pen is None
    assert result.margin_pen_ha is None
    assert result.costs_pen is None
    assert result.income_pen == 12000
    assert "economics.onion.costs_pen" in result.missing_inputs


def test_missing_yield_keeps_margin_null_but_reports_declared_costs():
    result = _plan_economics(
        [{"crop_id": "onion"}],
        _prefs(
            {
                "onion": {
                    "yield_kg_ha": None,
                    "price_pen_kg": 1.2,
                    "costs_pen": 8000,
                }
            }
        ),
        1,
    )
    assert result.margin_pen is None
    assert result.income_pen is None
    assert result.production_kg is None
    assert result.costs_pen == 8000
    assert "economics.onion.yield_kg_ha" in result.missing_inputs


def test_missing_area_blocks_margin_even_with_full_crop_data():
    result = _plan_economics(
        [{"crop_id": "onion"}],
        _prefs(
            {
                "onion": {
                    "yield_kg_ha": 10000,
                    "price_pen_kg": 1.2,
                    "costs_pen": 8000,
                }
            }
        ),
        None,
    )
    assert result.margin_pen is None
    assert "area_ha" in result.missing_inputs


def test_one_crop_without_economics_nulls_the_whole_plan_margin():
    result = _plan_economics(
        [{"crop_id": "onion"}, {"crop_id": "corn"}],
        _prefs(
            {
                "onion": {
                    "yield_kg_ha": 10000,
                    "price_pen_kg": 1.2,
                    "costs_pen": 8000,
                }
            }
        ),
        1,
    )
    assert result.margin_pen is None
    assert result.income_pen is None
    assert result.costs_pen is None
    assert "economics.corn" in result.missing_inputs


def test_no_economics_returns_insufficient_inputs():
    result = _plan_economics([{"crop_id": "onion"}], {}, 1)
    assert result.margin_pen is None
    assert result.confidence == "insufficient_inputs"
    assert result.price_assumption_type == "none"
    assert result.missing_inputs == ["crop_economics"]


# ── T2: marketable_share tests ─────────────────────────────────────────

def test_marketable_share_reduces_production_and_income():
    base = _plan_economics(
        [{"crop_id": "onion"}],
        _prefs({"onion": {"yield_kg_ha": 10000, "price_pen_kg": 1.2, "costs_pen": 8000}}),
        1,
    )
    reduced = _plan_economics(
        [
            {
                "crop_id": "onion",
                "yield_kg_ha": 10000,
                "price_pen_kg": 1.2,
                "costs_pen": 8000,
                "marketable_share": 0.6,
            }
        ],
        _prefs(
            {
                "onion": {
                    "yield_kg_ha": 10000,
                    "price_pen_kg": 1.2,
                    "costs_pen": 8000,
                    "marketable_share": 0.6,
                }
            }
        ),
        1,
    )
    assert base.income_pen == 12000
    assert reduced.income_pen == 7200  # 12000 × 0.6
    assert reduced.production_kg == 6000  # 10000 × 0.6
    assert base.margin_pen == 4000
    assert reduced.margin_pen == -800  # 7200 − 8000


def test_marketable_share_none_behaves_like_1():
    result = _plan_economics(
        [
            {
                "crop_id": "onion",
                "yield_kg_ha": 10000,
                "price_pen_kg": 1.2,
                "costs_pen": 8000,
                "marketable_share": None,
            }
        ],
        _prefs(
            {
                "onion": {
                    "yield_kg_ha": 10000,
                    "price_pen_kg": 1.2,
                    "costs_pen": 8000,
                }
            }
        ),
        1,
    )
    assert result.income_pen == 12000
    assert result.margin_pen == 4000


def test_marketable_share_zero_gives_zero_income():
    result = _plan_economics(
        [
            {
                "crop_id": "onion",
                "yield_kg_ha": 10000,
                "price_pen_kg": 1.2,
                "costs_pen": 8000,
                "marketable_share": 0.0,
            }
        ],
        _prefs(
            {
                "onion": {
                    "yield_kg_ha": 10000,
                    "price_pen_kg": 1.2,
                    "costs_pen": 8000,
                    "marketable_share": 0.0,
                }
            }
        ),
        1,
    )
    assert result.income_pen == 0
    assert result.margin_pen == -8000
