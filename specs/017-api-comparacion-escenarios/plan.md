# Plan 017 — API de comparación y escenarios

## Endpoints

| Método | Ruta | Cuerpo |
|---|---|---|
| POST | `/comparisons` | `parcel_id`, `horizon`, `priorities` |
| GET | `/comparisons/{id}` | — |
| POST | `/comparisons/{id}/simulate` | `water_multiplier`, `price_multiplier`, `rainfall_case` |

## Servicio

```python
async def create_comparison(user, req) -> Comparison:
    parcel = get_parcel_or_404(...)
    context = build_context(...)
    plans = generate_candidates(...)
    results = [evaluate_plan(p, context) for p in plans]
    run = save_analysis(kind="comparison", ...)
    return comparison_contract(run)
```

- `analysis_runs.results_json` guarda el contrato.
- `rotation_plans` + steps persistidos.
- Baseline inmutable; escenario hijo.

## Contrato

`docs/architecture/api-surface.md` y `data-model.md`.

Campos obligatorios por plan:

- `plan_id`, `label`, `kind`, `status`.
- `crop_sequence`.
- `water`: `net_irrigation_mm`, `gross_irrigation_mm`, `available_mm`, `feasibility`.
- `soil`: `fertility_status`, `risk_flags`.
- `economics`: `margin_pen`, `confidence`.
- `risk_flags`, `missing_inputs`, `assumptions`, `why_this_plan`, `tradeoffs`.

## Idempotencia

- Header `Idempotency-Key` obligatorio.
- Tabla/almacén de claves por usuario; body hash.
- Repetida igual → mismo resultado; distinta → 409.

## Escenarios

```json
{"water_multiplier": 0.8, "price_multiplier": 0.85, "rainfall_case": "historical_dry"}
```

- Validar 0 < multiplier ≤ 2.
- `scenario_type="hypothetical"` o `historical`.
- No cambiar precipitación observada con `water_multiplier`.
- `price_multiplier` no cambia costos/rendimiento.

## Errores

- `insufficient_data`: resultado parcial con warnings, HTTP 200.
- `conflict`: idempotencia.
- `validation_error`: multiplicadores.
- `not_found`: baseline/parcela.

## Cobertura RF

| RF | Archivo |
|---|---|
| 017.1 | `api/v1/comparisons.py` |
| 017.2 | `services/analysis.py` |
| 017.3 | `validators/horizon.py` |
| 017.4 | `contract.py` |
| 017.5 | `idempotency.py` |
| 017.6 | `services/scenario.py` |
| 017.7 | validadores |
| 017.8 | `contract.py` |

## Tests

- Contract: schema.
- Integration: persistencia, idempotencia, escenario.
- Unit: horizonte, multiplicadores, nulls.
- Concurrency: dos POST misma key.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Mutar baseline | run hijo + test |
| Duplicados | idempotencia |
| Unidades mezcladas | validador |
| Contrato cambia | OpenAPI drift |
