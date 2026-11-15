# Tasks 031 — Ficha de parcela

## Backend

- [x] Extender `PreferencesIn` con `priorities`.
- [x] Validar pesos y prioridades no negativas.
- [x] Merge de `preferences` en `PATCH /parcels/{id}`.
- [x] Tests de merge y de contexto con historial/agua/suelo.
- [x] Verificar `PATCH` con prioridades contra GCP y preservar `economics`.
- [x] Ampliar el catálogo demo a 8 cultivos para el historial (cebolla, zapallo, ají, papa, maíz, haba, tomate, alfalfa).

## App — datos y API

- [x] Tipos `Crop`, `CropHistoryEntry`, `WaterEntry`, `SoilEntry` y `Context`.
- [x] Funciones `getCrops`, `getCropHistory`, `addCropHistory`, `deleteCropHistory`.
- [x] Funciones `getWater`, `addWater`, `getSoil`, `addSoil`.
- [x] `updateParcelPreferences` con merge en backend.
- [x] `profileStatus` con progreso y 4 secciones.

## App — ficha

- [x] Pantalla `parcel-profile` con 5 pasos.
- [x] Historial con chips de catálogo, año/campaña y borrado.
- [x] Agua con disponibilidad, fuente, mm/m³, eficiencia y “No sé”.
- [x] Suelo con pH, materia orgánica y textura.
- [x] Prioridades y restricciones.
- [x] Resumen con estado y CTA de comparación.
- [x] Guardado por paso e invalidación de queries.
- [x] “Escuchar” y “¿Por qué te pregunto esto?”.
- [x] Tarjeta con progreso en Inicio y Mi parcela.
- [x] TestIDs de ficha.

## Visual

- [x] Paleta verde/marrón; sin azul ni naranja.
- [x] Fondo crema y texto tinta.
- [x] Ilustración SVG por paso.
- [x] Estados con icono + texto.
- [x] Press-scale en tarjetas y chips.
- [ ] Transiciones de paso, skeletons y haptics (fase posterior).
- [ ] Revisión de contraste AA y modo oscuro.

## Evidencia

- [x] `pytest backend/tests -q` (52 tests).
- [x] `pnpm test` (18 tests).
- [x] `pnpm typecheck`.
- [x] `pnpm lint`.
- [x] `npx expo export --platform android` (bundle OK).
- [x] Deploy GCP con `scripts/gcp/deploy.ps1 -SkipTests`.
- [x] Smoke GCP `health`, `ready`, compare y save.
- [x] APK universal de prueba (arm64 + x86_64) generado e instalado.
- [x] Flujo equivalente a `09-ficha-parcela` verde en emulador sobre el APK.
- [ ] Maestro `09-ficha-parcela` sobre Expo Go/dispositivo físico.
- [ ] Revisión 1.3×/2.0× y TalkBack.
