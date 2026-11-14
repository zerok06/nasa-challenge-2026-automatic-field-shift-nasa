# Tasks 017 — API de comparación y escenarios

- [ ] **T1 — Contrato**
  - RF: 017.1, 017.8
  - Pydantic + OpenAPI.
  - Hecho cuando: tipos TS generados.

- [ ] **T2 — Servicio de comparación**
  - RF: 017.1–017.4
  - Orquesta contexto + planes + evaluación.
  - Hecho cuando: 3 planes persistidos.

- [ ] **T3 — Persistencia**
  - RF: 017.2
  - `analysis_runs`, plans, steps.
  - Hecho cuando: GET inmutable.

- [ ] **T4 — Idempotencia**
  - RF: 017.5
  - Header + hash + unique.
  - Hecho cuando: misma key no duplica; distinta → 409.

- [ ] **T5 — Escenario**
  - RF: 017.6, 017.7
  - Hijo, multiplicadores, validación.
  - Hecho cuando: baseline intacto.

- [ ] **T6 — Tests contrato/integración**
  - RF: 017.1–017.8
  - OpenAPI, persistencia, concurrencia.
  - Hecho cuando: verdes.

## Definición de terminado

- [ ] POST/GET/simulate.
- [ ] Contrato.
- [ ] Idempotencia.
- [ ] Escenario hijo.
