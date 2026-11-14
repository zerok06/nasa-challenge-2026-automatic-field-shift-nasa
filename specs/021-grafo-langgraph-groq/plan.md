# Plan 021 — Grafo LangGraph + Groq

## Estado

Ver `docs/architecture/agent.md`. Campos mínimos: `user_id`, `parcel_id`, `intent`, `ui_context`, `evidence`, `missing_fields`, `tool_results`, `final_answer`, `warnings`.

## Nodos

| Nodo | Responsabilidad |
|---|---|
| `guard_context` | auth, parcela, ámbito |
| `classify_intent` | intención + parámetros |
| `assess_data_sufficiency` | required/helpful/optional |
| `plan_actions` | tools acotadas |
| `execute_tools` | runtime allowlist |
| `validate_evidence` | unidades, período, nulos |
| `compose_explanation` | texto desde hechos |
| `build_ui_actions` | enum permitido |

## Groq

```python
from langchain_groq import ChatGroq
llm = ChatGroq(
    model=settings.GROQ_MODEL,
    api_key=settings.GROQ_API_KEY,
    temperature=0,
    timeout=settings.LLM_TIMEOUT_SECONDS,
    max_retries=0,
)
```

- `with_structured_output(Intent)` para clasificar.
- Tool calling solo si el modelo lo soporta; si no, tools planificadas por reglas.
- 429/timeout → `fake`.

## Fake

- `RuleIntentClassifier`: keywords (`agua`, `precio`, `por qué`, `mapa`).
- `TemplateExplainer`: usa `tool_results`.
- Sin red; determinista.

## Anti-alucinación

```python
def validate_numbers(answer, tool_results) -> bool:
    # extrae números y verifica presencia/redondeo
```

- Si falla: `compose_explanation(template=True)`.
- `warnings.append("explanation_fallback")`.

## Checkpointer

- `AsyncPostgresSaver` en producción demo; `MemorySaver` en tests.
- Dependencia: `langgraph-checkpoint-postgres`.
- `thread_id = f"{user_id}:{parcel_id}:{thread_id}"`.
- TTL; borrar al cerrar demo.

## Rate limit

- 20 mensajes/min por usuario.
- Pregunta ≤ 500 caracteres.
- Timeout 30 s.

## Cobertura RF

| RF | Archivo |
|---|---|
| 021.1 | `agent/graph.py` |
| 021.2 | `nodes/classify.py` |
| 021.3 | `nodes/assess.py` |
| 021.4 | `nodes/tools.py` |
| 021.5 | `nodes/validate.py` |
| 021.6 | `providers/fake.py` |
| 021.7 | `checkpointer.py` |
| 021.8 | `providers/groq.py` |

## Tests

- Unit: ruteo, intención, faltantes, cifras.
- Integration: fake + tools; interrupt.
- Seguridad: hilo ajeno, inyección.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Groq límites | fake/guided |
| Alucinación | validación + plantilla |
| Loop | límite de pasos |
| PII | logs mínimos |
