# Spec 033 — Captura sin barreras + offline preparado

| Campo | Valor |
|---|---|
| Estado | Implementado (P0 + parte de P1) |
| Prioridad | P0 |
| Fecha | 2026-11-15 |
| Origen | Auditorías read-only de captura de datos y agente (subagentes) |

## Problema

La ficha pedía datos en el formato del motor (mm, m³, pH, kg/ha, S/kg),
no en el formato del agricultor (horas de riego, arrobas, sacos, jornales).
"No sé" no existía o descartaba respuestas, la superficie no se podía
corregir, la economía parcial devolvía 500 y el modo offline no guardaba
nada de lo capturado.

## Resultado

- "No sé" y "No tengo" son respuestas de primera clase y persistentes.
- Números es-PE (coma y punto) con eco del valor interpretado.
- Costo total etiquetado como total; economía parcial sin 500.
- Superficie y nombre editables desde Mi parcela.
- Feedback con cola offline; paquete offline auto-descargado tras comparar.
- Agente: rechazar borrador, open_scenario/open_comparison cargan datos sin
  sacar al agricultor del chat.

## Requisitos funcionales

- **RF-033.1:** `POST /comparisons` con economía parcial responde 201 y
  `margin_pen=null` con `missing_inputs` (nunca 500).
- **RF-033.2:** Guardar agua sin cantidad crea declaración `unknown`
  consultable; no descarta fuente ni disponibilidad.
- **RF-033.3:** "No tengo análisis" persiste y la ficha puede llegar a 100%.
- **RF-033.4:** Números aceptan coma y punto; error con eco del valor.
- **RF-033.5:** `PATCH /parcels/{id}` con nombre y área desde la app.
- **RF-033.6:** Feedback offline se encola y se envía al recuperar señal.
- **RF-033.7:** Tras comparar con éxito, la app descarga el paquete offline.
- **RF-033.8:** El borrador del agente se puede confirmar o rechazar; decir
  "no" ya no deja la tarjeta pendiente para confirmar sin querer (se limpia
  al enviar otro mensaje).

## Fuera de alcance (siguiente)

- Captura por horas/turnos/arrobas/sacos con conversión visible.
- Precios de referencia SISAP importados y validados.
- Riego por cultivo con Kc y calendario.
- Cola offline de ficha/agua/suelo/precios.
- Memoria conversacional del agente y TTS en el agente.
- Registro de resultado real de campaña.

## Criterios de aceptación

- [x] `pytest` 65 verdes (incluye economía parcial).
- [x] `pnpm test` 18, typecheck y lint verdes.
- [x] GCP `gcp-20261115-075715` verificado: economía parcial 201 + margen null.
- [x] Maestro 01/03/05/10 verdes sobre el APK.
- [x] Capturas: Mi parcela con Editar, ficha con "No sé" persistente.
- [x] APK universal reconstruido y copiado a `dist/` + Escritorio.
