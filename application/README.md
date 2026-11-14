# Automatic - aplicación móvil

Expo SDK 58 + React Native 0.88 + TypeScript + **React Native Paper**.
Expo Go se usa para el MVP; el fallback desde RNUI está documentado en
`../docs/architecture/adr-0002-paper-fallback.md`.

## Requisitos

- Node 22+ y pnpm 10
- Android SDK + emulador o teléfono con Expo Go 58
- API local en `http://localhost:8000`

## Arranque

```bash
pnpm install
# En otra terminal, desde la raíz:
docker compose up -d --build

# USB: que el emulador/teléfono llegue a localhost:8000
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081

pnpm start -- --localhost
```

Abrir el proyecto en Expo Go (`exp://127.0.0.1:8081`). La API se configura con
`EXPO_PUBLIC_API_URL` en `application/.env.local` (ignorado por git).

## Tests

```bash
pnpm typecheck
pnpm test          # paridad de multiplicadores de escenario (fixtures compartidos)
```

Maestro (desde la raíz, con el emulador encendido y Metro en 8081):

```bash
maestro test application/.maestro/flows
```

## Estructura

```text
src/AutomaticApp.tsx   onboarding, dashboard, mapa, comparador, simulador, agente
src/api.ts             cliente HTTP + sesión anónima
src/MapView.tsx        WebView Leaflet + GIBS IMERG/NDVI
src/offline/scenario.ts multiplicadores de escenario (paridad con services/scenario.py)
src/theme.ts           tema Paper
.maestro/flows/        E2E 00-05 + 02b
```

## Límites conocidos

- No hay APK/dev build generado; el E2E corre contra Expo Go.
- Offline 023 no implementado.
- El agente del backend es determinista; no llama a Groq en el MVP.
