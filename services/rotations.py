from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Any


@dataclass
class PlanDraft:
    plan_id: str
    label: str
    kind: str
    crop_sequence: list[str]
    steps: list[dict[str, Any]] = field(default_factory=list)
    status: str = "needs_review"
    reasons: list[str] = field(default_factory=list)
    why: list[str] = field(default_factory=list)
    tradeoffs: list[str] = field(default_factory=list)


def _steps_for_sequence(
    sequence: list[str],
    crops: dict[str, Any],
    horizon_start: date,
    horizon_end: date,
) -> tuple[list[dict[str, Any]], bool]:
    steps: list[dict[str, Any]] = []
    current = horizon_start
    too_long = False
    for ordinal, crop_id in enumerate(sequence, start=1):
        crop = crops.get(crop_id)
        if crop is None:
            return steps, True
        duration = int(crop.duration_days)
        harvest = current + timedelta(days=max(1, duration) - 1)
        if harvest > horizon_end:
            too_long = True
            harvest = horizon_end
        steps.append(
            {
                "crop_id": crop_id,
                "family": crop.family,
                "sowing_date": current,
                "harvest_date": harvest,
                "ordinal": ordinal,
                "kc": crop.kc_json,
                "duration_days": duration,
            }
        )
        current = harvest + timedelta(days=1)
    return steps, too_long


def _family_ok(steps: list[dict[str, Any]]) -> bool:
    families = [s["family"] for s in steps if s.get("family")]
    return all(families[i] != families[i + 1] for i in range(len(families) - 1))


def build_plan_drafts(
    history: list[dict[str, Any]],
    crops: dict[str, Any],
    horizon_start: date,
    horizon_end: date,
    existing_sequence: list[str] | None = None,
) -> list[PlanDraft]:
    if existing_sequence:
        current_seq = existing_sequence[:2]
    else:
        current_seq = [h.get("crop_id") for h in history[-2:] if h.get("crop_id")]
    if not current_seq:
        current_seq = ["onion", "pumpkin"]

    candidates = [
        (["pumpkin", "onion"], "Alternativa B"),
        (["chili", "onion"], "Alternativa C"),
    ]

    drafts: list[PlanDraft] = []
    for idx, (sequence, label) in enumerate([(current_seq, "Rotación actual")] + candidates):
        steps, too_long = _steps_for_sequence(sequence, crops, horizon_start, horizon_end)
        draft = PlanDraft(
            plan_id="existing" if idx == 0 else f"candidate_{idx}",
            label=label,
            kind="existing" if idx == 0 else "candidate",
            crop_sequence=[s["crop_id"] for s in steps] or sequence,
            steps=steps,
        )
        if too_long:
            draft.status = "invalid"
            draft.reasons.append("horizon_too_short")
        elif not _family_ok(steps):
            draft.status = "invalid"
            draft.reasons.append("family_repeat")
        else:
            draft.status = "needs_review"
            draft.reasons.append("review_pending")

        if idx == 0:
            draft.why.append("Es la rotación registrada por el agricultor.")
        elif idx == 1:
            draft.why.append("Diversifica la familia respecto de la campaña anterior.")
            draft.tradeoffs.append("Puede requerir otra ventana de siembra.")
        else:
            draft.why.append("Introduce una familia distinta y un ciclo distinto.")
            draft.tradeoffs.append("Mayor incertidumbre de mercado y manejo.")

        drafts.append(draft)
    return drafts
