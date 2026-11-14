# Spec 010 — Ingesta IMERG + procedencia

| Campo | Valor |
|---|---|
| ID | 010 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 008 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

GPM IMERG aporta precipitación satelital (~0,1°, ~11 km) para contexto histórico. No es medición de parcela y requiere Earthdata. Necesitamos un snapshot versionado, agregados y procedencia; el demo no debe depender de GES DISC en vivo.

## Usuarios / actores

- Equipo de datos.
- Motor hídrico/dashboard.
- Jurado que audita fuentes.

## Historias de usuario

- H1: Como analista, quiero un snapshot IMERG reproducible.
- H2: Como motor, quiero lluvia mensual/diaria con unidad.
- H3: Como agricultor, quiero saber que es estimación regional.

## Requisitos funcionales (EARS)

- **RF-010.1:** EL SISTEMA descarga/subsetea IMERG Final para un bbox y período con credenciales Earthdata.
- **RF-010.2:** EL SISTEMA valida unidad, cobertura, faltantes y resolución 0,1°.
- **RF-010.3:** EL SISTEMA calcula agregados diarios/mensuales y percentiles documentados.
- **RF-010.4:** EL SISTEMA escribe un snapshot con manifiesto, checksum y `retrieved_at`.
- **RF-010.5:** EL SISTEMA registra fuente, producto, versión, resolución, período y método.
- **RF-010.6:** SI falta el snapshot o está vencido, ENTONCES EL SISTEMA devuelve `missing`/`stale`; nunca inventa lluvia.
- **RF-010.7:** EL SISTEMA expone una CLI idempotente y no corre en el request de la API.
- **RF-010.8:** EL SISTEMA distingue dato real (`is_simulated=false`) de extracto demo sintético (`true`).

## Requisitos no funcionales

- Snapshot < 5 MB para 1 punto/10 años.
- Descarga < 5 min; reintentos 2.
- Credenciales solo en ingest.
- Sin rasters en DB.
- Reproducible por checksum.

## Casos límite

- Earthdata 401 → mensaje claro, no reintentar infinito.
- Granulo con nubes/calidad → documentar.
- Período sin datos → `missing`.
- Bbox grande → limitar a bbox piloto.
- Latencia Final → no presentar como tiempo real.
- Versión de producto cambia → nuevo snapshot.

## Fuera de alcance

- IMERG Early/Late en vivo.
- Raster por parcela.
- Corrección con pluviómetro.

## Criterios de finalización

- Snapshot real o extracto etiquetado.
- Agregados y manifiesto.
- Procedencia visible.
- Tests.

## Matriz de pruebas

| RF | Test |
|---|---|
| 010.1 | I: fetch (mock/real) |
| 010.2 | U: validación |
| 010.3 | U: agregados |
| 010.4 | U: manifiesto |
| 010.5 | C: sources |
| 010.6 | U: missing/stale |
| 010.7 | I: CLI |
| 010.8 | U: flag |
