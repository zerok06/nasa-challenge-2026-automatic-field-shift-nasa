# Spec 009 — Ingesta POWER + ETo

| Campo | Valor |
|---|---|
| ID | 009 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 008 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

POWER entrega temperatura, precipitación, radiación, humedad y viento, pero **no ET0**. Necesitamos un adaptador que descargue, valide y versione un snapshot, y un motor que calcule ETo con FAO-56 (o Hargreaves como fallback). El demo no debe depender de la API en vivo.

## Usuarios / actores

- Equipo de datos.
- Motor hídrico.
- Dashboard.

## Historias de usuario

- H1: Como analista, quiero un snapshot reproducible de POWER.
- H2: Como motor, quiero ETo diaria con método declarado.
- H3: Como jurado, quiero ver fuente, unidad y fecha.

## Requisitos funcionales (EARS)

- **RF-009.1:** EL SISTEMA descarga POWER Daily para un punto y período, sin key.
- **RF-009.2:** EL SISTEMA valida unidades, `-999` como faltante y rangos físicos.
- **RF-009.3:** EL SISTEMA calcula ETo FAO-56 Penman-Monteith con Tmax/Tmin/RH/viento/radiación.
- **RF-009.4:** SI faltan RH/viento/radiación, ENTONCES EL SISTEMA usa Hargreaves y lo marca `method=hargreaves`.
- **RF-009.5:** EL SISTEMA escribe un snapshot con manifiesto, checksum y `retrieved_at`.
- **RF-009.6:** EL SISTEMA usa cache/snapshot y marca `stale` si supera TTL; no llama POWER en cada request.
- **RF-009.7:** EL SISTEMA expone una CLI idempotente para generar el snapshot.
- **RF-009.8:** EL SISTEMA prueba ETo contra un ejemplo FAO con tolerancia declarada.

## Requisitos no funcionales

- Snapshot < 2 MB para 1 punto/1 año.
- Descarga < 30 s; reintentos 2.
- Sin credenciales.
- Unidades: °C, mm/día, MJ/m²/día, m/s, %.
- Reproducible por checksum.

## Casos límite

- POWER devuelve `-999` → null, no 0.
- Período fuera de cobertura → error claro.
- Punto en el océano → advertencia.
- API caída → usar último snapshot o `missing`.
- Año bisiesto.
- Zona horaria: POWER usa LST; documentar.

## Fuera de alcance

- Estación meteorológica local.
- Pronóstico.
- Raster.

## Criterios de finalización

- Snapshot real de Moquegua.
- ETo calculada y testeada.
- Cache/stale.
- Manifiesto.

## Matriz de pruebas

| RF | Test |
|---|---|
| 009.1 | I: fetch |
| 009.2 | U: -999/rangos |
| 009.3 | U: FAO fixture |
| 009.4 | U: Hargreaves |
| 009.5 | U: manifiesto |
| 009.6 | U: stale |
| 009.7 | I: CLI idempotente |
| 009.8 | U: tolerancia |
