from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Guardrail:
    answer: str
    phase: str
    kind: str = "safety"


def match_guardrail(message: str) -> Guardrail | None:
    """Deterministic guardrails shared by the fake and Gemini agents."""
    text = message.lower()

    if any(key in text for key in ("ignora", "system prompt", "instrucciones", "prompt")):
        return Guardrail(
            "No puedo cambiar mis reglas. Puedo ayudarte con tu parcela.",
            "comparar",
        )
    if any(key in text for key in ("llover", "lluvia", "clima", "pronóstico", "pronostico")):
        return Guardrail(
            "No predigo el clima. Mira “Riego de la semana” para la lluvia y la demanda de referencia de 7 días.",
            "comparar",
            "info",
        )
    if any(
        key in text
        for key in ("mejor cultivo", "qué sembrar", "que sembrar", "qué cultivo", "que cultivo")
    ):
        return Guardrail(
            "No te digo qué sembrar. Compara las opciones y decide con tu agrónomo.",
            "comparar",
        )
    if ("inventa" in text or "inventar" in text or "inventes" in text) and any(
        key in text for key in ("precio", "costo", "ganancia")
    ):
        return Guardrail(
            "No invento datos. Si falta el precio, lo marco como no disponible.",
            "datos",
        )
    if any(
        key in text for key in ("abogado", "juicio", "legal", "médico", "medico", "doctor")
    ):
        return Guardrail(
            "No doy consejos médicos ni legales. Consulta a un profesional.",
            "comparar",
        )
    if any(key in text for key in ("partido", "fútbol", "futbol", "chiste", "noticia", "noticias", "actualidad", "últimas noticias", "ultimas noticias")):
        return Guardrail(
            "Solo puedo ayudarte con tu parcela y tus planes de siembra.",
            "comparar",
        )
    return None


def next_step_for(message: str, tools: list[str]) -> str:
    text = message.lower()
    if "propose_save_plan" in tools:
        return "listo"
    if "propose_capture" in tools:
        return "guardar"
    if "simulate_scenario" in tools:
        return "guardar"
    if "rank_plans" in tools or "explain_plan" in tools:
        return "probar"
    if "compare_rotations" in tools:
        return "probar"
    if "get_next_questions" in tools or "audit_parcel" in tools:
        return "datos"
    if any(key in text for key in ("qué datos", "que datos", "datos faltan", "faltan datos")):
        return "datos"
    return "comparar"
