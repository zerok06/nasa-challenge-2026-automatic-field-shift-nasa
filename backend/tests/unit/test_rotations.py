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


def test_three_plans_same_horizon():
    crops = {
        "onion": Crop("onion", "Amaryllidaceae", 120),
        "pumpkin": Crop("pumpkin", "Cucurbitaceae", 100),
        "chili": Crop("chili", "Solanaceae", 140),
    }
    drafts = build_plan_drafts(
        [{"crop_id": "onion", "family": "Amaryllidaceae"}],
        crops,
        date(2027, 1, 1),
        date(2027, 12, 31),
    )
    assert len(drafts) == 3
    assert drafts[0].kind == "existing"
    assert drafts[1].crop_sequence == ["pumpkin", "onion"]
    assert all(d.status in {"eligible", "needs_review", "invalid"} for d in drafts)


def test_no_history_is_labeled_as_example_not_current_plan():
    crops = {
        "onion": Crop("onion", "Amaryllidaceae", 120),
        "pumpkin": Crop("pumpkin", "Cucurbitaceae", 100),
        "chili": Crop("chili", "Solanaceae", 140),
    }
    drafts = build_plan_drafts([], crops, date(2027, 1, 1), date(2027, 12, 31))
    assert drafts[0].kind == "example"
    assert drafts[0].label == "Rotación de ejemplo"
    assert "history_missing_example" in drafts[0].reasons
    assert any("no tu plan actual" in reason for reason in drafts[0].why)


def test_family_repeat_is_invalid():
    crops = {
        "onion": Crop("onion", "Amaryllidaceae", 120),
        "pumpkin": Crop("pumpkin", "Cucurbitaceae", 100),
    }
    drafts = build_plan_drafts(
        [{"crop_id": "onion", "family": "Amaryllidaceae"}],
        crops,
        date(2027, 1, 1),
        date(2027, 12, 31),
        existing_sequence=["onion", "onion"],
    )
    assert drafts[0].status == "invalid"
    assert "family_repeat" in drafts[0].reasons
