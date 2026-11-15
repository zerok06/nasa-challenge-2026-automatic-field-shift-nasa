from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field
from typing import Any

from app.agent.tools import TOOL_DECLARATIONS, AgentTools
from app.core.config import settings
from app.schemas.agent import ToolTrace, UiAction

logger = logging.getLogger("automatic.agent")

SYSTEM_PROMPT = """Eres Anden, copiloto agrícola para una parcela piloto en Moquegua, Perú.
Habla en español peruano simple, de tú, en 1 o 2 frases (máximo 220 caracteres).
Usa las herramientas para obtener datos antes de responder.
No inventes cifras: cada número debe venir de una herramienta.
No calcules, no redondees ni sumes números nuevos.
Si falta un dato, dilo como "no disponible" o "no calculable"; nunca lo reemplaces por 0.
No predigas el clima ni los precios; no des consejos médicos ni legales.
No pidas IDs ni datos que el sistema ya conoce.
No muestres IDs, SQL, URLs, nombres de herramientas ni detalles internos.
No des una recomendación agronómica definitiva; apoya la decisión con evidencia.
Usa palabras simples: no digas "rotación", "margen", "déficit", "factibilidad", "baseline" ni "ETc".
"""


@dataclass
class GeminiTurn:
    answer: str
    traces: list[ToolTrace] = field(default_factory=list)
    evidence: list[str] = field(default_factory=list)
    actions: list[UiAction] = field(default_factory=list)
    analysis_run_id: str | None = None
    evidence_payload: list[dict[str, Any]] = field(default_factory=list)


def _client(genai: Any, types: Any) -> Any:
    kwargs: dict[str, Any] = {
        "project": settings.google_cloud_project,
        "location": settings.google_cloud_location,
    }
    try:
        kwargs["http_options"] = types.HttpOptions(
            timeout=settings.llm_timeout_seconds * 1000
        )
    except (AttributeError, TypeError):
        pass
    try:
        return genai.Client(enterprise=True, **kwargs)
    except TypeError:
        return genai.Client(vertexai=True, **kwargs)


def _declarations(types: Any) -> list[Any]:
    declarations = []
    for item in TOOL_DECLARATIONS:
        try:
            declarations.append(
                types.FunctionDeclaration(
                    name=item["name"],
                    description=item["description"],
                    parameters_json_schema=item["parameters"],
                )
            )
        except TypeError:
            declarations.append(
                types.FunctionDeclaration(
                    name=item["name"],
                    description=item["description"],
                    parameters=item["parameters"],
                )
            )
    return declarations


def _config(types: Any, with_tools: bool) -> Any:
    kwargs: dict[str, Any] = {
        "system_instruction": SYSTEM_PROMPT,
        "temperature": settings.gemini_temperature,
        "max_output_tokens": settings.gemini_max_output_tokens,
    }
    if with_tools:
        kwargs["tools"] = [types.Tool(function_declarations=_declarations(types))]
    try:
        kwargs["thinking_config"] = types.ThinkingConfig(thinking_budget=0)
    except (AttributeError, TypeError):
        pass
    return types.GenerateContentConfig(**kwargs)


def _args(call: Any) -> dict[str, Any]:
    raw = getattr(call, "args", None)
    if not raw:
        return {}
    try:
        return dict(raw)
    except (TypeError, ValueError):
        return {key: value for key, value in raw.items()}


def _text(response: Any) -> str:
    try:
        return (response.text or "").strip()
    except Exception:  # noqa: BLE001 - the SDK raises when there is no candidate
        return ""


def _usage(response: Any) -> dict[str, int]:
    meta = getattr(response, "usage_metadata", None)
    if meta is None:
        return {}
    return {
        "prompt_tokens": int(getattr(meta, "prompt_token_count", 0) or 0),
        "output_tokens": int(getattr(meta, "candidates_token_count", 0) or 0),
        "total_tokens": int(getattr(meta, "total_token_count", 0) or 0),
    }


def _generate(client: Any, contents: list[Any], config: Any) -> Any:
    last_error: Exception | None = None
    for attempt in range(2):
        try:
            return client.models.generate_content(
                model=settings.gemini_model,
                contents=contents,
                config=config,
            )
        except Exception as exc:  # noqa: BLE001 - retry once, then fallback
            last_error = exc
            if attempt == 0:
                logger.warning("gemini call failed; retrying: %s", type(exc).__name__)
                time.sleep(0.5)
    assert last_error is not None
    raise last_error


def run_gemini_turn(tools: AgentTools, message: str) -> GeminiTurn:
    """Run one Gemini turn with function calling over the allow-listed tools."""
    from google import genai
    from google.genai import types

    client = _client(genai, types)
    config = _config(types, with_tools=True)
    contents: list[Any] = [
        types.Content(role="user", parts=[types.Part.from_text(text=message)])
    ]

    turn = GeminiTurn(answer="")
    usage: dict[str, int] = {}
    started = time.perf_counter()

    for _ in range(max(1, settings.gemini_max_tool_calls)):
        response = _generate(client, contents, config)
        for key, value in _usage(response).items():
            usage[key] = usage.get(key, 0) + value
        calls = list(getattr(response, "function_calls", None) or [])
        if not calls:
            turn.answer = _text(response)
            break
        contents.append(response.candidates[0].content)
        parts = []
        for call in calls:
            outcome = tools.execute(call.name, _args(call))
            turn.traces.append(outcome.trace)
            turn.evidence.extend(outcome.evidence)
            turn.actions.extend(outcome.actions)
            turn.evidence_payload.append({"tool": call.name, "result": outcome.data})
            if outcome.analysis_run_id:
                turn.analysis_run_id = outcome.analysis_run_id
            parts.append(
                types.Part.from_function_response(
                    name=call.name,
                    response={"result": outcome.data},
                )
            )
        contents.append(types.Content(role="tool", parts=parts))
    else:
        # Tool budget exhausted: ask for a final answer without tools.
        response = _generate(client, contents, _config(types, with_tools=False))
        for key, value in _usage(response).items():
            usage[key] = usage.get(key, 0) + value
        turn.answer = _text(response)

    logger.info(
        "gemini turn model=%s tool_calls=%d latency_ms=%d "
        "prompt_tokens=%d output_tokens=%d total_tokens=%d",
        settings.gemini_model,
        len(turn.traces),
        int((time.perf_counter() - started) * 1000),
        usage.get("prompt_tokens", 0),
        usage.get("output_tokens", 0),
        usage.get("total_tokens", 0),
        extra={
            "model": settings.gemini_model,
            "tool_calls": len(turn.traces),
            **usage,
        },
    )
    return turn
