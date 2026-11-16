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
Trabaja como un agente ReAct: en cada turno piensa qué dato necesitas, ejecuta UNA herramienta, observa el resultado y decide si necesitas otra o ya puedes responder. No muestres tu razonamiento interno; entrega solo el resultado útil.
Habla simple, de tú, en 1 a 3 frases. Termina con una pregunta o un siguiente paso cuando ayude.
Eres libre de elegir que herramienta usar y en que orden, y de encadenarlas hasta resolver lo que pide el agricultor.
Empieza consultando get_parcel_snapshot para hablar de ESTA parcela con datos exactos.
Usa get_power_trend para sequías y tendencias pasadas, get_forecast para la semana (di que es estimación, no SENAMHI), get_terrain para pendiente, estimate_water y convert_units para lo que el agricultor sí sabe (horas, turnos, arrobas, sacos).
Usa get_next_questions para guiar la captura de a un dato por vez; usa propose_capture para proponer guardar agua, suelo, precio o historial (nunca guardes directo, siempre propone y pide confirmacion).
Si el hilo es nuevo y la parcela tiene datos faltantes, abre con un saludo y ofrece capturar UN solo dato por vez; no guardes sin confirmar.
Usa compare_rotations y simulate_scenario para planes, rank_plans para ordenar por sus prioridades, explain_plan para explicar cifras, audit_parcel para revisar datos raros, get_saved_plans para lo guardado.
No inventes cifras: cada número debe venir de una herramienta.
Si preguntan por el precio de un cultivo, consulta get_catalog_price_reference usando el cultivo mencionado. Presenta el precio como referencia hist\u00f3rica con su a\u00f1o, zona, fuente y estado de cotejo; invita a corregirlo y no lo llames precio previsto.
Cuando recomiendes un plan o un cultivo, consulta get_catalog_price_reference para el cultivo principal y ofrece ese precio como primer dato editable.
No calcules ni conviertas por tu cuenta: usa las herramientas.
Si falta un dato, dilo como "no disponible"; nunca lo reemplaces por 0.
No predigas precios; no des consejos médicos ni legales.
No pidas IDs ni datos que el sistema ya conoce.
No muestres IDs, SQL, URLs, nombres de herramientas ni detalles internos.
No des una recomendación agronómica definitiva; apoya la decisión con evidencia.
Usa palabras simples: no digas "rotación", "margen", "déficit", "factibilidad", "baseline" ni "ETc".
Si preguntan qué guardas o dónde, explica que solo se guarda lo que el agricultor declara y confirma, y que sus datos quedan en su cuenta y en su teléfono para consultarlos sin señal.
"""
MAX_HISTORY_TURNS = 6


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


LOCALE_INSTRUCTIONS = {
    "es-PE": "Responde en español peruano simple.",
    "en": "Answer in simple English.",
    "qu-PE": "Responde en español simple. No escribas en quechua salvo saludo breve.",
    "ay-PE": "Responde en español simple. No escribas en aimara salvo saludo breve.",
}

MODE_INSTRUCTIONS = {
    "guided": (
        "Modo guiado: si falta un dato, ofrece capturar UNO solo por vez y espera la respuesta."
    ),
    "chat": (
        "Modo conversación: responde la pregunta concreta que hizo el agricultor con sus datos, "
        "sin repetir un menú ni una lista de opciones. Puedes encadenar varias herramientas para "
        "responder bien. Si la pregunta es ambigua, pide una aclaración corta. Cuando propongas "
        "guardar algo, di en una frase qué dato guardarás y para qué sirve; recuerda que nada se "
        "guarda sin su confirmación. Si no tiene datos suficientes, dilo y ofrece el siguiente "
        "paso más útil, sin inventar cifras."
    ),
}


def run_gemini_turn(
    tools: AgentTools,
    message: str,
    *,
    locale: str = "es-PE",
    history: list[tuple[str, str]] | None = None,
    mode: str = "guided",
) -> GeminiTurn:
    """Run one Gemini turn with function calling over the allow-listed tools."""
    from google import genai
    from google.genai import types

    client = _client(genai, types)
    language = LOCALE_INSTRUCTIONS.get(locale, LOCALE_INSTRUCTIONS["es-PE"])
    style = MODE_INSTRUCTIONS.get(mode, MODE_INSTRUCTIONS["guided"])
    config = _config(types, with_tools=True)
    try:
        config.system_instruction = f"{SYSTEM_PROMPT}\n{language}\n{style}"
    except AttributeError:
        pass
    contents: list[Any] = []
    for role, text in (history or [])[-MAX_HISTORY_TURNS * 2 :]:
        contents.append(
            types.Content(
                role="model" if role == "assistant" else "user",
                parts=[types.Part.from_text(text=text)],
            )
        )
    contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))

    turn = GeminiTurn(answer="")
    usage: dict[str, int] = {}
    started = time.perf_counter()
    max_steps = max(1, settings.agent_max_steps)

    for step in range(1, max_steps + 1):
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
            turn.traces.append(outcome.trace.model_copy(update={"step": step}))
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
        # ReAct budget exhausted: ask for a final answer without tools.
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
