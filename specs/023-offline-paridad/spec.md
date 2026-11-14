# Spec 023 — Offline y paridad (P1)

| Campo | Valor |
|---|---|
| ID | 023 |
| Estado | Borrador |
| Prioridad | P1 |
| Dependencias | 018, 019, 022 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

La conectividad en campo es intermitente. El MVP debe abrir la última ficha/comparación y permitir un escenario base sin red. No se promete LLM offline ni mapas nuevos. La paridad Python↔TS se limita a los multiplicadores de escenario, no a todo el motor.

## Usuarios / actores

- Agricultor en campo.
- QA.

## Historias de usuario

- H1: Como agricultor, quiero ver mi última comparación sin señal.
- H2: Como agricultor, quiero simular agua/precio con datos cacheados.
- H3: Como dev, quiero que los números coincidan con Python.

## Requisitos funcionales (EARS)

- **RF-023.1:** EL SISTEMA cachea ficha, contexto, comparación y fuentes en SQLite tras una carga exitosa.
- **RF-023.2:** MIENTRAS no hay red, EL SISTEMA abre lo cacheado y muestra `offline` y `last_updated_at`.
- **RF-023.3:** CUANDO el usuario cambia agua/precio offline, EL SISTEMA recalcula solo métricas derivadas con una función TS versionada.
- **RF-023.4:** EL SISTEMA marca el resultado como `offline_estimate` y no lo presenta como servidor.
- **RF-023.5:** EL SISTEMA encola guardados/ediciones con IDs idempotentes.
- **RF-023.6:** CUANDO vuelve la red, EL SISTEMA sincroniza sin sobrescribir cambios silenciosamente.
- **RF-023.7:** EL SISTEMA detecta paquete/coeficientes vencidos y avisa.
- **RF-023.8:** EL SISTEMA prueba paridad de los multiplicadores con fixtures compartidos.

## Requisitos no funcionales

- Cache < 5 MB por parcela.
- Apertura offline < 1 s.
- Sin crashes por datos corruptos.
- Migraciones SQLite versionadas.
- No secretos en cache.

## Casos límite

- Cache vacío → mensaje “sin datos descargados”.
- Cache corrupto → borrar y pedir red.
- Conflicto al sincronizar → mostrar y elegir.
- Datos vencidos → `stale`.
- Guardado offline duplicado → idempotencia.
- Logout → borrar cache.

## Fuera de alcance

- LLM offline.
- Tiles nuevos.
- Motor completo en TS.
- Multidispositivo.

## Criterios de finalización

- Cache/lectura.
- Escenario offline.
- Cola/sync.
- Paridad.

## Matriz de pruebas

| RF | Test |
|---|---|
| 023.1 | U: cache |
| 023.2 | E: modo avión |
| 023.3 | U/P: multiplicadores |
| 023.4 | U: flag |
| 023.5 | U: cola |
| 023.6 | I: sync |
| 023.7 | U: stale |
| 023.8 | P: fixtures |
