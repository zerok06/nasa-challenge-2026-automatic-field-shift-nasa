# Plan 025 — Voz y accesibilidad avanzada

## Dependencias

`npx expo install expo-speech expo-audio` (o `expo-av`); permiso de micrófono para STT.

## TTS

- `expo-speech` (local, sin red).
- `Speech.speak(answer, {language:'es-MX', rate:0.95})`.
- Botones “Escuchar”, “Detener”, “Repetir”.
- Resumen de 2–3 frases para respuestas largas.

## STT

- `expo-audio`/`expo-av` para grabar; permiso `RECORD_AUDIO`.
- Enviar a `POST /agent/transcribe` (backend) con Groq Whisper.
- Consentimiento explícito; borrar audio tras transcribir; no guardar.
- Límite 30 s; reintento 1.
- Si falla → input texto con mensaje.

## Accesibilidad

- `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`.
- 44 px; font scale hasta 1.5×.
- Contraste ≥ 4.5:1.
- Tema “alto contraste” con tokens.
- No color-only.
- Compatible con TalkBack.

## UI

- Botón de voz junto al input; estado grabando.
- Ajustes: voz on/off, tamaño, contraste.
- `testID`: `agent.speak`, `agent.mic`, `settings.contrast`.

## Cobertura RF

| RF | Archivo |
|---|---|
| 025.1 | `src/voice/tts.ts` |
| 025.2 | `SpeakControls.tsx` |
| 025.3 | `src/voice/stt.ts` |
| 025.4 | fallback |
| 025.5 | `api/v1/transcribe.py` |
| 025.6 | componentes |
| 025.7 | `ThemeProvider` |
| 025.8 | Maestro/manual |

## Tests

- Manual: TTS, permisos, ruido, TalkBack.
- Unit: fallback, límites.
- E2E: botón voz visible; no bloquea texto.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Privacidad de audio | consentimiento + borrado |
| STT falla | texto |
| Costo/latencia | P2, límite |
| Accesibilidad incompleta | checklist |
