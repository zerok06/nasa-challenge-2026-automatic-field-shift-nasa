# Spec 025 — Voz y accesibilidad avanzada (P2)

| Campo | Valor |
|---|---|
| ID | 025 |
| Estado | Borrador |
| Prioridad | P2 |
| Dependencias | 022 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

La voz puede reducir la barrera de lectura, pero no es necesaria para el MVP. Este spec define TTS para respuestas y STT opcional, con privacidad y fallback textual. También cierra la accesibilidad avanzada para 100 agricultores.

## Usuarios / actores

- Agricultor con baja alfabetización digital.
- Agricultor en exteriores.
- QA/accesibilidad.

## Historias de usuario

- H1: Como agricultor, quiero escuchar la respuesta.
- H2: Como agricultor, quiero preguntar por voz si es posible.
- H3: Como agricultor, quiero que la app funcione sin voz.

## Requisitos funcionales (EARS)

- **RF-025.1:** EL SISTEMA lee en voz alta la respuesta del agente con `expo-speech` en español.
- **RF-025.2:** EL SISTEMA permite detener/repetir la lectura.
- **RF-025.3:** EL SISTEMA permite dictar una pregunta (STT) solo con permiso explícito.
- **RF-025.4:** SI el permiso se deniega o el STT falla, ENTONCES EL SISTEMA vuelve al input de texto.
- **RF-025.5:** EL SISTEMA no envía audio a terceros sin consentimiento; el audio se borra tras transcribir.
- **RF-025.6:** EL SISTEMA mantiene labels, contraste, font scale y navegación por lector de pantalla.
- **RF-025.7:** EL SISTEMA ofrece un modo “texto grande / alto contraste”.
- **RF-025.8:** EL SISTEMA prueba TTS y fallback con Maestro/manual.

## Requisitos no funcionales

- TTS < 1 s para iniciar.
- Audio < 30 s.
- Sin PII en logs.
- Funciona sin conexión para TTS (local).
- P2: no bloquear P0.

## Casos límite

- Voz del sistema no disponible → texto.
- Audio ruidoso → reintentar.
- Permiso denegado → texto.
- Respuesta larga → resumen + leer.
- Idioma del dispositivo distinto → forzar es-MX/es-PE.

## Fuera de alcance

- Wake word.
- Conversación manos libres.
- Traducción a quechua (futuro).

## Criterios de finalización

- TTS.
- STT opcional con consentimiento.
- Fallback.
- Accesibilidad.

## Matriz de pruebas

| RF | Test |
|---|---|
| 025.1 | M: TTS |
| 025.2 | M: stop/repeat |
| 025.3 | M: STT permiso |
| 025.4 | U: fallback |
| 025.5 | M: privacidad |
| 025.6 | M: lector |
| 025.7 | M: tema |
| 025.8 | M/E: flujo |
