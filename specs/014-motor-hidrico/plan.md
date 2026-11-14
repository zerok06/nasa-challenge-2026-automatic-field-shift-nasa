# Plan 014 — Motor hídrico

## Módulo

`services/api/app/services/water_engine/`:

```text
eto.py          # 009
effective_rain.py
etc.py
balance.py
models.py       # dataclasses/Pydantic
```

Funciones puras: sin DB, sin HTTP, `today`/fechas como parámetros.

## Contratos

```python
class WaterInput(BaseModel):
    etc_mm: float | None
    rain_effective_mm: float | None
    available_mm: float | None
    efficiency: float | None
    area_ha: float | None
    volume_m3: float | None

class WaterResult(BaseModel):
    net_irrigation_mm: float | None
    gross_irrigation_mm: float | None
    deficit_mm: float | None
    feasibility: Literal["sufficient","deficit","unknown"]
    missing_inputs: list[str]
    assumptions: list[str]
    method_version: str
```

## Fórmulas

```text
ETc = Σ(Kc × ETo)
Pe = f(P, ETc, soil, slope)          # método documentado
Net = max(0, ETc - Pe - other)
Gross = Net / efficiency
Deficit = max(0, Gross - available)
available = volume_m3 / (area_ha × 10)  # si hay área
```

- `efficiency` default 0.7 solo si se declara supuesto; si no, null.
- `other` = 0 por ahora; documentar.
- `feasibility`:
  - `unknown` si `available` es null.
  - `sufficient` si `deficit=0`.
  - `deficit` si `deficit>0`.

## Lluvia efectiva

- Método inicial USDA-SCS o FAO; elegir uno y documentarlo.
- Si falta suelo, supuesto conservador + `assumptions`.
- No usar lluvia total.

## Tests

Fixtures en `tests/parity/`:

| Fixture | Caso |
|---|---|
| `water_case_01.json` | ETc con Kc/ETo |
| `water_case_02.json` | déficit con eficiencia |
| `water_case_03.json` | sin agua → unknown |
| `water_case_04.json` | lluvia > ETc → neto 0 |
| `water_case_05.json` | área desconocida → no m³↔mm |

- Tolerancia 1e-6.
- Ejecutar en pytest y Jest.

## Integración

- `evaluate_plan` recibe plan + clima + agua.
- Devuelve `WaterResult` + `assumptions`.
- El comparador lo usa; el agente solo explica.

## Cobertura RF

| RF | Archivo |
|---|---|
| 014.1 | `etc.py` |
| 014.2 | `effective_rain.py` |
| 014.3 | `balance.py` |
| 014.4 | `models.py` |
| 014.5 | validadores |
| 014.6 | `method_version` |
| 014.7 | `tests/parity` |
| 014.8 | `feasibility` |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Fórmula mal aplicada | fixture FAO + revisión |
| Falsa precisión | supuestos + etiquetas |
| Paridad TS | fixtures compartidos |
| Eficiencia inventada | null si no se declara |
