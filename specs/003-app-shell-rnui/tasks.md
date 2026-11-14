# Tasks 003 — App shell Expo + RNUI

- [ ] **T1 — Scaffold Expo + TypeScript + Router**
  - RF: 003.1, 003.3
  - `create-expo-app`, Expo Router, estructura `app/`.
  - Hecho cuando: `pnpm --filter mobile start` abre el shell.

- [ ] **T2 — Instalar RNUI y peers**
  - RF: 003.1, 003.2
  - `react-native-ui-lib`, `uilib-native`, Reanimated, Gesture Handler, Safe Area.
  - Babel plugin correcto; `GestureHandlerRootView`.
  - Hecho cuando: `Button` y `Card` de RNUI renderizan.

- [ ] **T3 — Spike de development build (PUERTA DURA)**
  - RF: 003.1
  - `npx expo prebuild --clean && npx expo run:android`.
  - Probar `Button`, `Card`, `Wizard`, `Timeline`.
  - Hecho cuando: build instala y renderiza en dispositivo; si falla en 4 h, ADR y fallback RNUI 9.1.3.

- [ ] **T4 — Tema RNUI**
  - RF: 003.2, 003.7
  - `Colors`, `Typography`, `Spacings`; tokens de evidencia; contraste.
  - Hecho cuando: snapshot/test de tokens y revisión visual.

- [ ] **T5 — Navegación**
  - RF: 003.3
  - Tabs + stacks + deep links; placeholders.
  - Hecho cuando: Maestro navega a las 4 tabs.

- [ ] **T6 — Cliente API**
  - RF: 003.4, 003.9
  - `fetch` con timeout, request_id, auth, envelope, Zod.
  - Hecho cuando: tests de 200/401/422/500 y URL faltante.

- [ ] **T7 — Estados y componentes base**
  - RF: 003.5
  - `LoadingState`, `EmptyState`, `ErrorState`, `OfflineBanner`, `EvidenceBadge`.
  - Hecho cuando: tests de render y capturas.

- [ ] **T8 — Env sync en mobile**
  - RF: 003.6
  - `prestart`/`prebuild`; `.env.local`; test de no-secretos.
  - Hecho cuando: app lee `EXPO_PUBLIC_API_URL`; no hay `GROQ` en el bundle.

- [ ] **T9 — Maestro**
  - RF: 003.8
  - `00-launch.yaml`; `testID`s; build release.
  - Hecho cuando: `maestro test` verde.

- [ ] **T10 — Accesibilidad**
  - RF: 003.7
  - Labels, roles, 44 px, font scale, contraste.
  - Hecho cuando: checklist firmado + captura 1.3×.

- [ ] **T11 — Docs**
  - ADR-0001, README mobile, comandos.
  - Hecho cuando: un dev sigue el doc y compila.

## Definición de terminado

- [ ] Build Android instalado.
- [ ] RNUI renderiza sin crashes.
- [ ] Navegación + cliente API + estados.
- [ ] Maestro launch verde.
- [ ] Accesibilidad revisada.
