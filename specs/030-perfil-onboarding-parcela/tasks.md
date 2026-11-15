# Tasks 030 — Perfil, onboarding y parcela

## Backend

- [x] Extender `User` con `profile_json` y `onboarding_completed_at`.
- [x] Migración idempotente en `init_db`.
- [x] `PATCH /api/v1/auth/me` con nombre, locale, perfil, consentimiento y estado.
- [x] Devolver perfil en `/auth/me`.
- [x] Tests de perfil y consentimiento.
- [x] `created_at` en planes guardados.

## App — perfil

- [x] `ProfileProvider` con caché en SecureStore.
- [x] Conservar sesión guardada cuando no hay red.
- [x] Idioma inicial según locale del dispositivo (qu/ay; español por defecto).
- [x] `SpeakerButton` con `expo-speech`.
- [x] Ajustes: editar nombre y audio.

## App — onboarding

- [x] 5 pasos: idioma, nombre/experiencia/audio, ubicación, consentimiento, listo.
- [x] GPS + geocoder del dispositivo para distrito.
- [x] “Ahora no” y coordenadas manuales.
- [x] Crear perfil y mostrar “Hola, Juan”.
- [x] TestIDs y flujo Maestro `onboarding-profile`.

## App — Inicio

- [x] Saludo personalizado.
- [x] Estado vacío con “Crear mi parcela” y “Probar con datos de ejemplo”.
- [x] Selector de parcelas cuando hay más de una.
- [x] Etiquetas de datos faltantes legibles y truncadas.

## App — parcela

- [x] Pantalla `parcel-new` con modo guiado (4 pasos) y manual.
- [x] GPS, coordenadas manuales y superficie opcional.
- [x] Enviar distrito a la API.
- [x] Parcelas nuevas con `is_simulated=false`.
- [x] Nota de supuestos de precios/costos.
- [x] Planes guardados filtrados por parcela y fecha.

## Evidencia

- [x] `pnpm typecheck`
- [x] `pnpm lint`
- [x] `pnpm test` (18 tests)
- [x] `pytest backend/tests -q` (47 tests)
- [x] Prueba manual en emulador: onboarding, perfil, saludo, estado vacío,
  creación guiada y Ajustes.
- [x] `PATCH /auth/me` verificado contra GCP
  (`https://34-55-141-32.sslip.io`).
- [x] App apuntando a GCP y renderizando onboarding en el emulador.
- [ ] Ejecución Maestro en dispositivo.
- [ ] Revisión visual 1.3×/2.0× y TalkBack.
