from types import SimpleNamespace

from app.use_cases.comparison import _select_baseline_and_alternatives
from services.ranking import weighted_rank_scores


def test_unavailable_dimensions_are_excluded_and_not_filled_with_neutral_values():
    scores = weighted_rank_scores(
        {
            "water": [800, 400],
            "margin": [None, None],
            "budget": [None, None],
        },
        {"water": 0.3, "margin": 0.5, "budget": 0.2},
        lower_is_better={"water", "budget"},
    )
    assert scores == [0.0, 1.0]


def test_rank_is_unavailable_when_all_selected_priorities_lack_data():
    scores = weighted_rank_scores(
        {"margin": [None, None], "budget": [None, None]},
        {"margin": 0.5, "budget": 0.5},
    )
    assert scores == [None, None]


def test_budget_priority_prefers_lower_known_cost():
    scores = weighted_rank_scores(
        {"budget": [1200, 900, None]},
        {"budget": 1.0},
        lower_is_better={"budget"},
    )
    assert scores == [0.0, 1.0, None]


def _plan(
    plan_id: str,
    water: float,
    *,
    crops: list[str] | None = None,
    margin: float | None = None,
    costs: float | None = None,
    status: str = "needs_review",
) -> SimpleNamespace:
    return SimpleNamespace(
        plan_id=plan_id,
        kind="candidate",
        label="Candidata",
        status=status,
        crop_sequence=crops or [plan_id, f"{plan_id}-b"],
        water=SimpleNamespace(gross_irrigation_mm=water),
        economics=SimpleNamespace(margin_pen=margin, costs_pen=costs),
        soil=SimpleNamespace(fertility_status="not_measured"),
    )


def _baseline() -> SimpleNamespace:
    return SimpleNamespace(
        plan_id="existing",
        kind="existing",
        label="Rotación actual",
        status="eligible",
        crop_sequence=["onion", "corn"],
    )


def test_single_plan_returns_itself_and_no_pending():
    baseline = _baseline()
    selected, pending = _select_baseline_and_alternatives([baseline], {})

    assert selected == [baseline]
    assert pending == []


def test_selection_keeps_baseline_and_ranks_alternatives_by_water_when_economics_are_unknown():
    selected, pending = _select_baseline_and_alternatives(
        [
            _baseline(),
            _plan("candidate-a", 800),
            _plan("candidate-b", 300),
            _plan("candidate-c", 500),
        ],
        {"priorities": {"water": 1}},
    )

    assert [item.plan_id for item in selected] == ["existing", "candidate-b", "candidate-c"]
    assert [item.label for item in selected[1:]] == ["Alternativa B", "Alternativa C"]
    assert [item.plan_id for item in pending] == ["candidate-a"]


def test_selection_reserves_a_slot_for_an_alternative_with_known_margin():
    # Water alone would pick a and b, but the farmer could not compare money.
    # The third plan must take the last slot so at least one alternative is
    # economically evaluable.
    selected, pending = _select_baseline_and_alternatives(
        [
            _baseline(),
            _plan("candidate-a", 100),
            _plan("candidate-b", 300),
            _plan("candidate-c", 900, margin=1000, costs=4000),
        ],
        {"priorities": {"water": 1}},
    )

    assert [item.plan_id for item in selected] == ["existing", "candidate-a", "candidate-c"]
    assert [item.label for item in selected[1:]] == ["Alternativa B", "Alternativa C"]
    assert [item.plan_id for item in pending] == ["candidate-b"]


def test_duplicate_crop_sets_go_to_pending_instead_of_being_selected_twice():
    selected, pending = _select_baseline_and_alternatives(
        [
            _baseline(),
            _plan("candidate-a", 100, crops=["onion", "corn"]),
            _plan("candidate-b", 120, crops=["corn", "onion"]),
            _plan("candidate-c", 400, crops=["pumpkin", "chili"]),
        ],
        {"priorities": {"water": 1}},
    )

    assert [item.plan_id for item in selected] == ["existing", "candidate-a", "candidate-c"]
    assert [item.plan_id for item in pending] == ["candidate-b"]


def test_invalid_candidates_are_never_selected_or_listed_as_pending():
    selected, pending = _select_baseline_and_alternatives(
        [
            _baseline(),
            _plan("candidate-invalid", 50, status="invalid"),
            _plan("candidate-ok", 400),
        ],
        {"priorities": {"water": 1}},
    )

    assert [item.plan_id for item in selected] == ["existing", "candidate-ok"]
    assert pending == []
