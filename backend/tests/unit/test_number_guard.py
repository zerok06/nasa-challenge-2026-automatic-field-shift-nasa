from __future__ import annotations

from app.agent.validation import (
    evidence_numbers,
    fallback_answer,
    shorten_answer,
    simplify_answer,
    validate_answer,
)


def test_evidence_numbers_reads_nested_payload_and_percentages():
    payload = [
        {
            "tool": "simulate_scenario",
            "result": {
                "plan_count": 3,
                "plans": [{"water": {"available_mm": 1200.5}, "economics": {"margin_pen": 1234.5}}],
                "scenario": {"water_multiplier": 0.8, "price_multiplier": 0.85},
            },
        }
    ]
    numbers = evidence_numbers(payload)
    assert 3.0 in numbers
    assert 1200.5 in numbers
    assert 1234.5 in numbers
    assert 20.0 in numbers
    assert 15.0 in numbers


def test_validate_accepts_numbers_from_evidence():
    payload = [
        {
            "tool": "compare_rotations",
            "result": {"plan_count": 3, "plans": [{"water": {"available_mm": 1200.5}}]},
        }
    ]
    assert validate_answer("Comparé 3 planes; el agua disponible es 1200.5 mm.", payload)
    assert validate_answer("Revisa la opción para 2027.", payload)


def test_validate_rejects_invented_numbers():
    payload = [
        {
            "tool": "compare_rotations",
            "result": {"plan_count": 3, "plans": [{"water": {"available_mm": 1200.5}}]},
        }
    ]
    assert not validate_answer("El agua disponible es 1450 mm.", payload)
    assert not validate_answer("La ganancia será de S/ 2,500.00.", payload)


def test_validate_accepts_spanish_thousands_separator():
    payload = [{"tool": "compare_rotations", "result": {"margin_pen": 1234.5}}]
    assert validate_answer("La ganancia estimada es S/ 1,234.50.", payload)


def test_validate_rejects_empty_answer():
    assert not validate_answer("   ", [])


def test_fallback_answer_is_short_and_tool_aware():
    for tools in ([], ["compare_rotations"], ["simulate_scenario"], ["propose_save_plan"]):
        answer = fallback_answer(tools)
        assert answer
        assert len(answer) <= 220


def test_simplify_answer_replaces_jargon():
    answer = simplify_answer("La rotación actual tiene margen y déficit.")
    assert "plan" in answer.lower()
    for word in ("rotación", "margen", "déficit"):
        assert word not in answer.lower()


def test_shorten_answer_respects_limit_at_sentence_boundary():
    text = "Primera frase corta. " + "Segunda frase muy larga " * 20
    answer = shorten_answer(text, 80)
    assert len(answer) <= 80
    assert answer.endswith((".", "…"))


def test_shorten_answer_hard_caps_long_word():
    answer = shorten_answer("x" * 300, 50)
    assert len(answer) <= 50
