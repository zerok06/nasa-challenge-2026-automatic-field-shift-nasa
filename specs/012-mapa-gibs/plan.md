# Plan 012 — Mapa y capa GIBS

## Librería

`npx expo install react-native-maps`

- `react-native-maps` (`MapView`, `Marker`, `Polygon`, `UrlTile`).
- Android: Google Maps key en `app.config.ts` (`android.config.googleMaps.apiKey`).
- iOS: Apple Maps; sin key.
- `UrlTile` con `maximumZ`, `minimumZ`, `tileSize=256`.

## Capa

```ts
const IMERG = {
  id: 'IMERG_Precipitation_Rate',
  url: (date: string) =>
    `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${date}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`,
  maxZ: 6,
  unit: 'mm/hr',
  resolution: '0.1 degree',
  source: 'NASA GIBS / GPM IMERG',
};
```

- Fecha `YYYY-MM-DD`; default demo `2024-06-01` o la más reciente disponible.
- Al cambiar fecha, remount del tile layer para evitar cache cruzado.
- No pedir tiles a z>6; mostrar “acercá menos para ver la capa regional”.
- `GET /parcels/{id}/layers` devuelve metadatos (id, maxZ, unidad, resolución, fuente, fechas); la app usa fallback local si falla.

## UI

- `MapScreen` con `MapView`, parcela, selector de capa/fecha, leyenda.
- `LegendCard`: gradiente + unidad + fuente + fecha + resolución.
- `MapFallbackCard`: si tiles fallan, muestra `IndicatorCard` y “sin imagen”.
- `testID`: `map.view`, `map.layer.imerg`, `map.legend`, `map.date`.

## `map_context`

```json
{
  "layer_id": "IMERG_Precipitation_Rate",
  "date": "2024-06-01",
  "variable": "precipitation_rate",
  "unit": "mm/hr",
  "resolution": "0.1 degree",
  "zoom": 6,
  "source": "NASA GIBS / GPM IMERG",
  "quality_flag": "satellite_estimate",
  "stats_ref": "indicator_123"
}
```

## Fallback

- Error de tile → no reintentar infinito; tarjeta.
- Sin key Google → mapa base puede fallar; mostrar coordenadas + capa.
- Sin red → cache; no nuevas fechas.

## Cobertura RF

| RF | Archivo |
|---|---|
| 012.1 | `src/features/map/MapScreen.tsx` |
| 012.2 | `layers.ts`, `UrlTile` |
| 012.3 | `LegendCard.tsx` |
| 012.4 | `MapFallbackCard.tsx` |
| 012.5 | `src/features/map/context.ts` |
| 012.6 | `app.config.ts` |
| 012.7 | `.maestro/flows/02-map.yaml` |
| 012.8 | `clampZoom` |

## Tests

- Unit: URL, maxZ, fecha inválida, context.
- E2E: abrir mapa, capa, leyenda.
- Manual: dispositivo, zoom, tile 400, offline.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| IMERG 400 en z7 | maxZ 6 + mensaje |
| Google key | GCP + restricción |
| Tile viejo cacheado | remount por fecha |
| Imagen falsa | fallback explícito |
