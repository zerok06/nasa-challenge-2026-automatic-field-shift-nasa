# Spec 008 — Catálogo de cultivos y supuestos

| Campo | Valor |
|---|---|
| ID | 008 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 001 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El motor no puede inventar cultivos, Kc ni ventanas. Necesitamos un catálogo pequeño, versionado y revisable para cebolla, zapallo y ají, con fuentes y estado de revisión. Es la base de la generación y validación de rotaciones.

## Usuarios / actores

- Agrónomo revisor.
- Motor de rotaciones.
- Agricultor (ve nombres y advertencias).

## Historias de usuario

- H1: Como agrónomo, quiero revisar y aprobar cada cultivo.
- H2: Como motor, quiero Kc, duración y ventanas confiables.
- H3: Como agricultor, quiero saber si una opción es hipótesis.

## Requisitos funcionales (EARS)

- **RF-008.1:** EL SISTEMA mantiene un catálogo versionado con al menos cebolla, zapallo y ají.
- **RF-008.2:** EL SISTEMA registra familia, duración, ventana de siembra, etapas y Kc por cultivo.
- **RF-008.3:** EL SISTEMA registra riesgos conocidos y fuentes por cultivo.
- **RF-008.4:** MIENTRAS un cultivo no tenga revisión experta, EL SISTEMA lo marca `needs_review` y lo muestra como hipótesis.
- **RF-008.5:** EL SISTEMA expone `GET /catalog/crops?region=&season=` con versión y estado.
- **RF-008.6:** EL SISTEMA prohíbe crear cultivos desde el LLM o desde el cliente.
- **RF-008.7:** EL SISTEMA documenta supuestos de ETo, lluvia efectiva y economía en `docs/agricultural-assumptions/`.
- **RF-008.8:** EL SISTEMA registra la revisión experta (fecha, revisor, cambios) en `catalog_review.md`.

## Requisitos no funcionales

- Catálogo pequeño; carga <100 ms.
- Versionado semántico; cambios trazables.
- Español para nombres; inglés para IDs.
- Sin dosis ni recomendaciones prescriptivas.

## Casos límite

- Cultivo sin Kc → no elegible.
- Ventana vacía → `needs_review`.
- Familia desconocida → `needs_review`.
- Revisión vencida → advertencia.
- Región sin catálogo → 404 o lista vacía con mensaje.

## Fuera de alcance

- Catálogo nacional completo.
- Variedades.
- Precios por cultivo (van en economía).

## Criterios de finalización

- 3 cultivos con Kc y ventanas.
- `review_status` visible.
- API y tests.
- Documento de supuestos y revisión.

## Matriz de pruebas

| RF | Test |
|---|---|
| 008.1 | U: catálogo |
| 008.2 | U: Kc/ventana |
| 008.3 | U: fuentes/riesgos |
| 008.4 | U/I: needs_review |
| 008.5 | C: endpoint |
| 008.6 | U: no creación |
| 008.7 | M: doc |
| 008.8 | M: review |
