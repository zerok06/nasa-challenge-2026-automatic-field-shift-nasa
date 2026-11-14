# Plan 003 — App shell Expo + RNUI

## Dependencias

```bash
npx create-expo-app@latest apps/mobile --template default
cd apps/mobile
npx expo install expo-router react-native-safe-area-context react-native-screens \
  expo-linking expo-constants expo-status-bar expo-network expo-secure-store
npx expo install react-native-reanimated react-native-gesture-handler \
  react-native-svg @expo/vector-icons
pnpm add react-native-ui-lib uilib-native
pnpm add @tanstack/react-query zustand zod
pnpm add -D jest jest-expo @testing-library/react-native
```

`package.json`:

```json
{
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "prebuild": "expo prebuild",
    "test": "jest",
    "test:contract": "jest --testPathPattern contract",
    "test:parity": "jest --testPathPattern parity",
    "typecheck": "tsc --noEmit",
    "e2e:build": "expo run:android --variant release"
  }
}
```

- RNUI v10 peer: React ≥19, RN ≥0.77.3, `uilib-native ^5.0.1`, Reanimated ≥3.19.4, Gesture Handler ≥2.24.
- Expo SDK 58: React 19.3, RN 0.88.1.
- `uilib-native` exige development build; **Expo Go no**.

## Development build

```bash
npx expo prebuild --clean
npx expo run:android
```

- Android Studio + SDK + emulador/dispositivo.
- `expo-dev-client` opcional para launcher.
- APK release para Maestro: `npx expo run:android --variant release`.
- EAS opcional: `eas build -p android --profile development`.

## RNUI setup

`App.tsx` o layout raíz:

```tsx
import {Colors, Typography, Spacings} from 'react-native-ui-lib';

Colors.loadColors({
  primary: '#1B5E20',
  secondary: '#8D6E63',
  background: '#F7F5EF',
  surface: '#FFFFFF',
  text: '#1C1B1F',
  success: '#2E7D32',
  warning: '#EF6C00',
  error: '#C62828',
  unknown: '#6B7280',
});

Typography.loadTypographies({
  h1: {fontSize: 28, fontWeight: '700', lineHeight: 34},
  h2: {fontSize: 22, fontWeight: '600', lineHeight: 28},
  body: {fontSize: 16, fontWeight: '400', lineHeight: 24},
  caption: {fontSize: 13, fontWeight: '400', lineHeight: 18},
});

Spacings.loadSpacings({page: 16, card: 12, gutter: 8});
```

- Babel: plugin de Reanimated/Worklets **al final**, según la versión que instale Expo.
- `GestureHandlerRootView` en el root.
- `SafeAreaProvider`.

## Navegación

```text
app/
├── _layout.tsx            # providers
├── (tabs)/
│   ├── _layout.tsx        # Inicio, Mapa, Rotaciones, Agente
│   ├── index.tsx
│   ├── map.tsx
│   ├── rotations.tsx
│   └── agent.tsx
├── onboarding.tsx
├── comparison/[id].tsx
├── scenario/[id].tsx
└── sources/[id].tsx
```

- Expo Router; deep links `automatic://parcel/:id`.
- Placeholder por pantalla con `EmptyState`.
- No cargar datos reales todavía.

## Tema y componentes base

- `EvidenceBadge`: `MEDIDO`, `ESTIMADO`, `SUPUESTO`, `SIMULADO`, `NO DISPONIBLE`.
- `Screen`: safe area + scroll + título.
- `Card`: RNUI `Card` con secciones.
- `PrimaryButton`: RNUI `Button` con `testID`.
- `EmptyState`, `ErrorState`, `LoadingState`, `OfflineBanner`.
- `ProvenanceSheet` (placeholder).
- `RotationTimeline` (placeholder; se completa en 018).

## Cliente API

```ts
// src/api/client.ts
const base = process.env.EXPO_PUBLIC_API_URL;
if (!base) throw new Error('EXPO_PUBLIC_API_URL missing; run pnpm env:sync');
```

- `fetch` con timeout (AbortController), `X-Request-ID`, `Authorization`.
- Parseo de envelope; `ApiError` tipado.
- TanStack Query: `retry: 1`, `staleTime` 30 s.
- Zod en el borde para respuestas críticas.
- No secretos.

## Env

- `pnpm env:sync` genera `apps/mobile/.env.local` solo con `EXPO_PUBLIC_API_URL` y `EXPO_PUBLIC_DEMO_MODE`.
- `app.config.ts` lee `process.env.EXPO_PUBLIC_*`.
- `prestart`/`prebuild` ejecutan sync.
- Test: `.env.local` no contiene `GROQ`.

## Maestro

- `appId: com.automatic.app` en `app.json`.
- `apps/mobile/.maestro/flows/00-launch.yaml`.
- `testID` en tabs y botón de onboarding.
- Data reset no necesario para launch.

## Accesibilidad

- `accessibilityLabel` en iconos y badges.
- 44×44 mínimo.
- `allowFontScaling`; probar 1.3×.
- Contraste ≥ 4.5:1.
- No usar solo color para estado.

## Cobertura RF

| RF | Archivo |
|---|---|
| 003.1 | `app/_layout.tsx`, spike |
| 003.2 | `src/ui/theme.ts` |
| 003.3 | `app/(tabs)/`, stacks |
| 003.4 | `src/api/client.ts` |
| 003.5 | `src/ui/states/*` |
| 003.6 | `scripts/env/sync.mjs`, test |
| 003.7 | componentes + checklist |
| 003.8 | `.maestro/flows/00-launch.yaml` |
| 003.9 | `src/lib/logger.ts` |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| RNUI 10 nuevo | spike 4 h; fallback 9.1.3 |
| `uilib-native` build | prebuild limpio; docs; Android Studio |
| Reanimated 4/Worklets | seguir versión Expo; plugin correcto |
| Google Maps key | se resuelve en 012; fallback |
| Maestro sin APK | release build local o EAS |
| Fuente/íconos | `@expo/vector-icons`; no RNUI icons si falla |

## Tests

- Jest + RNTL: tema, `EvidenceBadge`, `ApiError`, estados, navegación.
- Maestro: launch + tabs.
- Manual: dispositivo real, font scale, contraste.
