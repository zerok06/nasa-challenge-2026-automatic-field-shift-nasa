# Spec 019 — UI simulador

| Campo | Valor |
|---|---|
| ID | 019 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 017, 018 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El agricultor debe explorar “¿y si tengo menos agua?” o “¿y si baja el precio?” sin alterar sus datos. El simulador usa presets claros, muestra antes/después y permite restablecer. Es la parte que convierte la comparación en una conversación.

## Usuarios / actores

- Agricultor.
- Agente (puede abrir escenario).
- Jurado.

## Historias de usuario

- H1: Como agricultor, quiero reducir agua 20 % y ver qué pasa.
- H2: Como agricultor, quiero bajar el precio 15 % y ver el margen.
- H3: Como agricultor, quiero volver al baseline.

## Requisitos funcionales (EARS)

- **RF-019.1:** EL SISTEMA ofrece presets de agua −10/−20/−30 % y precio −10/−15/−30 %.
- **RF-019.2:** CUANDO se aplica un preset, EL SISTEMA llama a `/simulate` y muestra el resultado.
- **RF-019.3:** EL SISTEMA muestra antes/después por plan y las diferencias.
- **RF-019.4:** EL SISTEMA permite restablecer al baseline sin recargar la app.
- **RF-019.5:** SI el margen era null, ENTONCES EL SISTEMA sigue mostrando “No calculable” y explica por qué.
- **RF-019.6:** EL SISTEMA muestra una explicación corta de qué cambió y qué no.
- **RF-019.7:** CUANDO se ejecuta Maestro, EL FLUJO `04-scenario` aplica −20 % agua, −15 % precio y restablece.
- **RF-019.8:** EL SISTEMA mantiene el `scenario_id` y no muta el baseline.

## Requisitos no funcionales

- Recalc < 2 s.
- Sin parpadeos; skeleton.
- Accesibilidad de presets (texto, no solo color).
- 5" pantalla.
- Offline: no en MVP (023).

## Casos límite

- API caída → mantener baseline + error.
- Multiplicador no permitido → deshabilitado.
- Todos los planes con déficit → mensaje.
- Precio sin margen → null.
- Doble tap → idempotencia.
- Restablecer durante carga → cancelar.

## Fuera de alcance

- Sliders continuos.
- Escenario combinado avanzado.
- Guardar escenario (P2).

## Criterios de finalización

- Presets.
- Antes/después.
- Reset.
- Explicación.
- Maestro.

## Matriz de pruebas

| RF | Test |
|---|---|
| 019.1 | U: presets |
| 019.2 | I/E: simulate |
| 019.3 | U: diff |
| 019.4 | E: reset |
| 019.5 | U: null |
| 019.6 | U: copy |
| 019.7 | E: Maestro |
| 019.8 | I: scenario_id |
