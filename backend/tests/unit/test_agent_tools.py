from __future__ import annotations

from typing import Any

from google.genai import types

from app.agent import llm
from app.agent.tools import TOOL_DECLARATIONS, ToolOutcome
from app.schemas.agent import ToolTrace, UiAction


class FakeCall:
    def __init__(self, name: str, args: dict[str, Any] | None = None) -> None:
        self.name = name
        self.args = args or {}


class FakeUsage:
    prompt_token_count = 10
    candidates_token_count = 5
    total_token_count = 15


class FakeCandidate:
    def __init__(self, content: types.Content) -> None:
        self.content = content


class FakeResponse:
    def __init__(self, calls: list[FakeCall] | None = None, text: str = "") -> None:
        self.function_calls = calls or []
        self.text = text
        self.candidates = [FakeCandidate(types.Content(role="model", parts=[]))]
        self.usage_metadata = FakeUsage()


class FakeTools:
    def execute(self, name: str, args: dict[str, Any]) -> ToolOutcome:
        return ToolOutcome(
            data={"comparison_id": "c1", "plan_count": 3},
            trace=ToolTrace(tool=name, status="ok", summary="ok"),
            evidence=["snap-1"],
            actions=[
                UiAction(action="open_comparison", payload={"comparison_id": "c1"})
            ],
            analysis_run_id="c1",
        )


def test_tool_declarations_do_not_accept_identity_parameters():
    names = {item["name"] for item in TOOL_DECLARATIONS}
    assert names == {
        "get_catalog_price_reference",
        "get_parcel_context",
        "compare_rotations",
        "simulate_scenario",
        "propose_save_plan",
        "get_parcel_snapshot",
        "get_power_trend",
        "get_forecast",
        "get_terrain",
        "estimate_water",
        "convert_units",
        "get_next_questions",
        "propose_capture",
        "rank_plans",
        "audit_parcel",
        "explain_plan",
        "get_saved_plans",
    }
    for item in TOOL_DECLARATIONS:
        properties = item["parameters"].get("properties", {})
        assert "parcel_id" not in properties
        assert "user_id" not in properties


def test_declarations_build_with_json_schema():
    declarations = llm._declarations(types)
    assert len(declarations) == 17
    assert declarations[0].name == "get_catalog_price_reference"
    empty = next(d for d in declarations if d.name == "get_parcel_context")
    assert empty.parameters_json_schema == {"type": "object", "properties": {}}


def test_config_disables_thinking_and_includes_tools():
    config = llm._config(types, with_tools=True)
    assert config.tools
    assert config.temperature == 0
    assert config.thinking_config.thinking_budget == 0


def test_run_gemini_turn_executes_tool_then_answers(monkeypatch):
    responses = iter(
        [
            FakeResponse(calls=[FakeCall("compare_rotations", {})]),
            FakeResponse(text="Comparé 3 planes."),
        ]
    )
    monkeypatch.setattr(llm, "_client", lambda *_: object())
    monkeypatch.setattr(llm, "_generate", lambda *_, **__: next(responses))

    turn = llm.run_gemini_turn(FakeTools(), "compara rotaciones")

    assert turn.answer == "Comparé 3 planes."
    assert [trace.tool for trace in turn.traces] == ["compare_rotations"]
    assert turn.actions[0].action == "open_comparison"
    assert turn.evidence == ["snap-1"]
    assert turn.analysis_run_id == "c1"
    assert turn.evidence_payload[0]["tool"] == "compare_rotations"


def test_run_gemini_turn_without_tool_calls(monkeypatch):
    monkeypatch.setattr(llm, "_client", lambda *_: object())
    monkeypatch.setattr(llm, "_generate", lambda *_, **__: FakeResponse(text="Hola."))

    turn = llm.run_gemini_turn(FakeTools(), "hola")

    assert turn.answer == "Hola."
    assert turn.traces == []
    assert turn.actions == []


def test_run_gemini_turn_forces_final_answer_after_tool_budget(monkeypatch):
    configs: list[Any] = []
    monkeypatch.setattr(llm.settings, "agent_max_steps", 4)
    responses = [FakeResponse(calls=[FakeCall("compare_rotations", {})]) for _ in range(4)]
    responses.append(FakeResponse(text="Revisa la tarjeta."))

    def fake_generate(_client, _contents, config):
        configs.append(config)
        return responses.pop(0)

    monkeypatch.setattr(llm, "_client", lambda *_: object())
    monkeypatch.setattr(llm, "_generate", fake_generate)

    turn = llm.run_gemini_turn(FakeTools(), "compara rotaciones")

    assert turn.answer == "Revisa la tarjeta."
    assert len(turn.traces) == 4
    assert configs[-1].tools in (None, [])
