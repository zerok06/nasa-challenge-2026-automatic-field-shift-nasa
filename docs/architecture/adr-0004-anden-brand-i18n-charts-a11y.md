# ADR-0004 — Anden: marca, gluestack v5, i18n, gráficos y accesibilidad

- **Fecha:** 14-nov-2026
- **Estado:** aceptada
- **Supersede:** ADR-0002 (Paper fallback)
- **Alcance:** `application/`, docs de producto
- **Plataforma validada:** Expo SDK 58 + RN 0.88.1 + Expo Go 58 (Android)

## Contexto

El MVP funcionaba con React Native Paper y un monolito. La modernización a
gluestack v5 quedó montada con NativeWind v5 / react-native-css, pero faltaba
cerrar el producto: identidad, idioma, gráficos y accesibilidad para el piloto
con agricultores de Moquegua.

Restricciones:

- Expo Go como entorno de demo; no hay APK validado (ver ADR-0002).
- Conectividad intermitente y dispositivos Android de gama media.
- Español como idioma principal; quechua y aimara como idiomas del piloto, con
  revisión de hablantes nativos pendiente.
- Las cifras las producen los motores; el LLM no calcula.

## Decisiones

### 1. Marca Anden

- Nombre visible: **Anden**; wordmark `ANDEN` en el header.
- Paleta: blanco cálido dominante (`#FAFBF8`), superficie blanca, escala verde
  Anden (`#1B5E20` como marca) y acentos funcionales agua/tierra/advertencia.
- Icono y splash generados con tres terrazas y una hoja; `app.json` actualizado
  (`name`, `slug`, `scheme`, bundle id `com.anden.app`).
- Tagline: “Decisiones que crecen con tu parcela”.

### 2. Stack de UI

- gluestack v5 (`@gluestack-ui/core` 5.0.15, `@gluestack-ui/utils` 5.0.6).
- NativeWind 5.0.0-rc.1 + react-native-css 3.1.0-rc.1 + Tailwind 4.3.5.
- `lucide-react-native` para iconos; no `@expo/vector-icons` (conflicto
  `expo-font`/AssetRegistry en Expo Go).
- React Native Paper eliminado. `AutomaticApp.tsx`, `theme.ts` y `src/api.ts`
  eliminados.
- `Disclosure` propio (Pressable + chevron) en lugar de `Accordion` v5, que
  calculaba alturas enormes con esta combinación.

### 3. Gráficos

- `react-native-gifted-charts` 1.4.81 + `expo-linear-gradient` (incluido en
  Expo Go) + `react-native-svg`.
- Wrappers `AndenBarChart` / `AndenLineChart` con la paleta Anden, `ChartCard`
  con resumen accesible y `ChartTable` (“Ver datos”).
- Gráficos en dashboard (lluvia/ETo y tendencia), comparador (margen y riego
  bruto por plan) y simulador (baseline vs escenario).
- `null` nunca se dibuja como 0; si no hay datos se muestra “Sin datos”.
- Reduce motion desactiva animaciones.

### 4. Internacionalización

- `i18next` 27 + `react-i18next` 18 + `expo-localization` 58.0.5.
- Locales: `es-PE` (default), `qu-PE` (quechua sureño), `ay-PE` (aimara), `en`.
- Claves = textos fuente en español; las traducciones faltantes caen a español.
- Preferencia persistida en SecureStore (`anden.preferences.v1`).
- Selector en onboarding y Ajustes.
- Quechua y aimara marcados `review_pending`; no se presentan como traducción
  validada hasta revisión nativa.
- Errores de backend: pendiente mapear todos los códigos a mensajes localizados;
  hoy se muestra el mensaje recibido.

### 5. Accesibilidad

- Objetivo WCAG 2.2 AA y buenas prácticas Android/iOS.
- Onboarding con preferencias opcionales: idioma, reducir movimiento y nota
  sobre el tamaño de letra del sistema.
- Ajustes: idioma, tema claro/oscuro/sistema, reducir movimiento, enlace a
  ajustes del sistema, fuentes y acerca de Anden.
- Targets táctiles de al menos 48 dp; icon buttons 48×48; botones con
  `min-h-12`.
- Gráficos con resumen hablado y tabla de datos; alertas con live region.
- Se respeta el escalado de fuente del sistema; probar 1.3× y 2.0× + TalkBack.

## Consecuencias

**Positivas**

- Identidad de producto clara y consistente con el territorio andino.
- Una sola librería de UI y una paleta semántica mantenible.
- Gráficos legibles sin depender solo del color, con alternativa textual.
- Cuatro idiomas seleccionables y preferencia persistente.
- Accesibilidad incorporada al onboarding, no solo como ajuste escondido.

**Negativas / límites**

- Expo Go sigue siendo el entorno de demo; no hay APK validado.
- Quechua y aimara requieren revisión de hablantes nativos antes de producción.
- `react-native-gifted-charts` agrega peso JS; aceptable para el piloto.
- El escalado de fuente depende del sistema Android; no hay un control interno
  de “texto grande” separado.
- El tema oscuro necesita QA visual adicional en pantallas con gráficos.

## Evidencia

- `pnpm typecheck`, `pnpm lint`, `pnpm test` verdes.
- Maestro 00, 01, 02, 02b, 03, 04, 05 y 06 verdes contra Expo Go.
- Flujo 06 valida cambio de idioma y vuelta a español.
- Capturas de onboarding, dashboard con gráficos, comparador y ajustes.

## Cuándo revisar

1. Antes de producción: revisión nativa de quechua/aimara y validación de
   traducciones agronómicas.
2. Si se genera APK/dev build: verificar `expo-linear-gradient`,
   `expo-localization` y los gráficos en un build nativo.
3. Si se agregan más de 3 planes o series: evaluar virtualización y límites de
   `gifted-charts`.
4. Si se requiere alto contraste explícito: añadir un tema de contraste y
   validar tokens con el test de contraste.
