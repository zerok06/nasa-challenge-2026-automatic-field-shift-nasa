# Spec 015 — Economía y suelo

| Campo | Valor |
|---|---|
| ID | 015 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 007, 008 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El agricultor necesita ver el compromiso económico sin que un dato faltante se convierta en un margen falso. También necesita señales de suelo comprensibles, sin un “índice de fertilidad” inventado. Este spec implementa ambos motores.

## Usuarios / actores

- Agricultor.
- Agrónomo.
- Comparador/agente.

## Historias de usuario

- H1: Como agricultor, quiero un margen solo si tengo precios/costos.
- H2: Como agricultor, quiero saber el riesgo de repetir familia o dejar suelo desnudo.
- H3: Como agrónomo, quiero que no se inventen nutrientes.

## Requisitos funcionales (EARS)

- **RF-015.1:** EL SISTEMA calcula ingreso, margen y precio de equilibrio cuando hay área, rendimiento, precio y costos.
- **RF-015.2:** SI falta cualquiera de esos insumos, ENTONCES EL SISTEMA devuelve `margin=null` y `missing_inputs`.
- **RF-015.3:** EL SISTEMA etiqueta precios históricos como `historical`, no actuales.
- **RF-015.4:** EL SISTEMA evalúa señales de suelo: familia repetida, días sin cobertura, diversidad, textura y observaciones.
- **RF-015.5:** SI no hay análisis de laboratorio, ENTONCES EL SISTEMA usa `fertility_status=not_measured` y no asigna puntaje.
- **RF-015.6:** EL SISTEMA no recomienda dosis de fertilizantes ni agroquímicos.
- **RF-015.7:** EL SISTEMA versiona economía (`econ-v0.1`) y suelo (`soil-v0.1`) con supuestos.
- **RF-015.8:** EL SISTEMA produce fixtures de paridad y tests de null.

## Requisitos no funcionales

- Cálculo < 10 ms.
- Unidades PEN/kg/kg/ha.
- Determinista.
- Sin DB/HTTP en funciones puras.
- Mensajes claros.

## Casos límite

- Precio 0 → margen negativo, no null (dato válido).
- Rendimiento 0 → precio equilibrio indefinido; null.
- Costos 0 → margen = ingreso; advertencia.
- Área null → no producción total; margen por ha o null.
- Análisis de suelo viejo → fecha visible.
- Familia repetida 2+ → flag.
- Suelo desnudo > umbral → flag.

## Fuera de alcance

- Contabilidad completa.
- Predicción de precios.
- Dosis.

## Criterios de finalización

- Fórmulas.
- Nulls.
- Señales de suelo.
- Fixtures.

## Matriz de pruebas

| RF | Test |
|---|---|
| 015.1 | U: margen |
| 015.2 | U: null |
| 015.3 | U: historical |
| 015.4 | U: señales |
| 015.5 | U: not_measured |
| 015.6 | M: copy |
| 015.7 | U: versión |
| 015.8 | P: fixtures |
