# Spec 016 — Generación y validación de rotaciones

| Campo | Valor |
|---|---|
| ID | 016 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 014, 015 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El comparador debe incluir la rotación actual y dos alternativas, no una lista infinita ni una recomendación libre del LLM. Un generador construye secuencias desde el catálogo y un validador aplica reglas de calendario, familia y restricciones. El resultado es `eligible`, `needs_review` o `invalid`, con motivos.

## Usuarios / actores

- Agricultor.
- Motor de comparación.
- Agrónomo.

## Historias de usuario

- H1: Como agricultor, quiero comparar mi rotación con dos alternativas realistas.
- H2: Como agrónomo, quiero ver por qué una opción es inválida.
- H3: Como dev, quiero reglas testeables, no prompts.

## Requisitos funcionales (EARS)

- **RF-016.1:** CUANDO se solicita comparar, EL SISTEMA genera exactamente 3 planes: actual + 2 candidatas.
- **RF-016.2:** EL SISTEMA usa el mismo horizonte y la misma parcela para los 3 planes.
- **RF-016.3:** EL SISTEMA construye candidatas solo con cultivos del catálogo versionado.
- **RF-016.4:** SI una candidata no cabe en la ventana o excede el ciclo, ENTONCES EL SISTEMA la marca `invalid` con motivo.
- **RF-016.5:** SI repite familia no permitida o incumple una restricción declarada, ENTONCES EL SISTEMA la marca `invalid` o `needs_review`.
- **RF-016.6:** SI falta un dato crítico (agua, ventana, Kc), ENTONCES EL SISTEMA marca `needs_review`; no `eligible`.
- **RF-016.7:** EL SISTEMA explica cada plan con `why_this_plan` y `tradeoffs` desde hechos estructurados.
- **RF-016.8:** EL SISTEMA no genera cultivos ni secuencias desde el LLM.

## Requisitos no funcionales

- Generación < 50 ms para 3 cultivos.
- Determinista con semilla.
- Sin DB en el generador (recibe catálogo/historial).
- Motivos legibles en español.
- Versionado `rotation-engine-v0.1`.

## Casos límite

- Horizonte demasiado corto para 2 cultivos → 1 cultivo o inválido.
- Cultivo sin ventana → `needs_review`.
- Antecedente fue zapallo y candidata repite zapallo → warning/invalid según regla.
- Semilla/equipo no disponible → restricción declarada.
- Mercado desconocido → no inválido, `needs_review`.
- Si no hay 2 candidatas elegibles, completar con `needs_review`/`invalid` y explicar; el demo siempre muestra 3 tarjetas.

## Fuera de alcance

- Optimización multicriterio avanzada.
- Rotaciones de 5+ cultivos.
- Recomendación prescriptiva.

## Criterios de finalización

- 3 planes.
- Validaciones.
- Motivos.
- Tests.

## Matriz de pruebas

| RF | Test |
|---|---|
| 016.1 | U: 3 planes |
| 016.2 | U: horizonte |
| 016.3 | U: catálogo |
| 016.4 | U: ventana |
| 016.5 | U: familia |
| 016.6 | U: needs_review |
| 016.7 | U: why/tradeoffs |
| 016.8 | U: no LLM |
