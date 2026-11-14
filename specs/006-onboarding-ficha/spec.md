# Spec 006 — Onboarding y ficha

| Campo | Valor |
|---|---|
| ID | 006 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 005 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El agricultor debe registrar lo mínimo para comparar sin enfrentar un formulario largo. El onboarding usa pasos cortos, permite “No sé” y muestra qué falta. La ficha resultante alimenta el dashboard y las comparaciones. 100 agricultores, Android, español.

## Usuarios / actores

- Agricultor.
- Técnico que acompaña.
- Agente que lee faltantes.

## Historias de usuario

- H1: Como agricultor, quiero registrar mi parcela en pocos pasos.
- H2: Como agricultor, quiero decir “No sé” sin que la app invente.
- H3: Como agricultor, quiero ver qué datos faltan para un análisis.

## Requisitos funcionales (EARS)

- **RF-006.1:** CUANDO el agricultor inicia el onboarding, EL SISTEMA muestra pasos: parcela, historial, agua/suelo, prioridades, consentimiento.
- **RF-006.2:** EL SISTEMA permite “No sé” en superficie, agua, suelo, costos y rendimiento; guarda `null`/`unknown`.
- **RF-006.3:** EL SISTEMA muestra el estado de completitud por análisis (comparación, agua, margen).
- **RF-006.4:** CUANDO se guarda un paso, EL SISTEMA persiste y permite volver sin perder datos.
- **RF-006.5:** SI la API falla, ENTONCES EL SISTEMA conserva el formulario y permite reintentar.
- **RF-006.6:** EL SISTEMA muestra la ficha resumen con etiquetas de evidencia y faltantes.
- **RF-006.7:** EL SISTEMA exige consentimiento para guardar; sin él, modo demo de solo lectura.
- **RF-006.8:** CUANDO se ejecuta Maestro, EL FLUJO `01-onboarding` crea una parcela con superficie desconocida y ve “NO DISPONIBLE”.

## Requisitos no funcionales

- 5 pasos máximo; < 3 min.
- Teclado numérico; validación inline.
- Pantalla 5"; scroll; font scale.
- Sin pérdida de datos al rotar/volver.
- Textos en español cotidiano.

## Casos límite

- Usuario abandona a mitad → borrador local.
- Fecha de campaña aproximada → permitir mes/año.
- Superficie 0 o negativa → 422.
- Agua en turnos sin caudal → no convertir; `unknown`.
- Preferencias todas en cero → pesos iguales visibles.
- Reintento duplicado → idempotencia.

## Fuera de alcance

- Edición visual de polígono.
- Análisis de laboratorio (solo carga manual).
- Multiparcela.

## Criterios de finalización

- Onboarding completo y persistente.
- Ficha resumen.
- Maestro verde.
- Accesibilidad revisada.

## Matriz de pruebas

| RF | Test |
|---|---|
| 006.1 | U: pasos |
| 006.2 | U: unknowns |
| 006.3 | U: completitud |
| 006.4 | I/E: persistencia |
| 006.5 | U: error/reintento |
| 006.6 | U: ficha |
| 006.7 | U: consentimiento |
| 006.8 | E: Maestro |
