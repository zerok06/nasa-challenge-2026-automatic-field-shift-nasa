# Spec 012 — Mapa y capa GIBS

> **Estado: superseded por Spec 028 (14-nov-2026).** La app ya no muestra mapas;
> la ubicación se resuelve con GPS y coordenadas avanzadas. Este documento queda
> como referencia histórica de las capas NASA GIBS.

| Campo | Valor |
|---|---|
| ID | 012 |
| Estado | Superseded |
| Prioridad | P0 |
| Dependencias | 005, 010, 003 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El mapa aporta contexto territorial y evidencia NASA visual. Usaremos `react-native-maps` con `UrlTile` de GIBS; la capa IMERG es regional (~11 km) y solo funciona hasta zoom 6. No se falsifica una imagen si el tile falla.

## Usuarios / actores

- Agricultor.
- Agente (`map_context`).
- Jurado.

## Historias de usuario

- H1: Como agricultor, quiero ver mi parcela en el mapa.
- H2: Como agricultor, quiero ver la lluvia de la zona con fecha y fuente.
- H3: Como jurado, quiero saber que es contexto, no medición.

## Requisitos funcionales (EARS)

- **RF-012.1:** EL SISTEMA muestra un mapa base con la parcela como punto o polígono.
- **RF-012.2:** EL SISTEMA activa la capa `IMERG_Precipitation_Rate` con `maximumZ=6` y fecha seleccionable.
- **RF-012.3:** EL SISTEMA muestra leyenda, unidad, fecha, resolución y fuente de la capa.
- **RF-012.4:** SI el tile falla o no hay red, ENTONCES EL SISTEMA muestra una tarjeta de respaldo, nunca una imagen falsa.
- **RF-012.5:** EL SISTEMA entrega `map_context` con capa, fecha, unidad, resolución y `stats_ref` al agente.
- **RF-012.6:** EL SISTEMA usa Google Maps en Android con key restringida; si falta, muestra fallback.
- **RF-012.7:** CUANDO se ejecuta Maestro, EL FLUJO `02-map` abre el mapa y ve la leyenda.
- **RF-012.8:** EL SISTEMA no permite zoom >6 con IMERG; informa “vista regional”.

## Requisitos no funcionales

- Carga de mapa < 3 s en 4G.
- Sin crashes por tiles 400/404.
- Accesibilidad: leyenda textual.
- No tiles offline nuevos.

## Casos límite

- Zoom 7 con IMERG → no pedir tile; mensaje.
- Fecha sin datos → 404 → fallback.
- Sin key Google → mapa base alternativo/fallback.
- Polígono grande → encuadre.
- Modo avión → solo cache.
- Tile de otra fecha → prohibido.

## Fuera de alcance

- NDVI (013).
- Edición visual de polígono.
- Tiles offline.

## Criterios de finalización

- Mapa + parcela.
- IMERG con leyenda/fecha.
- Fallback.
- Maestro.

## Matriz de pruebas

| RF | Test |
|---|---|
| 012.1 | E: mapa |
| 012.2 | U: URL/maxZ |
| 012.3 | E: leyenda |
| 012.4 | U: fallback |
| 012.5 | U: map_context |
| 012.6 | M: key/Android |
| 012.7 | E: Maestro |
| 012.8 | U: clamp |
