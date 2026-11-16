# Spec 034 — Planes interactivos y datos guiados

| Campo | Valor |
|---|---|
| Estado | Implementación parcial; verificación manual pendiente |
| Prioridad | P0 |
| Fecha | 2026-11-15 |
| Dependencias | 018, 019, 026, 028, 031, 033 |

## Problema

La comparación apila tres tarjetas y obliga a recorrer demasiado contenido. El
simulador usa siempre el primer plan, aunque el agricultor quiera probar una
alternativa. Además, la ficha económica no presenta referencias del catálogo y
la ficha de parcela no permite corregir el distrito o las coordenadas.

## Historias

- Como agricultor, quiero distinguir mi práctica actual de las alternativas
  que se derivan de ella, y revisar cada opción sin recorrer tres tarjetas.
- Como agricultor, quiero probar cambios de agua y precio en el plan elegido y
  ver el resultado como estimación.
- Como agricultor, quiero ver un precio de referencia disponible, conocer su
  ámbito/año/estado y corregirlo antes de guardarlo.
- Como agricultor, quiero completar el agua si bloquea el plan y declarar el
  suministro en unidades que conozco.
- Como agricultor, quiero editar el distrito y ubicación de mi parcela.

## Requisitos funcionales

- **RF-034.1:** Comparación y simulador presentan una pestaña «Actual» para la
  rotación registrada, seguida de «Alternativa B» y «Alternativa C». Si no hay
  historial, la primera pestaña y su detalle dicen «Ejemplo»/«Plan de ejemplo»;
  nunca se presenta como práctica actual. Solo se renderiza el detalle elegido.
  La etiqueta y el significado de cada plan se mantienen coherentes en tarjetas,
  gráficas, simulación y mensajes del agente; el orden del motor no cambia.
- **RF-034.2:** El simulador permite elegir cualquiera de los planes y muestra
  baseline y resultado para el plan elegido, manteniendo la comparación base.
- **RF-034.3:** Agua/precio de la simulación se pueden ajustar con controles
  directos dentro de los límites que acepta `/simulate`; se permite restablecer.
- **RF-034.4:** Resultados de simulación se identifican como estimaciones y
  muestran supuestos y datos faltantes.
- **RF-034.5:** Cuando el catálogo tenga precio aplicable al cultivo, se
  prellena como referencia editable y se muestra fuente, año, ámbito y estado;
  no se presenta como precio confirmado del agricultor.
- **RF-034.6:** La referencia busca primero coincidencia distrital y luego el
  ámbito más amplio disponible; las referencias pendientes de cotejo se
  identifican claramente.
- **RF-034.11:** El agente consulta el catálogo al responder sobre el precio de
  un cultivo y devuelve fuente, año, ámbito y estado; no presenta la referencia
  como precio futuro o confirmado.
- **RF-034.12:** `GET /api/v1/catalog/crops` incluye las referencias de
  `precios_chacra_2025` con cultivo, valor, unidad, periodo, zona, fuente y
  estado de cotejo.
- **RF-034.13:** El paquete offline incluye las mismas referencias de precios
  para que la ficha económica pueda precargarlas sin conexión.
- **RF-034.7:** Si el plan seleccionado no tiene dato de agua, se ofrece abrir
  la captura de agua.
- **RF-034.8:** Mi parcela permite editar nombre, superficie, distrito y
  coordenadas; los valores inválidos no se guardan.
- **RF-034.9:** La captura de agua permite declarar fuente por turnos o semana,
  cantidad y unidades comprensibles, manteniendo `unknown` cuando no se sabe.
- **RF-034.10:** Todas las cadenas nuevas usan i18n; idiomas incompletos
  muestran fallback en español sin esconder controles.
- **RF-034.12:** `GET /api/v1/catalog/crops` y el paquete offline incluyen las
  referencias de precios de chacra con cultivo, valor, unidad, periodo, zona,
  fuente y estado de cotejo.
- **RF-034.13:** La ficha económica usa precios de API, bundle offline o el
  respaldo local incluido; la referencia puede editarse antes de guardarla.
- **RF-034.14:** Cada parcela recibe automáticamente una portada agrícola
  ilustrativa estable, elegida de recursos locales que también funcionan sin
  conexión; no se presenta como fotografía real de esa parcela.
- **RF-034.15:** En la primera apertura se muestra una introducción de tres
  pasos antes del onboarding, con opción de avanzar o saltar y persistencia
  local para no repetirla.
- **RF-034.16:** Las pantallas introductorias y las portadas respetan la guía
  visual de Anden, incluyen texto accesible y usan imágenes locales.
- **RF-034.17:** El banner de Mi parcela superpone un degradado negro sobre la
  portada y presenta los textos en blanco con contraste legible sobre las
  imágenes dinámicas.
- **RF-034.18:** Precios y costos prellena el precio con la mejor referencia
  disponible del catálogo en línea, bundle offline o catálogo local. El precio
  propuesto queda editable; costos de producción se capturan del agricultor.
- **RF-034.19:** El riego semanal identifica Open-Meteo como fuente del
  pronóstico. Si la API falla, informa el error recibido y permite reintentar;
  no reemplaza un pronóstico faltante con datos históricos de NASA POWER.
- **RF-034.20:** Las slides de introducción ocupan toda la pantalla y permiten
  regresar con un botón outline de flecha izquierda, además de avanzar.
- **RF-034.21:** La generación de alternativas depende del catálogo agronómico y
  las restricciones del motor, no de que el agricultor ya haya cargado precios
  o rendimientos. Las prioridades de ranking son explícitas (agua, ganancia o
  presupuesto); si falta un dato para una prioridad, se informa «sin datos» y
  no se inventa ni se presenta un puntaje económico como resultado observado.
- **RF-034.22:** Un precio del JSON se presenta como estimado de referencia y
  requiere aceptación o edición explícita del agricultor antes de guardarlo
  como supuesto económico de su parcela. Precio, rendimiento o costo nulos
  permanecen nulos; sin precio o rendimiento no se muestra ganancia estimada.
## Límites

- No se infieren precios ni rendimiento cuando no existe referencia compatible.
- Las referencias del catálogo son supuestos editables, con procedencia visible.
- Las simulaciones no alteran la comparación base ni los datos de parcela.
- Las traducciones quechua/aimara siguen `review_pending`; no se declaran
  traducciones revisadas.

## Criterios de aceptación

- [x] Se cambia entre tres planes mediante selector horizontal de al menos 48 dp.
- [ ] La primera opción se identifica como «Actual» cuando hay historial y
  «Ejemplo» cuando no lo hay; B/C aparecen como alternativas en comparación,
  simulador y gráficas, sin llamarlas Plan A/B/C.
- [ ] Las alternativas siguen disponibles aunque falten datos económicos; la
  app no filtra cultivos por los valores cargados en «Mis precios».
- [x] El motor genera alternativas desde los cultivos del catálogo y sus
  restricciones de rotación/duración, sin depender de «Mis precios».
- [x] Las prioridades disponibles son agua, ganancia y presupuesto; el ranking
  omite criterios sin medición y devuelve `null`/«sin datos» en vez de puntaje
  neutro. Si no hay ninguna métrica evaluable, no declara un mejor plan.
- [x] Precio/rendimiento/costo faltantes mantienen ganancia nula; un precio de
  catálogo requiere `price_confirmed=true` antes de entrar al cálculo.
- Cambiar plan actualiza el escenario mostrado sin perder el preset aplicado.
- Editar valores de agua/precio recalcula mediante el endpoint `/simulate` y
  Reset vuelve a 100%/100% sin cambiar la comparación.
- [x] Cada precio de referencia muestra origen y condición de revisión junto al
  campo editable.
- [x] La ficha puede guardar cambios de distrito/ubicación y volver a mostrarlos.
- [x] Si falta agua, el agricultor puede llegar a la captura desde comparación.
- [x] En una instalación nueva aparecen tres slides introductorias antes del
  onboarding; avanzar o saltar llega al onboarding y la intro no se repite.
- [ ] La ficha de parcela muestra una portada ilustrativa distinta entre
  parcelas y la conserva al reabrir la app, también sin internet.
- [ ] El banner de Mi parcela aplica un degradado negro visible detrás del
  título y el distrito en blanco, con contraste suficiente sobre sus portadas.
- [x] El precio propuesto coincide con cultivo y distrito del catálogo y puede
  editarse; si API/bundle no trae precios, se usa la referencia local. Costos
  quedan editables y sin valores inventados.
- [ ] Si falla el servicio de riego, se muestra el mensaje de API y se ofrece
  reintentar; la pantalla explica la diferencia entre Open-Meteo y NASA POWER.
- [x] Las tres slides cubren la pantalla completa y el botón con `ArrowLeft`
  vuelve una slide sin cambiar el comportamiento de saltar o iniciar.
- Typecheck y lint de la app pasan; pruebas existentes pertinentes y evidencia
  manual se registran al cerrar.

## Matriz de evidencia

| RF | Evidencia |
|---|---|
| 034.1–034.4 | Typecheck/lint + revisión manual del comparador y simulador |
| 034.5–034.6 | Inspección de fuente de referencia y formulario prellenado |
| 034.7–034.9 | Revisión manual de caminos de captura y guardado |
| 034.10 | Inspección de claves i18n y fallback |
| 034.18 | Prueba de alias API/local y revisión de edición del precio propuesto |
| 034.19 | OpenAPI/health del backend, disponibilidad de Open-Meteo y flujo Maestro |
| 034.20 | Maestro `00-intro` verifica avanzar y volver entre slides |
