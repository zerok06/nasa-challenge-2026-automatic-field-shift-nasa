# Tasks 002 — Contratos y esqueleto API

- [ ] **T1 — Esqueleto FastAPI**
  - RF: 002.1
  - `app/main.py`, router `/api/v1`, health/ready.
  - Hecho cuando: `pytest` y `curl` 200.

- [ ] **T2 — Settings**
  - RF: 002.4
  - `pydantic-settings`, `SecretStr`, validadores, fail-fast.
  - Hecho cuando: falta `JWT_SECRET` → error sin valor.

- [ ] **T3 — Envelope de errores**
  - RF: 002.2
  - `ApiError`, handler, códigos.
  - Hecho cuando: tests de cada código.

- [ ] **T4 — request_id**
  - RF: 002.3
  - Middleware + ContextVar + logs.
  - Hecho cuando: header presente y mismo en log.

- [ ] **T5 — OpenAPI + tipos TS**
  - RF: 002.5, 002.6
  - Export script, `openapi-typescript`, CI drift.
  - Hecho cuando: `tsc` compila; drift falla.

- [ ] **T6 — CORS**
  - RF: 002.7
  - Config por env; preflight.
  - Hecho cuando: origen permitido 204; no permitido sin header.

- [ ] **T7 — Body limit y rate limit**
  - RF: 002.9
  - Middleware 1 MB; limiter base.
  - Hecho cuando: 413 y 429 con envelope.

- [ ] **T8 — Postman**
  - RF: 002.8
  - Colección + environments; Newman.
  - Hecho cuando: corre local sin secretos.

- [ ] **T9 — Docs**
  - `docs/architecture/api-surface.md` enlazado; README API.
  - Hecho cuando: un dev encuentra rutas y errores.

## Definición de terminado

- [ ] OpenAPI versionado.
- [ ] Tipos TS generados.
- [ ] Errores/request_id/CORS/rate limit testeados.
- [ ] Postman verde.
