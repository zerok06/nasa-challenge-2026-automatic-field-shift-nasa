# ADR-0005 — UI para baja alfabetización digital y retiro de mapas

- **Fecha:** 14-nov-2026
- **Estado:** aceptada
- **Relacionada:** ADR-0004 (marca, i18n, gráficos, accesibilidad)
- **Alcance:** `application/`, `backend/app/agent/`, docs de producto
- **Spec:** 028

## Contexto

El piloto son 100 agricultores de Moquegua, Android, conectividad intermitente,
español y baja familiaridad con apps. La app actual usa jerga agronómica,
métricas densas, texto de 10–11 px, voseo rioplatense y un mapa que solo aporta
contexto regional. El resultado se lee como un tablero para el jurado, no como
una herramienta de campo.

Se evaluó la referencia de Uber Eats por su claridad: menú de tarjetas grandes,
navegación inferior, CTA fijo y pasos. No se adopta su marca, su estética de
comida ni su búsqueda como acción principal.

## Decisiones

### 1. Una pantalla = una decisión

- Título en forma de pregunta, un número grande, una acción principal.
- Máximo tres métricas por plan; el detalle va en “Ver más”.
- Texto mínimo: 14 px secundario, 16 px cuerpo, 22–28 px títulos.
- Targets de 56 px para CTA y 48 px mínimo para el resto.
- Icono + texto siempre; nunca solo icono.

### 2. Navegación

Cuatro pestañas: **Inicio**, **Comparar**, **Preguntar**, **Mi parcela**.
“Ajustes” y “Fuentes” viven dentro de Mi parcela y del header. “Mapa” se
elimina.

### 3. Mapas fuera del producto

Se eliminan la pestaña, la pantalla, el selector del onboarding, los testIDs,
los flujos Maestro 02/02b, la sección de capas satelitales de Fuentes y la
acción `focus_map_layer` del agente. La ubicación se resuelve con GPS y, como
opción avanzada, coordenadas manuales. Los endpoints `/geo` y `/indicators`
pueden permanecer sin UI hasta una spec de deprecación.

Razones:

- El mapa es contexto regional (~11 km) y no mide la parcela.
- Depende de WebView + Leaflet + tiles online; es lo menos offline de la app.
- Ocupa una pestaña y un CTA principal que pueden usarse para decisiones.

### 4. Patrones de Uber Eats, no su piel

Se adoptan: menú de acciones, tarjetas redondeadas con icono, chips de filtro,
barra inferior, CTA fijo, progreso por pasos y estado tipo “pedido en camino”
para el cálculo. No se adoptan: fotos de comida, búsqueda como entrada, ratings,
banners promocionales, negro/blanco de la marca ni su logo.

La identidad sigue siendo Anden: verde, tierra, agua, fondo cálido e
ilustraciones SVG propias.

### 5. Copy en español peruano simple

- Tuteo, no voseo: “Crea”, “Elige”, “Cuéntanos”, “Escribe”, “Simula”.
- Sin jerga en la superficie: “agua que falta”, “ganancia estimada”, “tu plan
  actual”, “datos sin internet”.
- Los términos técnicos viven en disclosures y en la ficha de fuentes.
- Números con `Intl.NumberFormat('es-PE')`; dinero con `S/` y miles
  (`S/ 1,234.50`).

### 6. i18n

Las claves siguen siendo los textos fuente en español. Al cambiar copy se
actualizan `en`, `qu-PE` y `ay-PE`; las claves nuevas sin traducción caen a
español. Quechua y aimara siguen `review_pending`.

## Consecuencias

**Positivas**

- El Inicio responde “qué hago hoy” antes de mostrar metadata.
- Menos densidad, menos jerga y números más legibles.
- La app funciona mejor sin conexión al quitar el mapa.
- El jurado conserva trazabilidad en Fuentes y en “Detalles técnicos”.

**Negativas / límites**

- Se pierde el contorno dibujado de la parcela; el área se escribe o se estima.
- El rediseño requiere una pasada completa de i18n.
- Maestro debe actualizarse; la ejecución E2E depende del dispositivo.
- La validación con agricultores reales sigue pendiente; el diseño es una
  hipótesis hasta la prueba de usabilidad.

## Evidencia

- `specs/028-rediseno-ui-agricultor/`.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`.
- Flujos Maestro actualizados.
- Prueba manual en Expo Go por LAN contra `http://<ip-lan>:8000`.
