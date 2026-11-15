# Spec 031 — Ficha de parcela

| Campo | Valor |
|---|---|
| ID | 031 |
| Estado | Implementado (E2E pendiente en dispositivo) |
| Prioridad | P0 |
| Dependencias | 007, 030 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

La app ya permite crear un perfil y una parcela, pero el motor de rotaciones
necesita historial de cultivos, agua, suelo y prioridades. El backend ya tenía
las tablas y endpoints; la app no los capturaba. Sin esos datos, la comparación
usa supuestos y muestra muchos campos como “no disponible”.

El objetivo es que el agricultor complete una **ficha de parcela** por partes,
sin inventar datos y sin bloquear la comparación. La ficha alimenta el motor
existente y prepara las rotaciones explicadas, el riego y el plan de campaña.

## Usuarios / actores

- Agricultor con una o más parcelas.
- Agrónomo/jurado que revisa la trazabilidad de los datos.
- Agente, que usa el contexto actualizado de la parcela.

## Historias de usuario

- H1: Como agricultor, quiero registrar qué sembré en las últimas campañas.
- H2: Como agricultor, quiero decir cuánta agua tengo y de dónde viene.
- H3: Como agricultor, quiero registrar mi análisis de suelo o decir que no lo tengo.
- H4: Como agricultor, quiero elegir qué priorizar: agua, suelo, ganancia, plagas, forraje o mercado.
- H5: Como agricultor, quiero completar la ficha por partes y saber qué falta.
- H6: Como jurado, quiero que cada dato declare su fuente y que los faltantes no se inventen.

## Requisitos funcionales (EARS)

- **RF-031.1:** EL SISTEMA muestra una tarjeta “Ficha de parcela” con progreso en Inicio y en Mi parcela.
- **RF-031.2:** EL SISTEMA muestra 5 pasos: historial, agua, suelo, prioridades y resumen.
- **RF-031.3:** EL SISTEMA permite agregar cultivos del catálogo y una campaña aproximada; si no se recuerda, guarda fechas nulas.
- **RF-031.4:** EL SISTEMA permite declarar disponibilidad, fuente, cantidad (mm o m³) y eficiencia de riego; “No sé” no crea valores.
- **RF-031.5:** EL SISTEMA permite declarar pH, materia orgánica y textura, o indicar que no hay análisis.
- **RF-031.6:** EL SISTEMA permite elegir hasta 3 prioridades y restricciones; se guardan en `preferences_json`.
- **RF-031.7:** EL SISTEMA guarda cada paso al continuar y permite corregirlo después; no hay que terminar todo de una vez.
- **RF-031.8:** EL SISTEMA usa `PATCH /parcels/{id}` con merge de preferencias para no borrar economía ni precios.
- **RF-031.9:** EL SISTEMA invalida contexto, historial, agua, suelo y parcelas al guardar.
- **RF-031.10:** EL SISTEMA muestra el resumen con datos completos y faltantes, y un acceso a “Comparar 3 rotaciones”.
- **RF-031.11:** EL SISTEMA usa ilustraciones SVG propias y la paleta verde/marrón; no usa azul ni naranja.
- **RF-031.12:** EL SISTEMA conserva los datos existentes del demo y no los duplica al editar.

## Requisitos no funcionales

- Android primero; targets ≥48 dp; texto mínimo 14/16.
- Una pregunta principal por pantalla; “No sé” siempre disponible.
- Español peruano simple; claves nuevas caen a español en qu/ay/en hasta revisión.
- Sin nuevas dependencias nativas; `react-native-svg` ya estaba instalado.
- Sin cálculos en el cliente: la app solo captura y muestra; el motor calcula.
- `null` significa “no disponible”, nunca 0.

## Modelo de datos y API

Se reutilizan las tablas existentes:

- `parcel_crop_history`
- `water_availability`
- `soil_observations`
- `parcels.preferences_json`

El catálogo demo se amplió a 8 cultivos (cebolla, zapallo, ají, papa, maíz,
haba, tomate y alfalfa) para que el historial no se limite a tres opciones.

Cambios:

- `PreferencesIn.priorities: dict[str, float]` con validación no negativa.
- `PATCH /api/v1/parcels/{id}` hace merge de `preferences` en vez de reemplazo.
- La app agrega tipos y funciones para catálogo, historial, agua, suelo y preferencias.

## Diseño de la ficha

1. **Historial:** chips de cultivos, año/campaña, “No recuerdo”, borrar una campaña.
2. **Agua:** disponibilidad, fuente, cantidad en mm/m³, eficiencia, “No sé”.
3. **Suelo:** sí/no/no sé; pH, materia orgánica, textura.
4. **Prioridades:** hasta 3 tarjetas y restricciones.
5. **Resumen:** estado por sección, faltantes y CTA de comparación.

Cada paso tiene “Escuchar”, “¿Por qué te pregunto esto?” y una ilustración SVG.

## Fuera de alcance

- Mapa selector de ubicación manual (Spec 032).
- Rotaciones explicadas con timeline y evidencia (Spec 032).
- Riego/plan de campaña con Open-Meteo/SRTM (Spec 032).
- Edición avanzada de precios, costos y rendimiento.
- Carga de PDF/foto del análisis de suelo.

## Criterios de aceptación

- Se puede completar cada paso con datos o con “No sé”.
- Al guardar, `context` y la UI reflejan los datos.
- Las preferencias se mergean y conservan `economics` y `price_assumption_type`.
- El historial nuevo cambia la rotación actual del motor.
- El agua declarada cambia la completitud y el balance.
- El suelo declarado cambia “por revisar”.
- El resumen muestra el estado real y no inventa campos.
- Tests verdes y Maestro `09-ficha-parcela` actualizado.

## Evidencia

- `pytest backend/tests -q`: **52 tests**.
- `pnpm test`: **18 tests**.
- `pnpm typecheck` y `pnpm lint` verdes.
- Bundle Android exportado con Metro.
- `PATCH /parcels/{id}` con prioridades verificado contra GCP; `economics` preservado.
- Maestro `09-ficha-parcela` escrito; flujo equivalente verde sobre el APK en emulador.
- APK universal de prueba generado, instalado y probado en emulador Android.
- APK: `dist/anden-0.1.0-universal.apk` (paquete `com.anden.app`, firma debug).
