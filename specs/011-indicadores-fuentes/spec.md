# Spec 011 — Indicadores y fuentes

| Campo | Valor |
|---|---|
| ID | 011 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 009, 010 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El agricultor necesita una síntesis comprensible: lluvia, temperatura y ETo, con fuente y fecha. No basta un número; hay que mostrar resolución, período y calidad. Este spec conecta los snapshots con el dashboard y la ficha de fuentes.

## Usuarios / actores

- Agricultor.
- Agente (evidencia).
- Jurado (auditoría).

## Historias de usuario

- H1: Como agricultor, quiero ver la lluvia y temperatura de mi zona.
- H2: Como agricultor, quiero saber de dónde sale cada número.
- H3: Como jurado, quiero verificar fuente y resolución.

## Requisitos funcionales (EARS)

- **RF-011.1:** EL SISTEMA calcula indicadores de lluvia acumulada, Tmin/Tmax y ETo para el período solicitado.
- **RF-011.2:** EL SISTEMA adjunta `source`, `snapshot_id`, `period`, `unit`, `resolution` y `quality_flag` a cada indicador.
- **RF-011.3:** SI falta un dato, ENTONCES EL SISTEMA devuelve `value=null` y `missing`, nunca 0.
- **RF-011.4:** EL SISTEMA expone `GET /parcels/{id}/indicators?period=`.
- **RF-011.5:** EL SISTEMA expone `GET /sources/{snapshot_id}` con procedencia completa.
- **RF-011.6:** EL SISTEMA muestra tarjetas de dashboard con valor, unidad, período y fuente.
- **RF-011.7:** SI el snapshot está vencido, ENTONCES EL SISTEMA muestra `stale` y la fecha de actualización.
- **RF-011.8:** CUANDO se ejecuta Maestro, EL FLUJO `01-onboarding` ve al menos una tarjeta con fuente.

## Requisitos no funcionales

- p95 < 300 ms con cache.
- Sin llamadas a NASA en el request.
- Textos cortos; unidades visibles.
- Accesibilidad: no solo color.

## Casos límite

- Período sin cobertura → null + missing.
- Múltiples snapshots → elegir el más reciente no vencido.
- Valores `-999` → null.
- Percentiles con pocos años → advertencia.
- Unidad distinta → normalizar a mm/°C.
- Snapshot sintético → etiqueta.

## Fuera de alcance

- Pronóstico.
- Series interactivas avanzadas.
- NDVI (013).

## Criterios de finalización

- Indicadores + fuentes.
- Dashboard.
- Stale/missing.
- Tests.

## Matriz de pruebas

| RF | Test |
|---|---|
| 011.1 | U: cálculos |
| 011.2 | C: contrato |
| 011.3 | U: null |
| 011.4 | I: endpoint |
| 011.5 | I: sources |
| 011.6 | E: dashboard |
| 011.7 | U: stale |
| 011.8 | E: Maestro |
