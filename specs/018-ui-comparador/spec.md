# Spec 018 — UI comparador

| Campo | Valor |
|---|---|
| ID | 018 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 017, 003 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El comparador es la pantalla central: tres tarjetas A/B/C, calendario, agua, suelo, margen y razones. Debe ser honesto con los `null` y explicable. Es lo que el jurado recordará.

## Usuarios / actores

- Agricultor.
- Agrónomo.
- Jurado.

## Historias de usuario

- H1: Como agricultor, quiero comparar mi rotación con alternativas de un vistazo.
- H2: Como agricultor, quiero entender por qué una opción es mejor en agua.
- H3: Como jurado, quiero ver fuentes y límites.

## Requisitos funcionales (EARS)

- **RF-018.1:** EL SISTEMA muestra 3 tarjetas: actual, alternativa B y C, con estado.
- **RF-018.2:** EL SISTEMA muestra un timeline de cultivos por plan en el mismo horizonte.
- **RF-018.3:** EL SISTEMA muestra agua (mm, déficit, factibilidad), suelo y margen con unidad.
- **RF-018.4:** SI un valor es null, ENTONCES EL SISTEMA muestra “No disponible”/“No calculable”, no 0.
- **RF-018.5:** EL SISTEMA muestra `why_this_plan`, `tradeoffs`, `risk_flags` y `missing_inputs`.
- **RF-018.6:** EL SISTEMA abre la ficha de fuentes por plan/indicador.
- **RF-018.7:** EL SISTEMA muestra el disclaimer y la etiqueta `needs_review`/`invalid`.
- **RF-018.8:** CUANDO se ejecuta Maestro, EL FLUJO `03-compare` ve 3 planes y un margen null.

## Requisitos no funcionales

- Scroll fluido en 5".
- Texto legible; no solo color.
- Carga < 1 s con datos.
- Accesibilidad.
- Sin gráficos pesados.

## Casos límite

- 3 planes con estados distintos.
- Todos inválidos → mensaje.
- Sin margen → fila “No calculable”.
- Sin agua → “Factibilidad sin confirmar”.
- Plan actual sin historial → plan vacío explicado.
- Horizonte largo → timeline scroll horizontal.

## Fuera de alcance

- Edición inline de planes.
- Optimización visual.
- Compartir PDF.

## Criterios de finalización

- 3 tarjetas.
- Timeline.
- Nulls.
- Fuentes.
- Maestro.

## Matriz de pruebas

| RF | Test |
|---|---|
| 018.1 | E: 3 planes |
| 018.2 | U: timeline |
| 018.3 | U: unidades |
| 018.4 | U: null |
| 018.5 | E: why/tradeoffs |
| 018.6 | E: fuentes |
| 018.7 | E: disclaimer |
| 018.8 | E: Maestro |
