# ADR-0008 — Identidad visual verde/marrón, ilustraciones SVG y micro-interacciones

| Campo | Valor |
|---|---|
| Estado | Aceptado; implementación parcial |
| Fecha | 2026-11-14 |
| Decisores | Producto, diseño, mobile |
| Supersede | Paleta de color de ADR-0004 |
| Relacionado | Spec 031 |

## Contexto

La app usaba verde como marca, pero conservaba azul para agua/info y naranja
para advertencias. El piloto y el jurado pidieron una identidad más coherente
con el campo: **verde y marrón**, sin azul ni naranja. Además, la ficha de
parcela necesitaba una ayuda visual para agricultores con baja familiaridad
digital, sin introducir fotos pesadas ni dependencias nuevas.

## Decisión

1. **Paleta:** verde (`#1B5E20`) como primario; marrón (`#6D4C41`) para agua,
   tierra y estructura; crema (`#FAF7F0`) como fondo; tinta (`#1E231E`) para
   texto. Advertencia/error usan terracota oscuro de la familia marrón
   (`#7A3B2E`, `#6E2F24`) y siempre se acompañan de icono + texto.
2. **Sin azul ni naranja** en tokens, CSS, gráficos ni componentes.
3. **Ilustraciones SVG propias** con `react-native-svg`, line art verde/marrón
   sobre crema. Se usan en la ficha (historial, agua, suelo, prioridades,
   resumen). No se usan fotos grandes ni imágenes remotas.
4. **Micro-interacciones** con `react-native-reanimated` (ya instalado):
   transiciones de paso, progreso, press scale, check de éxito y skeletons.
   Duración 150–250 ms, native driver cuando aplique y respeto a reduce motion.
5. **Banners** pequeños y finos, máximo 1–2 en Inicio; nunca empujan la decisión
   principal fuera de pantalla.
6. **Mapa:** cualquier mapa de ubicación manual se decide en un ADR separado.
   Esta decisión no reabre la pestaña Mapa ni las capas NASA de ADR-0005.

## Alternativas consideradas

- Mantener azul para agua: se descartó por pedido explícito y por coherencia.
- Fotos de campo: se descartaron por peso, licencias, offline y rendimiento.
- Librería de ilustraciones: se descartó para evitar dependencias y mantener
  el trazo propio.
- Animaciones con `LayoutAnimation`: se descartó por menor control y problemas
  en listas; Reanimated ya está en el stack.

## Consecuencias

- Hay que revisar contraste AA: marrón sobre crema, verde sobre blanco y
  terracota sobre crema.
- Los estados no pueden depender solo del color; se agregan iconos y etiquetas.
- Las capturas y Maestro existentes pueden cambiar por el nuevo fondo crema.
- La paleta y la primera ilustración SVG están aplicadas a la ficha; también
  hay press-scale en tarjetas y chips. Las transiciones de paso, skeletons y
  haptics quedan pendientes.
- Quechua/aimara siguen con copy en español hasta revisión nativa.

## Evidencia

- `application/src/design-system/tokens.ts`
- `application/global.css`
- `application/src/components/app/FichaIllustration.tsx`
- `application/src/features/parcel/ParcelProfileScreen.tsx`
