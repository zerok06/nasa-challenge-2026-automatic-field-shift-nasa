# Mapa y capas NASA

## Decisión

Mapa con `react-native-maps` + `UrlTile` de **NASA GIBS**. Sin tile server propio y sin key para GIBS.

## Capas verificadas (14-nov-2026)

| Capa | ID GIBS | TileMatrixSet | Zoom máx | Tiempo |
|---|---|---|---|---|
| Precipitación IMERG | `IMERG_Precipitation_Rate` | `GoogleMapsCompatible_Level6` | **6** | diario `YYYY-MM-DD` |
| IMERG 30 min | `IMERG_Precipitation_Rate_30min` | `GoogleMapsCompatible_Level6` | 6 | `YYYY-MM-DDTHH:MM:SSZ` |
| NDVI VIIRS | `VIIRS_SNPP_L3_NDVI_Monthly` | `GoogleMapsCompatible_Level7` | **7** | mensual `YYYY-MM-01` |

Plantilla:

```text
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/{fecha}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png
https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_L3_NDVI_Monthly/default/{fecha}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png
```

**Verificado:** IMERG responde 200/PNG en zoom 6 y 400 en zoom 7. NDVI responde 200 en zoom 7.

## Comportamiento

- `UrlTile` con `maximumZ={6}` para IMERG y `maximumZ={7}` para NDVI; `minimumZ` 3–4.
- La capa es **contexto regional**, no medición de parcela. IMERG ~0,1° (~11 km).
- La parcela se dibuja como punto o polígono; el área se calcula en PostGIS.
- Vista inicial: zoom 5–6, centrada en la parcela; no permitir zoom profundo con la capa activa.
- Selector de fecha; no reutilizar una imagen de otra fecha.
- Leyenda con unidad, fecha, resolución y fuente; enlace a `sources`.
- Si el tile falla o no hay red: tarjeta de respaldo con el indicador cacheado y “sin imagen”; **nunca** una imagen satelital falsa.
- NDVI: mismo patrón; P1.
- Offline: no se prometen tiles nuevos; solo los cacheados por la librería.

## Google Maps

- `react-native-maps` usa Google Maps en Android; el build necesita `GOOGLE_MAPS_API_KEY`.
- iOS usa Apple Maps sin key.
- Restringir la key por package/bundle ID y API; cuota baja.
- Si no hay key: el mapa base puede fallar; mostrar ubicación + tarjeta de capa, no pantalla vacía.

## `map_context` para el agente

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

Nunca pasar solo una captura sin metadatos.

## Provenance

- `dataset_snapshot` o `data_source` con provider, producto, versión, fecha, resolución, licencia.
- En la UI: “NASA GIBS · IMERG · 2024-06-01 · 0,1° · contexto regional”.
- En el README y en `docs/data-licenses.md`: atribución.

## Tests

- U: constructor de URL, clamp de zoom, fecha inválida.
- E2E: abrir mapa, activar IMERG, ver leyenda/fecha; cambiar a NDVI (P1).
- M: dispositivo real, zoom 6/7, tile 400 controlado, modo avión.
