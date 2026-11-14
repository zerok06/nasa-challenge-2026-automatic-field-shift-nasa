# ADR-0002 - Fallback a React Native Paper y Expo Go para el MVP

- **Fecha:** 14-nov-2026
- **Estado:** aceptada (supersede el spike de ADR-0001)
- **Spec:** 003, 027
- **Contexto:** build Android local en Windows, Expo SDK 58, RN 0.88.1

## Contexto

ADR-0001 eligió RNUI v10 + `uilib-native` con development build. El spike de 003 se ejecutó en Windows con Android SDK/emulador y falló antes de renderizar el shell:

1. `uilib-native` 5.1.2 aplica reglas ProGuard incompatibles con AGP 9 / R8 del proyecto Expo 58.
2. `wix-react-native-text-size` (dependencia nativa de RNUI 10) declara un peer de React Native anterior a 0.88 y no compila contra RN 0.88.1.
3. El build nativo de RN 0.88 en Windows supera `MAX_PATH` en CMake/NDK para rutas de `node_modules/.pnpm`.

El timebox de 4 h de ADR-0001 se cumplió sin un APK instalable. El mapa, el motor y el recorrido P0 son más críticos que la librería de UI.

## Decisión

Usar **React Native Paper 5.15.4** (componentes JS puros) con Expo SDK 58 y **Expo Go 58.0.5** para el MVP y Maestro:

- `Card`, `Button`, `Text`, tema Paper en `application/src/theme.ts`.
- WebView + Leaflet para el mapa (no requiere Google Maps key).
- Maestro E2E contra Expo Go (`appId: host.exp.exponent`), abriendo `exp://127.0.0.1:8081`.
- No se mantiene `react-native-ui-lib` ni `uilib-native` en `package.json`.

## Consecuencias

**Positivas**

- El recorrido P0 funciona hoy: onboarding, dashboard, mapa IMERG/NDVI, comparador, simulador, agente y guardado.
- E2E 00-05 + 02b verdes contra el emulador Android.
- Sin build nativo para iterar; el mapa no depende de una API key de Google.

**Negativas / límites**

- No se cumple literalmente el criterio "RNUI + development build"; se cumple la cláusula de fallback del goal y de ADR-0001.
- Expo Go no es un build instalable para jueces; un APK/dev build con Paper queda pendiente (`npx expo run:android`).
- El diseño no usa los componentes RNUI previstos; la spec 003 debe leerse con este ADR.
- `react-native-webview` y `expo-secure-store` están incluidos en Expo Go; si se genera un APK, requieren prebuild normal.

## Intento de APK posterior

Con Paper ya instalado se intentó `:app:assembleDebug` con Android SDK/NDK 27.1 y Gradle 9.4.1:

- Primer fallo: rutas `node_modules/.pnpm/...` > 260 caracteres en `prefab_command.bat`.
- Se corrigió con `node-linker=hoisted` en `application/.npmrc` y reinstalación.
- Segundo fallo: Ninja/CMake 3.22 no acepta nombres de objeto > 260 caracteres en el codegen
  de `react-native-gesture-handler` (`RNGestureHandlerDetectorShadowNode.cpp.o`), incluso
  con el repo copiado a `C:\auto`.
- No se desactivó la nueva arquitectura ni se cambió CMake/Ninja porque el MVP ya está verde
  en Expo Go y el timebox de la entrega prioriza el recorrido.

Conclusión: **no hay APK validado** en esta entrega. Para reintentar: usar un checkout en una
ruta muy corta, CMake/Ninja reciente con long paths, o desactivar nueva arquitectura en un spike
aislado.

## Evidencia

- `package.json` no contiene RNUI; contiene `react-native-paper@5.15.4`.
- `application/src/AutomaticApp.tsx` usa Paper y `testID` estables.
- Maestro: `00-launch`, `01-onboarding`, `02-map`, `02b-ndvi`, `03-compare`, `04-scenario`, `05-agent-save` verdes.
- ADR-0001 queda como decisión histórica, no como implementación vigente.

## Cuándo revisar

Si el jurado/entrega exige RNUI o un APK:

1. Probar un dev build con Paper primero (`npx expo run:android`).
2. Si se insiste en RNUI, hacer un spike aislado con RN 0.76/Expo 54 o RNUI 9.1.3; no mezclarlo con el MVP actual.
3. Cualquier cambio de UI requiere actualizar specs 003/006/012/018/019/022 y este ADR.
