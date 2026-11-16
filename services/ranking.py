from __future__ import annotations


def weighted_rank_scores(
    dimensions: dict[str, list[float | None]],
    weights: dict[str, float],
    lower_is_better: set[str] | None = None,
) -> list[float | None]:
    """Normalize comparable dimensions and ignore unavailable measurements."""
    reverse = lower_is_better or set()
    if not dimensions:
        return []
    count = max(len(values) for values in dimensions.values())
    normalized: dict[str, list[float | None]] = {}
    for name, values in dimensions.items():
        present = [value for value in values if value is not None]
        if not present:
            normalized[name] = [None] * count
            continue
        low, high = min(present), max(present)
        scores: list[float | None] = []
        for value in values:
            if value is None:
                scores.append(None)
            elif high == low:
                scores.append(0.5)
            else:
                score = (value - low) / (high - low)
                scores.append(round(1 - score if name in reverse else score, 3))
        normalized[name] = scores

    result: list[float | None] = []
    for index in range(count):
        available = [
            (normalized[name][index], weight)
            for name, weight in weights.items()
            if name in normalized
            and weight > 0
            and index < len(normalized[name])
            and normalized[name][index] is not None
        ]
        total_weight = sum(weight for _, weight in available)
        if total_weight <= 0:
            result.append(None)
        else:
            result.append(
                round(sum(float(score) * weight for score, weight in available) / total_weight, 3)
            )
    return result
