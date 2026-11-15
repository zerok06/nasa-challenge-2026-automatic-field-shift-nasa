# Tasks 028 — Rediseño de UI para agricultores

## Fase 0 — Decisión y entorno

- [x] Escribir `specs/028-rediseno-ui-agricultor/spec.md`.
- [x] Escribir `plan.md` y `tasks.md`.
- [x] Escribir `docs/architecture/adr-0005-ui-agricultor-mapas.md`.
- [x] Configurar `application/.env.local` con la IP LAN del backend.
- [x] Resolver `localhost` con el host de Metro en Expo Go físico.
- [x] Verificar `GET /api/v1/health` y `/ready` en la IP LAN.
- [x] Actualizar `docs/architecture/env.md` y `.env.example`.

## Fase 1 — Retiro de mapas

- [x] Eliminar `app/(tabs)/map.tsx`.
- [x] Eliminar `features/map/MapScreen.tsx` y `MapView.tsx`.
- [x] Eliminar `features/location/ParcelMapPicker.tsx`.
- [x] Quitar la pestaña “Mapa” y el CTA “Ver mapa”.
- [x] Quitar testIDs de mapa.
- [x] Eliminar flujos Maestro `02-map` y `02b-ndvi`.
- [x] Quitar `react-native-webview`.
- [x] Quitar la sección de capas satelitales de Fuentes.
- [x] Quitar `focus_map_layer` del runtime y del esquema del agente.
- [x] Marcar specs 012/013 y `map-layers.md` como superseded.

## Fase 2 — Design system y formato

- [x] Agregar `ActionCard`.
- [x] Agregar `HeroCard`.
- [x] Agregar `footer` fijo a `Screen`.
- [x] Actualizar `MetricTile` y `SectionCard` a texto legible.
- [x] Formatear números/dinero con `Intl.NumberFormat('es-PE')`.
- [x] Agregar test de formato.
- [x] Corregir conflicto de tema claro/oscuro.
- [x] Subir tamaño mínimo de texto y tablas.

## Fase 3 — Navegación e Inicio

- [x] Cuatro pestañas: Inicio, Comparar, Preguntar, Mi parcela.
- [x] Nuevo Inicio con hero, tres acciones, datos y clima.
- [x] Nueva pantalla `Mi parcela`.
- [x] Mover paquete offline a Mi parcela.
- [x] Agregar “Mis planes guardados” con `getSavedPlans`.

## Fase 4 — Comparar y Escenario

- [x] Reducir cada plan a agua, ganancia y “¿alcanza el agua?”.
- [x] Reemplazar línea por barras en ganancia.
- [x] Agregar footer fijo “Probar un cambio”.
- [x] Reescribir escenario como “¿Qué pasa si…?”.
- [x] Mostrar resultado como “Ganarías…” / “Te faltaría…”.
- [x] Quitar jerga `baseline`, `preset`, `ETc`.

## Fase 5 — Onboarding, agente y fuentes

- [x] Onboarding de 3 pasos.
- [x] GPS primero; coordenadas en disclosure avanzado.
- [x] Consentimiento resumido y claro.
- [x] Estado “Tu parcela está lista”.
- [x] Agente con sugerencias ilustradas y trazas en “Detalles técnicos”.
- [x] Agente con `next_step.phase` y tarjeta “Siguiente paso”.
- [x] Guardrails: no predice, no prescribe, no inventa, fuera de alcance.
- [x] Respuestas de 1–2 frases (≤220 caracteres).
- [x] Tests de integración de fases y guardrails.
- [x] Fuentes sin IMERG/NDVI; metodología y límites.
- [x] Ajustes con diagnóstico de URL de API.

## Fase 6 — i18n, docs y evidencia

- [x] Actualizar `en.ts` con las claves nuevas.
- [x] Conservar `qu-PE`/`ay-PE` como `review_pending` (fallback a español).
- [x] Actualizar `docs/demo/script.md`.
- [x] Actualizar `docs/accessibility.md`.
- [x] Actualizar `MEMORY.md`.
- [x] Actualizar flujos Maestro y agregar `07-parcel`.
- [x] `pnpm typecheck` verde.
- [x] `pnpm lint` verde.
- [x] `pnpm test` verde (18 tests).
- [x] `pytest backend/tests -q` verde (29 tests).
- [x] `npx expo-doctor` verde (20/20).
- [ ] Ejecutar Maestro en el teléfono/emulador del usuario.
- [ ] Revisión visual 1.3×/2.0× y TalkBack en dispositivo.

## Notas

- La ejecución E2E y la revisión visual requieren el dispositivo del usuario;
  los flujos y testIDs quedaron actualizados.
- El contorno dibujado de la parcela queda fuera de alcance; el área se escribe
  o se estima con GPS.
- Quechua y aimara siguen en borrador hasta revisión de hablantes nativos.
