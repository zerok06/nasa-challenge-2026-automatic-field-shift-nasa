# Spec 028 — Rediseño de UI para agricultores del piloto

| Campo | Valor |
|---|---|
| ID | 028 |
| Estado | Implementado (E2E pendiente en dispositivo) |
| Prioridad | P0 |
| Dependencias | 003, 018, 019, 022, 025, 027 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

La app funciona, pero hoy se lee como un tablero para el jurado o el agrónomo:
el Inicio abre con metadata de la parcela, las pantallas acumulan métricas y
jerga, y el mapa ocupa una pestaña completa sin aportar a la decisión. El piloto
son 100 agricultores de Moquegua con baja familiaridad digital, conectividad
intermitente y necesidad de respuestas concretas.

El objetivo es que cada pantalla responda **una pregunta, con un número grande y
una acción principal**, en español peruano simple. Se retiran los mapas y se
adoptan los patrones de claridad de Uber Eats (menú de tarjetas, barra inferior,
CTA fijo, pasos), sin copiar su marca ni su estética de comida.

## Usuarios / actores

- Agricultor del piloto (Android, español, conectividad intermitente).
- Agrónomo que revisa supuestos y límites.
- Jurado que evalúa trazabilidad y honestidad de datos.

## Historias de usuario

- H1: Como agricultor, quiero saber en 5 segundos qué puedo hacer hoy con mi
  parcela.
- H2: Como agricultor, quiero comparar tres planes sin leer jerga técnica.
- H3: Como agricultor, quiero entender qué cambia si tengo menos agua o baja el
  precio.
- H4: Como agricultor, quiero guardar un plan y volver a encontrarlo.
- H5: Como jurado, quiero seguir viendo fuentes, límites y `null` honestos.
- H6: Como QA, quiero flujos Maestro estables y testIDs mantenidos.

## Requisitos funcionales (EARS)

- **RF-028.1:** EL SISTEMA elimina la pestaña, la pantalla, el selector y los
  componentes de mapa; la ubicación se resuelve con GPS o coordenadas avanzadas.
- **RF-028.2:** EL SISTEMA usa cuatro pestañas: `Inicio`, `Comparar`,
  `Preguntar` y `Mi parcela`.
- **RF-028.3:** EL SISTEMA muestra en Inicio una tarjeta de próxima decisión y
  tres acciones grandes antes de cualquier detalle técnico.
- **RF-028.4:** EL SISTEMA muestra como máximo tres métricas principales por
  plan: agua que falta, ganancia estimada y si alcanza el agua.
- **RF-028.5:** EL SISTEMA reemplaza la jerga por copy simple y tuteo peruano;
  los términos técnicos quedan en disclosures y en la ficha de fuentes.
- **RF-028.6:** EL SISTEMA formatea números y dinero con `es-PE` (separador de
  miles y `S/`; por ejemplo `S/ 1,234.50`).
- **RF-028.7:** EL SISTEMA mantiene `null` como “No disponible”/“No calculable”,
  nunca como 0.
- **RF-028.8:** EL SISTEMA muestra el paquete offline en `Mi parcela`, no en
  Inicio, y lo explica como “datos para usar sin internet”.
- **RF-028.9:** EL SISTEMA conserva fuentes, límites y disclaimer en la ficha de
  fuentes y en un enlace secundario.
- **RF-028.10:** EL SISTEMA respeta 48 dp mínimo, 56 dp en CTA principal, texto
  mínimo 14 en secundario y 16 en cuerpo, y reduce motion.
- **RF-028.11:** EL AGENTE deja de emitir `focus_map_layer` y responde con
  lenguaje simple; las trazas técnicas quedan en “Detalles técnicos”.
- **RF-028.12:** EL SISTEMA resuelve la URL de API en Expo Go físico usando el
  host de Metro cuando `EXPO_PUBLIC_API_URL` es loopback.
- **RF-028.13:** EL SISTEMA corrige el conflicto de tema claro/oscuro entre
  `GluestackUIProvider` y `PreferencesProvider`.
- **RF-028.14:** EL AGENTE devuelve `next_step.phase` (`datos`, `comparar`,
  `probar`, `guardar`, `listo`) y la app muestra un solo “Siguiente paso”.
- **RF-028.15:** EL AGENTE aplica guardrails: no predice clima/precio, no
  prescribe un cultivo, no inventa datos, rechaza temas fuera de alcance y
  responde en 1–2 frases (≤220 caracteres).
- **RF-028.16:** EL AGENTE prueba su comportamiento con tests de integración
  para fases, guardrails y lenguaje simple.

## Requisitos no funcionales

- Android primero, pantalla de 5", 60 fps con datos demo.
- Funciona sin conexión con el paquete descargado.
- i18n: `es-PE` fuente; `qu-PE` y `ay-PE` siguen `review_pending`; `en`
  actualizado para las claves nuevas.
- WCAG 2.2 AA como objetivo; sin información solo por color.
- Sin nuevas dependencias nativas para ilustraciones: SVG + lucide.

## Fuera de alcance

- Voz a texto y lectura en voz alta (spec 025, fase posterior).
- Fotos reales de cultivos o parcelas.
- Recomendación agronómica automática o prescriptiva.
- Cambios de contrato backend salvo retirar la acción `focus_map_layer`.
- APK/dev build.

## Criterios de finalización

- Mapas eliminados de UI, testIDs, Maestro y docs; `react-native-webview`
  eliminado si no tiene otro uso.
- Inicio, Comparar, Escenario, Preguntar, Mi parcela y Onboarding implementados
  con el nuevo copy.
- `pnpm typecheck`, `pnpm lint` y `pnpm test` verdes.
- Flujos Maestro actualizados (sin 02/02b) y documentados.
- Spec 028, plan y tasks marcados como implementados.

## Matriz de pruebas

| RF | Test / evidencia |
|---|---|
| 028.1 | Búsqueda de `map` en `application/src`; Maestro sin 02/02b |
| 028.2 | `_layout.tsx` + Maestro 01 |
| 028.3 | Maestro 01: hero + acciones visibles |
| 028.4 | Maestro 03: 3 planes con métricas simples |
| 028.5 | Revisión de copy + `en.ts` |
| 028.6 | `tests/format.test.ts` |
| 028.7 | Casos null en comparador y escenario |
| 028.8 | Maestro 06 / Mi parcela |
| 028.9 | Maestro fuentes |
| 028.10 | Checklist `docs/accessibility.md` |
| 028.11 | `pytest backend/tests -q` + revisión de runtime |
| 028.12 | Typecheck + prueba manual en Expo Go LAN |
| 028.13 | Prueba manual claro/oscuro/sistema |
