# Plan 030 — Perfil, onboarding y parcela

## Enfoque

1. Extender `users` con `profile_json` y `onboarding_completed_at`; migración
   idempotente en `init_db`.
2. Exponer `PATCH /auth/me` para guardar el perfil y el consentimiento.
3. Cachear el perfil en SecureStore y conservar la sesión si no hay red.
4. Reemplazar el onboarding de parcela por onboarding de perfil con 5 pasos.
5. Mover la creación de parcela a `/parcel-new` con modo guiado y manual.
6. Usar GPS + geocoder del dispositivo para distrito/coordenadas.
7. Agregar TTS con `expo-speech` para “Escuchar”.
8. Saludar por nombre, mostrar estado vacío y selector de parcelas.
9. Ajustar planes guardados por parcela/fecha.
10. Cerrar con tests y Maestro actualizado.

## Fases

| Fase | Alcance | Evidencia |
|---|---|---|
| 0 | Modelo, migración, `PATCH /auth/me`, tests | `test_profile.py` |
| 1 | ProfileProvider, caché, sesión offline | typecheck + prueba manual |
| 2 | Onboarding 5 pasos + TTS | prueba manual + Maestro |
| 3 | Inicio con saludo, estado vacío y selector | Maestro `01` |
| 4 | Crear parcela guiado/manual + GPS | prueba manual + Maestro |
| 5 | Ajustes de perfil y planes guardados | prueba manual + Maestro `07` |

## Riesgos

- **GPS del emulador:** puede no tener ubicación; el flujo debe permitir “Ahora no”
  y coordenadas manuales. En el teléfono real GPS funciona.
- **Geocoder nativo:** depende de Google Play Services. Si falla, se guardan las
  coordenadas y el distrito queda nulo; no se inventa.
- **Perfil offline:** crear el perfil requiere red; después el perfil se cachea.
- **Supuestos económicos:** las parcelas nuevas no son DEMO, pero precios/costos
  siguen siendo de ejemplo hasta que se editen.
- **i18n:** las claves nuevas caen a español en qu/ay hasta revisión nativa.

## Orden de merge

Un solo cambio coherente. Si se parte: backend + ProfileProvider primero;
onboarding; luego creación de parcela; por último ajustes y Maestro.
