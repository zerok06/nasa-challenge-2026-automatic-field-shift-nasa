# Plan 016 — Generación y validación de rotaciones

## Generador

```python
def generate_candidates(
    parcel, history, catalog, horizon, constraints, max_candidates=2
) -> list[RotationPlan]:
    # 1. plan actual desde history
    # 2. permutaciones de 1-2 cultivos que caben en horizonte
    # 3. filtrar por familia/ventana/restricciones
    # 4. puntuar diversidad y demanda; elegir 2
```

- Semilla fija para reproducibilidad.
- No más de 2 cultivos por plan en MVP.
- Si no hay 2 válidas, completar con `needs_review` y explicar.

## Validador

Estados:

- `invalid`: incumple regla comprobada (ventana, ciclo, familia prohibida, agua insuficiente comprobada).
- `needs_review`: falta dato crítico o restricción desconocida.
- `eligible`: sin restricciones críticas desconocidas.

Reglas MVP:

1. Ventana de siembra y duración dentro del horizonte.
2. No repetir familia inmediata (configurable).
3. No repetir el mismo cultivo en campañas consecutivas.
4. Agua: si déficit >0 y agua conocida → `invalid`; si desconocida → `needs_review`.
5. Restricciones declaradas (equipo, mercado, presupuesto) → `invalid`/`needs_review`.
6. Suelo: familia repetida / suelo desnudo → flag, no siempre invalid.

## Contrato

```json
{
  "plan_id": "candidate_1",
  "kind": "candidate",
  "status": "needs_review",
  "crop_sequence": ["pumpkin", "onion"],
  "horizon": {"start": "2027-01-01", "end": "2027-12-31"},
  "reasons": ["water_unknown"],
  "tradeoffs": ["menor demanda", "requiere revisión de suelo"],
  "missing_inputs": ["water_volume"]
}
```

## Cobertura RF

| RF | Archivo |
|---|---|
| 016.1 | `generator.py` |
| 016.2 | `horizon.py` |
| 016.3 | `catalog.py` |
| 016.4 | `validator.py` |
| 016.5 | `rules.py` |
| 016.6 | `validator.py` |
| 016.7 | `explain.py` |
| 016.8 | sin LLM |

## Tests

- 3 planes con horizonte 12 meses.
- Ventana inválida.
- Familia repetida.
- Agua desconocida → needs_review.
- Sin 2 candidatas elegibles → completar con `needs_review`/`invalid`.
- Determinismo.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Candidatas irreales | catálogo + reglas |
| Falsa elegibilidad | needs_review |
| LLM inventa | prohibido |
| Horizonte injusto | mismo para 3 |
