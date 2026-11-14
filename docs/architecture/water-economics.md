# Agua, economía y suelo — métodos canónicos

## Unidades

- Lluvia, ETc, riego: **mm**.
- Volumen: **m³**; equivalentes: **1 mm = 10 m³/ha**.
- Área: **ha**.
- Rendimiento: **kg/ha**; producción: **kg**.
- Precio: **PEN/kg**; margen: **PEN**.
- ETo: **mm/día**; ETc: **mm** por etapa/campaña.

## ETo (POWER no entrega ET0)

Verificado: `ET0`/`ETo` devuelven 422. `EVPTRNS` es MJ/m²/día y `EVLAND` es mm/día de evaporación; no son ETo.

### Método principal: FAO-56 Penman-Monteith

Con variables diarias de POWER:

- `T2M_MAX`, `T2M_MIN` (°C)
- `RH2M` (%)
- `WS2M` (m/s)
- `ALLSKY_SFC_SW_DWN` (MJ/m²/día)
- latitud, elevación, fecha

Fórmula documentada en FAO-56 (cap. 4). Implementar en `water_engine.eto_fao56`.

### Fallback: Hargreaves

Si faltan RH/viento/radiación:

```text
ETo = 0.0023 × (Tmean + 17.8) × sqrt(Tmax - Tmin) × Ra
```

`Ra` se calcula por latitud y día del año. Etiquetar `method="hargreaves"` y `quality_flag="estimated"`.

**Nunca** usar `EVPTRNS` como ETo sin conversión documentada.

## ETc

```text
ETc_mm = Σ (Kc_etapa × ETo_mm_día)
```

- Kc por etapa del catálogo versionado.
- Si falta Kc o ETo: `etc_mm = null`, `missing_inputs`.
- Si el ciclo cruza el horizonte: prorratear por días, documentado.

## Lluvia efectiva

Método inicial: **USDA-SCS** o FAO, documentado y testeado.

```text
Pe = f(P, ETc, suelo, pendiente)   # función versionada
```

- Sin datos de suelo: usar supuesto conservador y `assumption=true`.
- No equiparar lluvia total a efectiva.
- Reportar `rain_effective_mm` y `method`.

## Riego

```text
Necesidad_neta_mm = max(0, ETc_mm - Pe_mm - otros_aportes_mm)
Necesidad_bruta_mm = Necesidad_neta_mm / eficiencia
Déficit_mm = max(0, Necesidad_bruta_mm - agua_disponible_mm)
Volumen_m3_ha = Necesidad_bruta_mm × 10
```

- Eficiencia en (0,1]; default 0.7 solo si se declara supuesto.
- `agua_disponible_mm = volume_m3 / (area_ha × 10)` si hay área y volumen.
- Sin agua: `feasibility="unknown"`, no “suficiente”.
- Sin área: no convertir m³ a mm.
- Turnos de riego sin caudal: no convertir a volumen.

## Economía

```text
produccion_kg = rendimiento_kg_ha × area_ha
ingreso_pen = produccion_kg × precio_pen_kg
margen_pen = ingreso_pen - costos_totales_pen
precio_equilibrio_pen_kg = costos_totales_pen / produccion_kg
```

- Si falta precio, rendimiento, área o costos: `margen=null`, `missing_inputs`.
- El margen no es “beneficio neto contable” salvo costos completos.
- Precios de anuario: `historical`, no oferta actual.
- Comparar mismo horizonte y mismo número de cultivos.

## Suelo

Señales cualitativas, no índice de fertilidad:

- Familia repetida / diversidad.
- Días de suelo desnudo.
- Cobertura potencial.
- Textura declarada, erosión observada.
- Análisis de laboratorio si existe.

Sin análisis: `fertility_status="not_measured"`; no dosis, no puntaje, no “mejora %”.

## Elegibilidad y ranking

1. Validar calendario, duración, familia, agua y restricciones duras.
2. `invalid` si incumple una restricción comprobada.
3. `needs_review` si falta un dato crítico.
4. `eligible` solo si no hay restricciones críticas desconocidas.
5. Mostrar métricas absolutas antes de cualquier puntaje.
6. Si se usa puntaje: fórmula, pesos, normalización, exclusiones y sensibilidad visibles.
7. No declarar “mejor cultivo” universal.

## Escenarios

- `water_multiplier` (ej. 0.8) cambia agua disponible, no precipitación observada.
- `price_multiplier` (ej. 0.85) cambia precio supuesto, no costos/rendimiento.
- Cada escenario es un `analysis_run` hijo; el baseline es inmutable.
- `rainfall_case`: `historical_typical`/`historical_dry` con años/percentiles documentados.
- Etiquetar `hypothetical` vs `historical`.

## Versionado y tests

- `model_version`: `rotation-engine-v0.1`, `water-v0.1`, `econ-v0.1`.
- Fixtures obligatorios:
  - `water_case_01.json`: ETc con Kc y ETo.
  - `water_case_02.json`: déficit con eficiencia.
  - `water_case_03.json`: sin agua → unknown.
  - `econ_case_01.json`: margen completo.
  - `econ_case_02.json`: sin precio → null.
  - `rotation_case_01.json`: 3 planes, uno inválido.
- Tolerancia de paridad: `1e-6`.
