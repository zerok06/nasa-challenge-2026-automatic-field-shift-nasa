from __future__ import annotations

from app.agent.tools import TOOL_DECLARATIONS, AgentTools
from app.models.entities import Parcel


def _tools(area: float | None = 1.0) -> AgentTools:
    parcel = Parcel(
        owner_user_id="u",
        name="Test",
        geom="SRID=4326;POINT(-70.93 -17.19)",
        area_ha=area,
        preferences_json={},
    )

    class _Db:
        def rollback(self) -> None:
            return None

    return AgentTools(db=_Db(), user=None, parcel=parcel)  # type: ignore[arg-type]


def test_tool_declarations_cover_data_tools():
    names = {item["name"] for item in TOOL_DECLARATIONS}
    assert {
        "get_parcel_snapshot",
        "get_power_trend",
        "get_forecast",
        "get_terrain",
        "estimate_water",
        "convert_units",
        "compare_rotations",
        "simulate_scenario",
        "propose_save_plan",
        "get_parcel_context",
        "get_next_questions",
        "propose_capture",
        "rank_plans",
        "audit_parcel",
        "explain_plan",
        "get_saved_plans",
        "get_catalog_price_reference",
    } <= names


def test_estimate_water_from_hours():
    outcome = _tools().execute(
        "estimate_water",
        {"mode": "hours", "hours_per_week": 3, "flow_ls": 2, "weeks": 20},
    )
    assert outcome.trace.status == "ok"
    assert outcome.data["m3"] == 432.0
    assert outcome.data["mm"] == 43.2


def test_estimate_water_needs_area_for_mm():
    outcome = _tools(area=None).execute(
        "estimate_water",
        {"mode": "turns", "turn_count": 6, "m3_per_turn": 120},
    )
    assert outcome.trace.status == "ok"
    assert outcome.data["m3"] == 720.0
    assert outcome.data["mm"] is None


def test_estimate_water_rejects_bad_mode():
    outcome = _tools().execute("estimate_water", {"mode": "riego"})
    assert outcome.trace.status == "error"


def test_convert_saco_price_to_kg():
    outcome = _tools().execute(
        "convert_units", {"kind": "price", "value": 60, "from_unit": "pen_saco", "saco_kg": 50}
    )
    assert outcome.trace.status == "ok"
    assert outcome.data["valor"] == 1.2
    assert outcome.data["unidad"] == "S/kg"


def test_convert_arrobas_yield_to_kg_ha():
    outcome = _tools().execute(
        "convert_units", {"kind": "yield", "value": 1000, "from_unit": "arrobas_ha"}
    )
    assert outcome.trace.status == "ok"
    assert outcome.data["valor"] == 11500.0
