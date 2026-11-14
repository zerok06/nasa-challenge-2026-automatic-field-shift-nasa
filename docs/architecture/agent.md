# Agente LangGraph + Groq

## Misión

Interpretar la intención, reunir contexto autorizado, ejecutar herramientas deterministas, explicar y proponer acciones reversibles o confirmables. **No** inventa mediciones, no calcula cifras, no ejecuta SQL/URLs y no guarda sin confirmación.

## Estado

```python
class AutomaticState(TypedDict, total=False):
    thread_id: str
    user_id: str              # del JWT, nunca del texto
    parcel_id: str
    user_query: str
    intent: Literal["parcel_overview","explain_map","compare_rotations",
                    "simulate","explain_result","save_plan","unknown"]
    ui_context: dict
    parcel_context: dict
    evidence: list[dict]
    missing_fields: list[str]
    planned_tools: list[str]
    tool_results: dict
    comparison_id: str
    scenario_id: str
    proposed_ui_actions: list[dict]
    pending_confirmation: dict
    final_answer: str
    warnings: list[str]
    error_code: str
```

## Grafo

```text
guard_context → classify_intent → assess_data_sufficiency
→ plan_actions → execute_tools → validate_evidence
→ compose_explanation → build_ui_actions
→ [interrupt si guardar] → commit_authorized_action → END
```

- `assess_data_sufficiency` puede terminar el turno con una pregunta.
- `interrupt()` para guardar; `Command(resume=...)` para continuar.
- Checkpointer por `thread_id`; aislamiento por usuario/parcela.
- Reintentos acotados (máx. 1) y timeouts; sin loops.

## Tools

| Tool | Entrada | Salida | Efecto |
|---|---|---|---|
| `get_parcel_context` | `parcel_id` | ficha + faltantes | lectura |
| `get_climate_summary` | `parcel_id`, `period` | lluvia/temperatura/ETo + fuentes | lectura |
| `compare_rotations` | `parcel_id`, `horizon`, `priorities` | comparación versionada | lectura/cálculo |
| `simulate_scenario` | `comparison_id`, `water_multiplier`, `price_multiplier` | comparación hija | lectura/cálculo |
| `propose_ui_action` | acción enum + payload | propuesta | presentación |
| `propose_save_plan` | `plan_id`, `name` | propuesta + token | escritura pendiente |

Cada tool: esquema Pydantic, autorización por parcela, timeout, allowlist, sin parámetros libres de SQL/URL.

## UI actions

Enum cerrado: `open_comparison`, `focus_map_layer`, `open_scenario`, `show_sources`, `save_plan_draft`.

Validación Pydantic en API y Zod en mobile. Nada de navegación arbitraria.

## Anti-alucinación

1. `compose_explanation` recibe solo `tool_results`.
2. Extraer números de la respuesta; verificar que existan en la evidencia (tolerancia de formato/redondeo).
3. Si no coincide: usar plantilla en español, `explanation_fallback=true`.
4. Si falta un dato: decirlo; no completar con 0.
5. El LLM no recibe la clave ni la DB; solo resultados seguros.

## Groq

- `LLM_PROVIDER=groq`, `GROQ_MODEL` fijado; `temperature=0`; `max_tokens` acotado.
- `langchain-groq` `ChatGroq`; tool calling con modelos compatibles.
- `with_structured_output(Intent)` para clasificar.
- Reintento 1 ante 429/timeout; si falla, `fake`/guided.
- La key solo en el backend; nunca en mobile.

## Fallback `fake`

- Clasificador por reglas/palabras clave.
- Respuestas plantilladas con datos de tools.
- Permite tests deterministas y demo sin red/LLM.
- La UI muestra “Modo guiado” cuando aplica.

## Confirmación y guardado

- `propose_save_plan` crea `action_proposals` con `pending`, `expires_at`, `idempotency_key`.
- El usuario confirma en la UI.
- `commit` revalida JWT, permisos, expiración y payload; es idempotente.
- Rechazo → `rejected`, sin escritura.

## Observabilidad

- `run_id`, `thread_id`, nodo, tool, latencia, tokens; sin PII.
- `tool_trace` seguro: nombre, estado, resumen; sin chain-of-thought.
- Errores con código; no exponer prompts.

## Tests

- U: ruteo, schemas, allowlist, timeout, número alucinado.
- I: tools fake, interrupt/resume, idempotencia.
- E2E: preguntar “¿por qué?”, ver evidencia, guardar/rechazar.
