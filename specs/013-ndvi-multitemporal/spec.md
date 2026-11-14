# Spec 013 — NDVI multitemporal (P1)

| Campo | Valor |
|---|---|
| ID | 013 |
| Estado | Borrador |
| Prioridad | P1 |
| Dependencias | 012 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

Sumar una segunda capa NASA (NDVI VIIRS mensual) mejora el contexto visual y la narrativa de cambio. Es P1: no debe retrasar el recorrido P0. No se usa para diagnosticar nutrientes ni enfermedades.

## Usuarios / actores

- Agricultor.
- Agente/capa.
- Jurado.

## Historias de usuario

- H1: Como agricultor, quiero ver cómo cambia la vegetación en el tiempo.
- H2: Como jurado, quiero otra fuente NASA con fecha/resolución.

## Requisitos funcionales (EARS)

- **RF-013.1:** EL SISTEMA activa `VIIRS_SNPP_L3_NDVI_Monthly` con `maximumZ=7`.
- **RF-013.2:** EL SISTEMA permite elegir mes y comparar dos fechas.
- **RF-013.3:** EL SISTEMA muestra leyenda, unidad, resolución y fuente.
- **RF-013.4:** SI no hay tile, ENTONCES EL SISTEMA muestra fallback; no inventa imagen.
- **RF-013.5:** EL SISTEMA no usa NDVI para diagnosticar nutrientes, enfermedades ni “salud del suelo”.
- **RF-013.6:** EL SISTEMA entrega `map_context` de NDVI al agente.
- **RF-013.7:** EL SISTEMA cachea la última fecha válida y la marca `stale` si aplica.
- **RF-013.8:** EL SISTEMA prueba zoom, fecha y cambio de capa con Maestro.

## Requisitos no funcionales

- Cambio de fecha < 2 s.
- Sin crashes por 400/404.
- Accesibilidad de leyenda.
- P1: se puede cortar sin afectar P0.

## Casos límite

- Mes sin datos → 404 → fallback.
- Zoom 8 → no pedir tiles.
- Nubes/calidad → NDVI puede faltar; no imputar.
- Comparación de fechas → no afirmar causalidad.

## Fuera de alcance

- Series por parcela.
- NDVI de Sentinel-2.
- Diagnóstico agronómico.

## Criterios de finalización

- Capa + fechas.
- Leyenda/contexto.
- Fallback/cache.
- Maestro.

## Matriz de pruebas

| RF | Test |
|---|---|
| 013.1 | U: URL/maxZ |
| 013.2 | E: fechas |
| 013.3 | E: leyenda |
| 013.4 | U: fallback |
| 013.5 | M: copy |
| 013.6 | U: context |
| 013.7 | U: stale |
| 013.8 | E: Maestro |
