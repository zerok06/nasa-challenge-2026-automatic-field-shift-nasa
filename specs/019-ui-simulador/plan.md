# Plan 019 — UI simulador

## Pantalla

`app/scenario/[id].tsx`:

```text
Header: comparación baseline
WaterPresets: 100% | -10% | -20% | -30%
PricePresets: 100% | -10% | -15% | -30%
Plan rows: antes → después
  - agua: déficit/factibilidad
  - margen: PEN o No calculable
Explanation
Reset
```

## Estado

- `baseline` desde 018.
- `scenario` desde API.
- `useMutation` con key `scenario:{id}:{water}:{price}`.
- Cancelar request anterior con AbortController.
- `scenario_id` en el estado; reset vuelve a baseline.

## Componentes

- `PresetChips` (RNUI `Chip`/`Button`).
- `BeforeAfterRow`.
- `DeltaBadge` (sin color-only).
- `ExplanationPanel`.
- `testID`: `scenario.water.preset20`, `scenario.price.preset15`, `scenario.reset`, `scenario.result`.

## Copy

- “Con 20 % menos agua, el déficit estimado cambia de X a Y.”
- “El precio no cambia el rendimiento ni los costos.”
- “Si falta margen, no se calcula.”

## Cobertura RF

| RF | Archivo |
|---|---|
| 019.1 | `PresetChips.tsx` |
| 019.2 | `useScenario.ts` |
| 019.3 | `BeforeAfterRow.tsx` |
| 019.4 | `reset` |
| 019.5 | `MarginRow` null |
| 019.6 | `ExplanationPanel` |
| 019.7 | `.maestro/flows/04-scenario.yaml` |
| 019.8 | `scenario_id` |

## Tests

- Unit: presets, diff, null.
- E2E: aplicar/reiniciar.
- Manual: 5", doble tap.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Mutar baseline | API hija + test |
| Null → 0 | componente |
| Requests race | AbortController |
| Copy confuso | frases cortas |
