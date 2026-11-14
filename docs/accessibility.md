# Accesibilidad — Anden

Anden apunta a **WCAG 2.2 AA** en Android, con preferencias opcionales en el
onboarding y en Ajustes. La accesibilidad no es un modo separado: es la base de
todas las pantallas.

## Principios

1. **Nada solo por color.** Estados, gráficos y alertas siempre tienen texto,
   icono o patrón además del color.
2. **Nada solo por gesto.** Toda acción tiene un botón alternativo.
3. **El dato faltante se dice.** `null` se muestra como “Sin datos” o “No
   disponible”, nunca como 0.
4. **Lenguaje simple.** Evitar jerga; explicar términos agronómicos en contexto.
5. **El sistema manda en tamaño de texto.** Anden respeta el escalado de fuente
   de Android y evita alturas fijas.

## Preferencias en onboarding

El primer paso de onboarding ofrece:

- Idioma: Español, Runasimi, Aymar aru, English.
- Reducir movimiento.
- Nota: “Anden respeta el tamaño de letra de tu teléfono.”
- “Ahora no” implícito: el usuario puede continuar sin tocar las preferencias.

Todo se puede cambiar después en **Ajustes**.

## Matriz por perfil

| Perfil | Implementación | Prueba |
|---|---|---|
| Ceguera | `accessibilityLabel/Hint/Role`, orden de foco, resumen de gráficos, tablas “Ver datos”, live regions en errores y respuestas | TalkBack en onboarding, dashboard, comparador y agente |
| Baja visión | Contraste AA, texto escalable, modo claro/oscuro/sistema, targets grandes, sin información solo por color | Fuente 1.3× y 2.0×; contraste de tokens |
| Sordera | Todo evento tiene feedback visual; no hay audio imprescindible | Revisión de flujos sin audio |
| Motriz | Targets ≥48 dp, botones grandes, alternativas a gestos, cierre de sheets con botón | Recorrido con una mano; teclado Android |
| Cognitiva | Pasos numerados, lenguaje simple, errores accionables, confirmación antes de guardar, glosario | Revisión de copy y flujo de agente/borrador |

## Implementación concreta

- `AppButton`: `min-h-12`; `AppIconButton`: 48×48.
- `Disclosure`: target de 48 dp, `accessibilityState={{ expanded }}` y
  `accessibilityLiveRegion` al abrir.
- `AppAlert`: `accessibilityLiveRegion="polite"` y rol de alerta.
- `ChartCard`: contenedor `accessible` con resumen de valores + `ChartTable`.
- `Screen`: `KeyboardAvoidingView` con `behavior="padding"` para que el
  compositor del agente no quede tapado por el teclado.
- `PreferencesProvider`: persiste idioma, tema y reduce motion; aplica
  `Appearance.setColorScheme`.
- `AndenBarChart`/`AndenLineChart`: `isAnimated={!reduceMotion}`.
- `ComparisonScreen`: remonta el `Screen` al enfocar para evitar offsets de
  scroll y contenido fuera de vista.

## Checklist de QA

### Lector de pantalla

- [ ] TalkBack anuncia el nombre de cada pantalla.
- [ ] Los iconos sin texto tienen `accessibilityLabel`.
- [ ] Los botones anuncian estado (seleccionado, expandido, deshabilitado).
- [ ] Los errores y respuestas del agente se anuncian sin mover el foco.
- [ ] Los gráficos tienen resumen y tabla de datos.

### Baja visión

- [ ] Fuente del sistema a 1.3× sin clipping.
- [ ] Fuente del sistema a 2.0× sin clipping en onboarding, dashboard,
      comparador, simulador y agente.
- [ ] Contraste de texto ≥4.5:1 y de UI ≥3:1.
- [ ] Modo oscuro revisado en gráficos y tarjetas.
- [ ] Ningún estado depende solo de color.

### Motriz

- [ ] Todos los targets ≥48 dp.
- [ ] No hay acciones que requieran long press o drag.
- [ ] El teclado no tapa el input del agente ni los botones principales.
- [ ] Se puede cerrar el actionsheet/menú con un botón.

### Cognitiva

- [ ] Los pasos de onboarding indican progreso.
- [ ] Los errores dicen qué hacer, no solo qué falló.
- [ ] Guardar un borrador pide confirmación explícita.
- [ ] Los términos técnicos tienen explicación o glosario.

## Limitaciones conocidas

- Quechua y aimara están en **borrador** (`review_pending`) hasta revisión de
  hablantes nativos.
- No hay control interno de “texto grande” separado del sistema; se usa el
  escalado de Android.
- No hay audio en la app; si se agrega voz, requiere subtítulos/transcripción.
- El contraste de tokens se revisa manualmente; falta un test automatizado de
  todos los pares.
- El flujo E2E no ejecuta TalkBack; la verificación de lector es manual.

## Evidencia

- `docs/architecture/adr-0004-anden-brand-i18n-charts-a11y.md`
- Flujos Maestro 00–06 en `application/.maestro/flows/`.
- Capturas de onboarding, dashboard con gráficos, comparador y ajustes.
