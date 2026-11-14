# Tasks 020 — Tools del agente

- [ ] **T1 — Registry y esquemas**
  - RF: 020.1, 020.2, 020.5
  - ToolSpec + Pydantic `extra=forbid`.
  - Hecho cuando: tool desconocida/extra → error.

- [ ] **T2 — Auth interna**
  - RF: 020.3
  - `user_id`/parcela en cada tool.
  - Hecho cuando: IDOR → 404.

- [ ] **T3 — Runtime/timeout**
  - RF: 020.4, 020.8
  - Timeout, retry, error tipado.
  - Hecho cuando: test de timeout.

- [ ] **T4 — Tools de lectura**
  - RF: 020.1
  - context, climate.
  - Hecho cuando: fixtures.

- [ ] **T5 — Tools de cálculo**
  - RF: 020.1
  - compare, simulate.
  - Hecho cuando: llaman servicios reales.

- [ ] **T6 — Fake runtime**
  - RF: 020.6
  - Fixtures deterministas.
  - Hecho cuando: grafo test sin red.

- [ ] **T7 — Trace**
  - RF: 020.7
  - Resumen seguro.
  - Hecho cuando: contrato.

## Definición de terminado

- [ ] 6 tools.
- [ ] Auth/timeout.
- [ ] Fake.
- [ ] Trace.
