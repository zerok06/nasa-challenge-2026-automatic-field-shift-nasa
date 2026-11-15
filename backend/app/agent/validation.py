from __future__ import annotations

import re
from typing import Any

NUMBER_RE = re.compile(r"-?\d+(?:[.,]\d+)*")
YEAR_RE = re.compile(r"^(19|20)\d{2}$")


def _parse_number(raw: str) -> float | None:
    text = raw.strip().replace(" ", "")
    if not text:
        return None
    sign = -1.0 if text.startswith("-") else 1.0
    text = text.lstrip("+-")
    if "," in text and "." in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")
    elif "," in text:
        head, _, tail = text.rpartition(",")
        if len(tail) == 3 and head.isdigit() and len(head) <= 3:
            text = head + tail
        else:
            text = text.replace(",", ".")
    elif "." in text:
        parts = text.split(".")
        if len(parts) > 2:
            text = "".join(parts)
    try:
        return sign * float(text)
    except ValueError:
        return None


def _collect(value: Any, numbers: set[float]) -> None:
    if isinstance(value, bool) or value is None:
        return
    if isinstance(value, (int, float)):
        numbers.add(float(value))
        return
    if isinstance(value, str):
        for match in NUMBER_RE.finditer(value):
            parsed = _parse_number(match.group())
            if parsed is not None:
                numbers.add(parsed)
        return
    if isinstance(value, dict):
        for item in value.values():
            _collect(item, numbers)
        return
    if isinstance(value, (list, tuple)):
        for item in value:
            _collect(item, numbers)


def evidence_numbers(payload: list[dict[str, Any]]) -> set[float]:
    numbers: set[float] = set()
    _collect(payload, numbers)
    for item in payload:
        result = item.get("result")
        if not isinstance(result, dict):
            continue
        scenario = result.get("scenario")
        if not isinstance(scenario, dict):
            continue
        for key in ("water_multiplier", "price_multiplier"):
            multiplier = scenario.get(key)
            if isinstance(multiplier, (int, float)) and not isinstance(multiplier, bool):
                numbers.add(round((1 - float(multiplier)) * 100, 2))
                numbers.add(round(float(multiplier) * 100, 2))
    return numbers


def _matches(value: float, allowed: set[float]) -> bool:
    for candidate in allowed:
        tolerance = max(0.05, abs(candidate) * 0.01)
        if abs(value - candidate) <= tolerance:
            return True
    return False


def validate_answer(answer: str, payload: list[dict[str, Any]]) -> bool:
    """Every number in the answer must exist in the tool evidence (1% tolerance)."""
    if not answer.strip():
        return False
    allowed = evidence_numbers(payload)
    for match in NUMBER_RE.finditer(answer):
        raw = match.group()
        if YEAR_RE.match(raw):
            continue
        value = _parse_number(raw)
        if value is None:
            continue
        if not _matches(value, allowed):
            return False
    return True


_JARGON = (
    ("la rotación", "el plan"),
    ("una rotación", "un plan"),
    ("las rotaciones", "los planes"),
    ("rotaciones", "planes"),
    ("rotación", "plan"),
    ("margen", "ganancia"),
    ("déficit", "falta de agua"),
    ("factibilidad", "si alcanza el agua"),
    ("baseline", "plan actual"),
    ("ETc", "consumo de agua"),
)


def simplify_answer(answer: str) -> str:
    """Replace technical jargon with farmer-friendly words (spec 028)."""
    for old, new in _JARGON:
        answer = re.sub(old, new, answer, flags=re.IGNORECASE)
    return answer


def shorten_answer(answer: str, limit: int = 220) -> str:
    """Keep the answer within the UI budget without cutting a word in half."""
    text = answer.strip()
    if len(text) <= limit:
        return text
    window = text[: limit - 1]
    for separator in (". ", "? ", "! "):
        index = window.rfind(separator)
        if index >= limit // 2:
            return text[: index + 1].strip()
    cut = window.rfind(" ")
    if cut < limit // 2:
        cut = limit - 1
    return text[:cut].rstrip(" ,;:") + "…"


def fallback_answer(tools: list[str]) -> str:
    if "propose_save_plan" in tools:
        return (
            "Preparé un borrador. Confirma antes de guardarlo; si dices que no, "
            "no se guarda nada."
        )
    if "simulate_scenario" in tools:
        return (
            "Simulé el escenario con los motores. Revisa agua y ganancia en la tarjeta; "
            "si falta un dato, se marca como no disponible."
        )
    if "compare_rotations" in tools:
        return (
            "Comparé tu plan con dos alternativas. Revisa agua, suelo y ganancia en la "
            "tarjeta; las cifras vienen de los motores."
        )
    return (
        "Revisé los datos de tu parcela. Si falta algo, la app lo marca como no disponible."
    )
