# ADR-0001 — RNUI con Expo y development build

- **Fecha:** 14-nov-2026
- **Estado:** aceptada, sujeta a spike
- **Spec:** 003

## Contexto

El equipo quiere **RNUI** (`react-native-ui-lib`) como sistema de diseño.  
RNUI v10.0.0 se publicó el **11-nov-2026** y declara peer dependencies:

- `react >= 19.0.0`
- `react-native >= 0.77.3`
- `uilib-native ^5.0.1` (módulo nativo)
- `react-native-reanimated >= 3.19.4`
- `react-native-gesture-handler >= 2.24.0`
- `react-native-safe-area-context >= 5.6.2`

Expo SDK 58 usa React 19.3.0 y React Native 0.88.1. La compatibilidad es plausible pero **no está garantizada** por una versión tan reciente.

`uilib-native` contiene componentes nativos, por lo que **Expo Go no puede cargar RNUI**. Se necesita un development build (Android Studio o EAS).

## Decisión

Usar RNUI v10 con Expo SDK 58 y **development build local** con Android Studio:

```bash
npx expo install react-native-reanimated react-native-gesture-handler react-native-safe-area-context
pnpm add react-native-ui-lib uilib-native
npx expo run:android
```

Maestro E2E corre contra el dev build o un APK release; no contra Expo Go.

## Consecuencias

**Positivas**
- Componentes listos: `Card`, `Button`, `Chip`, `Badge`, `Wizard`, `Timeline`, `Stepper`.
- Tema centralizado (`Colors`, `Typography`, `Spacings`).
- Un solo build nativo sirve para desarrollo, E2E y APK.

**Negativas**
- Build nativo desde el día 0; no se puede iterar solo con Expo Go.
- RNUI v10 es muy nueva; riesgo de regresiones.
- `uilib-native` puede fallar en el prebuild o en la versión de Reanimated.
- APK Android necesita Google Maps key para el mapa.

## Fallback

Si el spike no logra renderizar `Button`, `Card`, `Wizard` y `Timeline` en un dispositivo Android en **4 horas**:

1. Probar RNUI 9.1.3 (misma API, también requiere `uilib-native`).
2. Si sigue fallando, cambiar a React Native Paper (JS puro) mediante un nuevo ADR.
3. No bloquear el demo por la librería; el mapa y el motor son más críticos.

## Spike (puerta de 003)

- [ ] `npx expo run:android` compila.
- [ ] `Button`, `Card`, `Wizard`, `Timeline` renderizan.
- [ ] `uilib-native` no rompe el arranque.
- [ ] El APK release instala en un dispositivo limpio.
- [ ] Maestro abre la app y ve el shell.

## Referencias

- npm `react-native-ui-lib@10.0.0`, publicado 2026-11-11.
- Documentación RNUI: instalación con `react-native-reanimated`, `react-native-gesture-handler`, `uilib-native`.
- Expo SDK 58 template: React 19.3.0, RN 0.88.1.
- Expo: development builds vs Expo Go.
