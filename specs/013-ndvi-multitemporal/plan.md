# Plan 013 — NDVI multitemporal

## Capa

```ts
const NDVI = {
  id: 'VIIRS_SNPP_L3_NDVI_Monthly',
  url: (month: string) =>
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_L3_NDVI_Monthly/default/${month}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`,
  maxZ: 7,
  unit: 'NDVI',
  resolution: '~0.5–1 km',
  source: 'NASA GIBS / VIIRS Suomi NPP',
};
```

- Fecha `YYYY-MM-01`.
- Dos fechas: A/B; mostrar cambio visual, no causalidad.
- `map_context` con `layer_id`, fechas, resolución, fuente.

## UI

- Selector de mes; botón “comparar”.
- `LegendCard` con escala NDVI.
- `MapFallbackCard`.
- `testID`: `map.layer.ndvi`, `map.ndvi.dateA`, `map.ndvi.dateB`.

## Copy

- “NDVI es un índice de vegetación; no diagnostica nutrientes ni enfermedades.”
- “Resolución regional; no mide la parcela.”

## Tests

- Unit: URL, clamp, mes inválido.
- E2E: `02b-ndvi.yaml`; cambiar a NDVI, elegir fecha, ver leyenda.
- Manual: tile 200, 404, offline.

## Cobertura RF

| RF | Archivo |
|---|---|
| 013.1 | `layers.ts` |
| 013.2 | `NdviControls.tsx` |
| 013.3 | `LegendCard.tsx` |
| 013.4 | `MapFallbackCard.tsx` |
| 013.5 | copy/docs |
| 013.6 | `context.ts` |
| 013.7 | cache |
| 013.8 | `.maestro/flows/02b-ndvi.yaml` |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Sobreinterpretación | copy + no diagnóstico |
| Tile 404 | fallback |
| P1 retrasa P0 | timebox; cortar si no hay tiempo |
