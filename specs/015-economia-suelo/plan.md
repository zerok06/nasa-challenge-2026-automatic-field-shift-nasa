# Plan 015 — Economía y suelo

## Economía

`services/api/app/services/economics/`:

```text
margin.py
break_even.py
models.py
```

```text
produccion_kg = rendimiento_kg_ha × area_ha
ingreso_pen = produccion_kg × precio_pen_kg
margen_pen = ingreso_pen - costos_totales_pen
precio_equilibrio_pen_kg = costos_totales_pen / produccion_kg
```

- Si `area` null: calcular por ha (`margen_pen_ha`) y no total.
- Si `produccion_kg=0`: precio equilibrio null.
- `confidence`: `complete`/`partial`/`insufficient_inputs`.
- `price_assumption_type`: `farmer`/`historical`/`hypothetical`.
- No llamar “beneficio neto”.

## Suelo

`services/api/app/services/soil_signals/`:

```text
signals.py
models.py
```

Señales:

- `family_repeat_count` (últimas 3 campañas).
- `bare_soil_days` (entre cosecha y siembra).
- `diversity_score` (familias distintas / campañas).
- `texture_reported` / `erosion_observed`.
- `fertility_status`.

Salida:

```json
{
  "fertility_status": "not_measured",
  "risk_flags": ["family_repeat", "bare_soil_gt_60d"],
  "notes": ["Fertilidad por verificar"],
  "method_version": "soil-v0.1"
}
```

- Sin análisis: no puntaje, no “mejora %”.
- Flags cualitativos; la UI explica.

## Tests

| Fixture | Caso |
|---|---|
| `econ_case_01.json` | margen completo |
| `econ_case_02.json` | sin precio → null |
| `econ_case_03.json` | área null → por ha |
| `soil_case_01.json` | familia repetida |
| `soil_case_02.json` | sin análisis → not_measured |

## Cobertura RF

| RF | Archivo |
|---|---|
| 015.1 | `margin.py` |
| 015.2 | `models.py` |
| 015.3 | `price_assumption_type` |
| 015.4 | `signals.py` |
| 015.5 | `fertility_status` |
| 015.6 | copy/docs |
| 015.7 | versiones |
| 015.8 | fixtures |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Margen falso | null + test |
| Puntaje de suelo inventado | no puntaje |
| Precio viejo | etiqueta historical |
| Dosis implícita | prohibición en copy |
