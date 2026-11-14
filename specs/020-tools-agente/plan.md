# Plan 020 — Tools del agente

## Registry

```python
TOOLS = {
  "get_parcel_context": ToolSpec(fn, Input, Output, timeout=2),
  "get_climate_summary": ...,
  "compare_rotations": ...,
  "simulate_scenario": ...,
  "propose_ui_action": ...,
  "propose_save_plan": ...,
}
```

## Tools

| Tool | Input | Output | Efecto |
|---|---|---|---|
| `get_parcel_context` | `parcel_id` | ficha + faltantes | lectura |
| `get_climate_summary` | `parcel_id`, `period` | indicadores | lectura |
| `compare_rotations` | `parcel_id`, `horizon`, `priorities` | comparación | cálculo |
| `simulate_scenario` | `comparison_id`, multipliers | comparación hija | cálculo |
| `propose_ui_action` | enum + payload | propuesta | presentación |
| `propose_save_plan` | `plan_id`, `name` | proposal | escritura pendiente |

## Seguridad

- `user_id` inyectado por el runtime, no por el LLM.
- `parcel_id` verificado contra owner.
- Sin `**kwargs`; Pydantic `extra="forbid"`.
- URLs solo de allowlist (GIBS/POWER) o ninguna.
- Timeout + 1 retry para lecturas.

## Fake

- `FakeToolRuntime` devuelve fixtures por `parcel_demo_01`.
- Permite tests de grafo sin DB/red/LLM.
- No se usa en producción salvo `APP_ENV=test`.

## `tool_trace`

```json
{"tool":"compare_rotations","status":"ok","latency_ms":42,"summary":"3 planes"}
```

- Sin argumentos sensibles ni resultados completos.
- La UI muestra tarjetas.

## Errores

| Caso | Código |
|---|---|
| parcela ajena | not_found |
| falta dato | insufficient_data |
| NASA/LLM caído | upstream_unavailable |
| timeout | upstream_unavailable |
| payload inválido | validation_error |

## Cobertura RF

| RF | Archivo |
|---|---|
| 020.1 | `agent/tools/registry.py` |
| 020.2 | `agent/tools/schemas.py` |
| 020.3 | `agent/tools/auth.py` |
| 020.4 | `runner.py` |
| 020.5 | `allowlist.py` |
| 020.6 | `fake_runtime.py` |
| 020.7 | `trace.py` |
| 020.8 | `errors.py` |

## Tests

- Unit: schemas, auth, timeout, allowlist.
- Integration: tools fake + DB.
- Seguridad: IDOR, payload extra.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| LLM elige tool arbitraria | allowlist |
| Tool filtra datos | auth interna |
| Timeout cuelga | límite |
| Trace con PII | resumen |
