from __future__ import annotations

from datetime import date

from services.rotations import build_plan_drafts


class Crop:
    def __init__(self, crop_id: str, family: str, duration: int):
        self.id = crop_id
        self.family = family
        self.duration_days = duration
        self.kc_json = {"stages": [{"days": duration, "kc": 1.0}]}
        self.review_status = "needs_review"


CROPS = {
    "onion": Crop("onion", "Amaryllidaceae", 120),
    "pumpkin": Crop("pumpkin", "Cucurbitaceae", 100),
    "chili": Crop("chili", "Solanaceae", 140),
    "potato": Crop("potato", "Solanaceae", 140),
    "corn": Crop("corn", "Poaceae", 150),
    "haba": Crop("haba", "Fabaceae", 150),
}


def test_returns_baseline_plus_two_alternatives_and_pending_rest():
    drafts, pending = build_plan_drafts(
        [{"crop_id": "onion", "family": "Amaryllidaceae"}],
        CROPS,
        date(2027, 1, 1),
        date(2027, 12, 31),
    )

    assert drafts[0].kind == "existing"
    assert len(drafts) == 3
    assert pending
    assert len(drafts) + len(pending) > 3


def test_drafts_and_pending_are_disjoint():
    drafts, pending = build_plan_drafts(
        [{"crop_id": "onion", "family": "Amaryllidaceae"}],
        CROPS,
        date(2027, 1, 1),
        date(2027, 12, 31),
    )

    draft_ids = {draft.plan_id for draft in drafts}
    pending_ids = {candidate.plan_id for candidate in pending}
    assert draft_ids.isdisjoint(pending_ids)


def test_selected_alternatives_have_distinct_crop_sets_and_families():
    drafts, _pending = build_plan_drafts(
        [{"crop_id": "onion", "family": "Amaryllidaceae"}],
        CROPS,
        date(2027, 1, 1),
        date(2027, 12, 31),
    )

    crop_sets = [frozenset(draft.crop_sequence) for draft in drafts[1:]]
    assert len(crop_sets) == len(set(crop_sets))
    assert all(
        CROPS[sequence[0]].family != CROPS[sequence[1]].family
        for draft in drafts[1:]
        if len(sequence := draft.crop_sequence) == 2
    )
    assert all(draft.status in {"eligible", "needs_review", "invalid"} for draft in drafts)


def test_no_history_is_labeled_as_example_not_current_plan():
    drafts, _pending = build_plan_drafts(
        [], CROPS, date(2027, 1, 1), date(2027, 12, 31)
    )

    assert drafts[0].kind == "example"
    assert drafts[0].label == "Rotación de ejemplo"
    assert "history_missing_example" in drafts[0].reasons
    assert any("no tu plan actual" in reason for reason in drafts[0].why)


def test_family_repeat_is_invalid():
    drafts, _pending = build_plan_drafts(
        [{"crop_id": "onion", "family": "Amaryllidaceae"}],
        CROPS,
        date(2027, 1, 1),
        date(2027, 12, 31),
        existing_sequence=["onion", "onion"],
    )

    assert drafts[0].status == "invalid"
    assert "family_repeat" in drafts[0].reasons


def test_horizon_too_short_is_flagged_on_the_baseline():
    drafts, pending = build_plan_drafts(
        [{"crop_id": "onion", "family": "Amaryllidaceae"}],
        CROPS,
        date(2027, 1, 1),
        date(2027, 1, 30),
    )

    assert drafts[0].status == "invalid"
    assert "horizon_too_short" in drafts[0].reasons
    assert all(draft.status == "invalid" for draft in pending)
