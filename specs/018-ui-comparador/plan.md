# Plan 018 — UI comparador

## Pantalla

`app/comparison/[id].tsx`:

```text
Header: parcela, período, prioridad, botón Fuentes
PlanCards (horizontal/vertical): Actual | B | C
  - badge estado
  - secuencia
  - agua (mm/déficit/factibilidad)
  - suelo (fertility_status, flags)
  - margen (PEN o No calculable)
  - why/tradeoffs
Timeline por plan
CTA: Simular cambios
Disclaimer
```

## Componentes

- `PlanCard` (RNUI `Card`).
- `WaterRow`: valor/unidad/factibilidad; null → “No disponible”.
- `SoilRow`: `not_measured` → “Fertilidad por verificar”.
- `MarginRow`: null → “No calculable”; `historical` badge.
- `RotationTimeline`: barras por etapa/cultivo; `react-native-svg` o `View`.
- `EvidenceBadge`.
- `SourcesButton` → `sources/[id]`.
- `testID`: `comparison.plan.existing`, `comparison.plan.candidate1`, `comparison.plan.candidate2`, `comparison.margin.null`, `comparison.sources`.

## Estados

- `loading`: skeleton.
- `error`: reintentar.
- `empty`: “Aún no hay comparación”.
- `partial`: banner de datos faltantes.
- `invalid`: tarjeta con motivo.
- `needs_review`: badge.

## Reglas de honestidad

- No ordenar como “ganador” si hay `needs_review`/`invalid`.
- No barra de margen si null.
- No semáforo verde/rojo sin definición.
- Mostrar fuentes y período.

## Cobertura RF

| RF | Archivo |
|---|---|
| 018.1 | `PlanCard.tsx` |
| 018.2 | `RotationTimeline.tsx` |
| 018.3 | `WaterRow/SoilRow/MarginRow` |
| 018.4 | `NullValue` |
| 018.5 | `WhyPanel.tsx` |
| 018.6 | `sources/[id].tsx` |
| 018.7 | `Disclaimer` |
| 018.8 | `.maestro/flows/03-compare.yaml` |

## Tests

- Unit: null, unidades, estados.
- E2E: 3 planes, margen null, fuentes.
- Manual: 5", contraste, scroll.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Null parece 0 | componente explícito |
| Ganador falso | eligibility primero |
| Pantalla densa | cards + progressive disclosure |
| Timeline costoso | SVG simple |
