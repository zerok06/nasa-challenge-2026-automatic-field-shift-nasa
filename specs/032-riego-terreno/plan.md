# Plan 032 — Riego semanal y terreno real

## Backend

1. `app/use_cases/weather.py`
   - Cliente Open-Meteo con timeout, validación y caché de 30 min.
   - Parseo de series diarias y errores tipados.
2. `app/use_cases/terrain.py`
   - SRTM 90 m vía OpenTopoData con 9 muestras (centro + vecinos).
   - Fallback Open-Meteo Elevation (Copernicus GLO-90), fuente explícita.
   - Caché en `parcels.terrain_json`; migración idempotente.
3. `app/use_cases/irrigation.py`
   - Une pronóstico, terreno y última agua declarada.
   - Lluvia efectiva 0.8; demanda = max(0, ETo − lluvia efectiva).
   - Devuelve códigos de consejo, no copy duplicado.
4. `GET /api/v1/parcels/{id}/irrigation`.
5. `geo/discover`: SRTM disponible, Open-Meteo y Copernicus.
6. Tests unitarios/integración con HTTP mockeado.

## App

1. Tipos y endpoint `getIrrigation`.
2. Pantalla `parcel-irrigation`:
   - resumen: lluvia, ETo, demanda y agua declarada;
   - gráfico de barras + tabla diaria;
   - terreno: elevación, pendiente y fuente;
   - avisos y fuentes.
3. Acceso desde Mi parcela y desde Inicio (acción “Riego de la semana”).
4. i18n español/inglés.
5. testIDs estables y Maestro `10-riego`.

## Riesgos

- OpenTopoData público tiene límite de uso; se cachea por parcela y se etiqueta.
- Open-Meteo no es una predicción oficial del SENAMHI; se declara.
- La ETo de referencia no es la demanda del cultivo; se explica.
