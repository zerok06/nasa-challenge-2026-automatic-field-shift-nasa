# Spec 007 — Historial, agua y suelo

| Campo | Valor |
|---|---|
| ID | 007 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 005 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

La comparación necesita saber qué se sembró antes, cuánta agua hay y qué se sabe del suelo. Muchas veces el agricultor no tiene todos los datos; el sistema debe aceptar esa realidad y no convertirla en ceros. Este spec implementa los datos de dominio y su edición.

## Usuarios / actores

- Agricultor.
- Técnico/agrónomo.
- Motores de agua/economía/rotación.

## Historias de usuario

- H1: Como agricultor, quiero registrar mis últimas campañas.
- H2: Como agricultor, quiero declarar el agua que tengo, aunque sea aproximada.
- H3: Como dev, quiero saber qué falta sin inventar.

## Requisitos funcionales (EARS)

- **RF-007.1:** EL SISTEMA permite CRUD de historial de cultivos con cultivo, familia, fechas y notas.
- **RF-007.2:** EL SISTEMA permite registrar agua por período con volumen m³ o mm, método y eficiencia.
- **RF-007.3:** EL SISTEMA permite registrar observaciones de suelo con variable, valor, unidad, método y fecha.
- **RF-007.4:** SI falta área, ENTONCES EL SISTEMA no convierte m³ a mm; devuelve `mm=null` y `missing_inputs`.
- **RF-007.5:** SI el método es “turno” sin caudal, ENTONCES EL SISTEMA no calcula volumen; marca `unknown`.
- **RF-007.6:** EL SISTEMA expone `/parcels/{id}/context` con historial, agua, suelo y faltantes.
- **RF-007.7:** EL SISTEMA muestra en la ficha las secciones editables y etiquetas de evidencia.
- **RF-007.8:** CUANDO no hay análisis de suelo, EL SISTEMA muestra “fertilidad por verificar” y no asigna puntaje.

## Requisitos no funcionales

- Unidades canónicas; validación estricta.
- 100 usuarios; listas pequeñas.
- Sin PII innecesaria.
- Textos claros; sin jerga.

## Casos límite

- Fechas solapadas → warning.
- Eficiencia 0 o >1 → 422.
- Volumen negativo → 422.
- pH fuera de 0–14 → 422.
- Textura no listada → “otra” + nota.
- Múltiples análisis → elegir el más reciente; mostrar fecha.
- Parcela borrada → 404.

## Fuera de alcance

- Análisis de laboratorio automático.
- Sensores IoT.
- Dosis de fertilizantes.

## Criterios de finalización

- CRUD de las tres entidades.
- Contexto agregado.
- UI editable.
- Tests de unknown.

## Matriz de pruebas

| RF | Test |
|---|---|
| 007.1 | I: historial |
| 007.2 | U/I: agua |
| 007.3 | I: suelo |
| 007.4 | U: m³→mm null |
| 007.5 | U: turno sin caudal |
| 007.6 | I: context |
| 007.7 | E: ficha |
| 007.8 | U/E: sin análisis |
