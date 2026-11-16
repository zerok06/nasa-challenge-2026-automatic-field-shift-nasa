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


MODEL_VERSION = "rotation-engine-v0.2"
CATALOG_VERSION = "v0.2.5"


def _crop_set(sequence: list[str]) -> frozenset[str]:
    return frozenset(sequence)


def build_plan_drafts(
    history: list[dict[str, Any]],
    crops: dict[str, Any],
    horizon_start: date,
    horizon_end: date,
    existing_sequence: list[str] | None = None,
) -> tuple[list[PlanDraft], list[PlanDraft]]:
    """Return (evaluable_drafts, pending_drafts).

    evaluable_drafts: existing + up to 2 alternatives with distinct crop sets.
    pending_drafts: candidates that lack agronomic evidence or crop data.
    """
    horizon_days = (horizon_end - horizon_start).days + 1
    if existing_sequence:
        current_seq = existing_sequence[:2]
    else:
        current_seq = [h.get("crop_id") for h in history[-2:] if h.get("crop_id")]
    has_history = bool(current_seq)
    crops_by_id = dict(sorted(crops.items()))

    # Generate all valid ordered pairs with distinct crop sets (no same-family adjacency).
    seen_sets: set[frozenset[str]] = set()
    candidate_sequences: list[list[str]] = []
    for first_id, first in crops_by_id.items():
        if int(first.duration_days) > horizon_days:
            continue
        for second_id, second in crops_by_id.items():
            if first_id == second_id:
                continue
            sequence = [first_id, second_id]
            if int(first.duration_days) + int(second.duration_days) > horizon_days:
                continue
            crop_set = _crop_set(sequence)
            if crop_set in seen_sets:
                continue
            seen_sets.add(crop_set)
            if sequence != current_seq:
                candidate_sequences.append(sequence)

    if not current_seq:
        current_seq = next(
            (sequence for sequence in candidate_sequences if sequence[0] == "onion"),
            candidate_sequences[0] if candidate_sequences else [],
        )
        has_history = False
    if not current_seq and crops_by_id:
        current_seq = [next(iter(crops_by_id))]

    # Build all candidate drafts with evidence tracking.
    all_candidates: list[PlanDraft] = []
    for index, sequence in enumerate(candidate_sequences, start=1):
        steps, too_long = _steps_for_sequence(sequence, crops, horizon_start, horizon_end)
        reasons: list[str] = []
        if too_long:
            reasons.append("horizon_too_short")
        elif not _family_ok(steps):
            reasons.append("family_repeat")
        status = "invalid" if reasons else "needs_review"

        why = ["Combina cultivos de familias distintas del catálogo."]
        tradeoffs = ["La adecuación local de esta alternativa requiere revisión."]
        all_candidates.append(
            PlanDraft(
                plan_id=f"candidate_{'_'.join(sequence)}",
                label=f"Candidata {index}",
                kind="candidate",
                crop_sequence=[s["crop_id"] for s in steps] or sequence,
                steps=steps,
                status=status,
                reasons=reasons,
                why=why,
                tradeoffs=tradeoffs,
            )
        )

    # Existing/example plan.
    existing_steps, existing_too_long = _steps_for_sequence(
        current_seq, crops_by_id, horizon_start, horizon_end
    )
    existing_reasons: list[str] = []
    if existing_too_long:
        existing_reasons.append("horizon_too_short")
    elif not _family_ok(existing_steps):
        existing_reasons.append("family_repeat")
    existing_status = "invalid" if existing_reasons else "needs_review"
    existing_label = "Rotación actual" if has_history else "Rotación de ejemplo"
    existing_why = (
        ["Es la rotación registrada por el agricultor."]
        if has_history
        else ["No registraste historial; esta es una rotación de ejemplo, no tu plan actual."]
    )
    if not has_history:
        existing_reasons.append("history_missing_example")
    existing_draft = PlanDraft(
        plan_id="existing",
        label=existing_label,
        kind=("existing" if has_history else "example"),
        crop_sequence=[s["crop_id"] for s in existing_steps] or current_seq,
        steps=existing_steps,
        status=existing_status,
        reasons=existing_reasons,
        why=existing_why,
        tradeoffs=[],
    )

    # Select up to 2 alternatives with distinct crop sets from the existing.
    existing_set = _crop_set(existing_draft.crop_sequence)
    selected: list[PlanDraft] = []
    selected_sets: set[frozenset[str]] = {existing_set}
    for candidate in all_candidates:
        if candidate.status == "invalid":
            continue
        candidate_set = _crop_set(candidate.crop_sequence)
        if candidate_set in selected_sets:
            continue
        selected.append(candidate)
        selected_sets.add(candidate_set)
        if len(selected) >= 2:
            break

    if not selected and all_candidates:
        # Fall back to first valid candidate even if it shares a crop set edge case.
        for candidate in all_candidates:
            if candidate.status != "invalid":
                selected.append(candidate)
                break

    pending = [c for c in all_candidates if c not in selected]
    drafts = [existing_draft] + selected
    return drafts, pending
