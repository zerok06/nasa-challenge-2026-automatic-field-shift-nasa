# Spec 014 — Motor hídrico

| Campo | Valor |
|---|---|
| ID | 014 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 007, 008, 009 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El comparador necesita una estimación reproducible de ETc, riego y déficit. Es una simplificación, no un modelo hidrológico calibrado. Debe manejar nulos, unidades y supuestos de forma explícita. Es el corazón técnico del producto.

## Usuarios / actores

- Motor de comparación.
- Agente (explica).
- Agricultor.

## Historias de usuario

- H1: Como agricultor, quiero saber cuánta agua requeriría cada opción.
- H2: Como agrónomo, quiero ver la fórmula y los supuestos.
- H3: Como dev, quiero tests numéricos claros.

## Requisitos funcionales (EARS)

- **RF-014.1:** EL SISTEMA calcula `ETc = Σ(Kc × ETo)` por etapa y campaña.
- **RF-014.2:** EL SISTEMA calcula lluvia efectiva con un método documentado y testeado.
- **RF-014.3:** EL SISTEMA calcula necesidad neta, bruta y déficit en mm.
- **RF-014.4:** SI falta ETo, Kc, agua o área, ENTONCES EL SISTEMA devuelve `null` y `missing_inputs`; no 0.
- **RF-014.5:** EL SISTEMA valida eficiencia en (0,1] y no convierte turnos sin caudal.
- **RF-014.6:** EL SISTEMA versiona el cálculo (`water-v0.1`) y registra supuestos.
- **RF-014.7:** EL SISTEMA produce fixtures de paridad Python↔TS.
- **RF-014.8:** EL SISTEMA distingue demanda (ETc) de factibilidad (agua disponible).

## Requisitos no funcionales

- Cálculo < 20 ms por plan.
- Determinista; `today` como parámetro.
- Unidades canónicas.
- Sin DB/HTTP en funciones puras.
- Tolerancia de paridad 1e-6.

## Casos límite

- ETo 0 → ETc 0, no error.
- Eficiencia 1 → bruto = neto.
- Agua > necesidad → déficit 0, factibilidad `sufficient` (si se conoce).
- Agua desconocida → `unknown`.
- Ciclo cruza año → prorrateo documentado.
- Lluvia > ETc → neto 0.
- Área desconocida → no m³↔mm.

## Fuera de alcance

- Balance hídrico diario completo.
- Sensores.
- Calibración local.

## Criterios de finalización

- Fórmulas implementadas.
- Fixtures verdes.
- Supuestos documentados.
- Integración en comparación.

## Matriz de pruebas

| RF | Test |
|---|---|
| 014.1 | U: ETc |
| 014.2 | U: lluvia efectiva |
| 014.3 | U: déficit |
| 014.4 | U: nulls |
| 014.5 | U: validaciones |
| 014.6 | U: versión |
| 014.7 | P: fixtures |
| 014.8 | U: demanda vs factibilidad |
