# Spec 022 — Chat, UI actions y guardado

| Campo | Valor |
|---|---|
| ID | 022 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 021, 018 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El agente debe ser útil sin secuestrar la interfaz: responde, muestra qué herramientas usó, ofrece abrir mapa/comparación y guarda solo con confirmación. Este spec cierra el recorrido “preguntar → entender → guardar borrador”.

## Usuarios / actores

- Agricultor.
- Agente.
- QA.

## Historias de usuario

- H1: Como agricultor, quiero preguntar “¿por qué?” y ver evidencia.
- H2: Como agricultor, quiero que el agente abra la comparación sin perderme.
- H3: Como agricultor, quiero confirmar antes de guardar.

## Requisitos funcionales (EARS)

- **RF-022.1:** EL SISTEMA muestra chat con historial, input, chips y estado de progreso.
- **RF-022.2:** EL SISTEMA muestra `tool_trace` y fuentes de la respuesta.
- **RF-022.3:** EL SISTEMA ejecuta solo `ui_actions` del enum permitido.
- **RF-022.4:** CUANDO el usuario pide guardar, EL SISTEMA muestra vista previa y confirmación.
- **RF-022.5:** SI rechaza, ENTONCES EL SISTEMA no escribe y lo informa.
- **RF-022.6:** EL SISTEMA guarda un borrador con `status=draft`, versión y supuestos.
- **RF-022.7:** EL SISTEMA lista planes guardados y abre su detalle.
- **RF-022.8:** CUANDO se ejecuta Maestro, EL FLUJO `05-agent-save` pregunta, guarda y rechaza.

## Requisitos no funcionales

- Respuesta < 15 s; progreso visible.
- Sin scroll infinito; historial paginado.
- Accesibilidad.
- Sin PII en logs.
- 100 usuarios.

## Casos límite

- Acción desconocida → ignorar + warning.
- Propuesta expirada → 409 y reintentar.
- Doble confirmación → idempotencia.
- Sin red → mensaje + modo guiado.
- Tool falla → explicación parcial.
- Guardar plan inválido → bloquear con motivo.

## Fuera de alcance

- Voz.
- Multimodal.
- Compartir plan.

## Criterios de finalización

- Chat + trace.
- UI actions.
- Confirmación/rechazo.
- Planes guardados.
- Maestro.

## Matriz de pruebas

| RF | Test |
|---|---|
| 022.1 | E: chat |
| 022.2 | E: trace |
| 022.3 | U: enum |
| 022.4 | E: preview |
| 022.5 | E: rechazo |
| 022.6 | I: draft |
| 022.7 | E: lista |
| 022.8 | E: Maestro |
