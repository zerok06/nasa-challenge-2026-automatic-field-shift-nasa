# Licencias y atribución de datos

> Verificar términos y citas al momento de publicar. Este documento es una guía, no asesoría legal.

## Código

- **MIT** (`LICENSE`).
- Dependencias con sus licencias; revisar antes de distribuir el APK.

## NASA

| Fuente | Uso | Licencia/atribución |
|---|---|---|
| NASA POWER | Temperatura, precipitación, radiación, viento | Datos abiertos NASA; citar “NASA POWER (MERRA-2)” y URL |
| NASA GIBS | Tiles IMERG, NDVI | Citar “NASA GIBS / GPM IMERG” y fecha; seguir términos GIBS |
| GPM IMERG | Precipitación satelital | Citar “NASA GPM IMERG”; producto y versión |
| NASA Landsat/Sentinel | P2 | Citar producto y procesamiento |

- No afirmar que NASA avala el proyecto.
- Mostrar resolución y limitaciones junto al dato.

## Agronomía

- **FAO-56** para ETo y Kc; citar FAO Irrigation and Drainage Paper 56.
- **FAO** para lluvia efectiva, si se usa.
- Anuario Agropecuario Moquegua 2023: citar documento, año y tabla; es precio histórico, no oferta actual.
- Catálogo de cultivos: fuentes por fila; `needs_review` hasta revisión local.

## Mapas y librerías

- Google Maps: términos de Google; key restringida; no usar tiles fuera de lo permitido.
- Apple Maps: términos de Apple.
- OpenStreetMap (si se usa base): atribución OSM.
- RNUI, Expo, FastAPI, LangGraph: licencias de cada proyecto.

## Datos de agricultores

- Consentimiento informado; finalidad; minimización.
- No publicar parcelas, rendimientos ni precios individuales.
- Exportación/borrado a solicitud.
- Datos demo sintéticos claramente etiquetados.

## Frases de atribución en la app

- “Contexto regional NASA GIBS/IMERG; no es medición de parcela.”
- “Temperatura/lluvia de NASA POWER (MERRA-2), reanálisis.”
- “Kc y supuestos basados en FAO-56; pendiente de revisión local.”
- “Precio histórico de referencia; no es precio actual.”
