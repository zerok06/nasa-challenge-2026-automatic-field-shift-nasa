# Spec 017 — API de comparación y escenarios

| Campo | Valor |
|---|---|
| ID | 017 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 016 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El motor ya calcula; ahora necesitamos un contrato estable para que la app, el agente y los tests consuman la misma comparación. También escenarios de agua/precio sin mutar el baseline. Es el punto donde se unifican las vistas.

## Usuarios / actores

- App mobile.
- Agente.
- QA/jurado.

## Historias de usuario

- H1: Como app, quiero una comparación versionada.
- H2: Como agricultor, quiero simular sin perder el baseline.
- H3: Como QA, quiero idempotencia y contrato claro.

## Requisitos funcionales (EARS)

- **RF-017.1:** CUANDO se crea una comparación, EL SISTEMA devuelve 3 planes, período, fuentes, versión y warnings.
- **RF-017.2:** EL SISTEMA persiste `analysis_run` y planes; GET devuelve el mismo resultado inmutable.
- **RF-017.3:** EL SISTEMA usa el mismo horizonte/unidades y rechaza mezclas.
- **RF-017.4:** SI faltan datos, ENTONCES EL SISTEMA devuelve `null` + `missing_inputs`, no 0.
- **RF-017.5:** EL SISTEMA exige `Idempotency-Key` en POST y no duplica.
- **RF-017.6:** CUANDO se simula, EL SISTEMA crea un run hijo con `parent_run_id` y no altera el baseline.
- **RF-017.7:** EL SISTEMA valida multiplicadores (agua/precio) y etiqueta `hypothetical`.
- **RF-017.8:** EL SISTEMA incluye `source_snapshots` y `model_version` en la respuesta.

## Requisitos no funcionales

- Comparación < 500 ms con snapshots.
- Escenario < 300 ms.
- Contrato OpenAPI estable.
- Persistencia inmutable.
- 100 usuarios; índices.

## Casos límite

- Idempotency-Key repetida con body distinto → 409.
- Baseline no existe → 404.
- Multiplicador ≤0 o >2 → 422.
- Sin snapshots → `partial` + warning.
- Plan inválido → se incluye con estado, no se omite.
- Concurrencia en el mismo run → lock/unique.

## Fuera de alcance

- Streaming.
- Colas.
- Historial de escenarios (P2).

## Criterios de finalización

- POST/GET/simulate.
- Contrato y tests.
- Idempotencia.
- Escenario hijo.

## Matriz de pruebas

| RF | Test |
|---|---|
| 017.1 | C: contrato |
| 017.2 | I: persistencia |
| 017.3 | U: horizonte/unidades |
| 017.4 | U: nulls |
| 017.5 | I: idempotencia |
| 017.6 | I: escenario |
| 017.7 | U: multiplicadores |
| 017.8 | C: fuentes/versión |
