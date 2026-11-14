# Tasks 001 — Docker, PostGIS y CI

- [ ] **T1 — Dockerfile multi-stage**
  - RF: 001.5
  - Etapas base/builder/runtime/dev/test; non-root; `$PORT`; healthcheck.
  - Hecho cuando: `docker build --target runtime` y `whoami` ≠ root.

- [ ] **T2 — Compose db + api + migrate**
  - RF: 001.1, 001.4
  - `env_file`, healthcheck, volumen, depends_on.
  - Hecho cuando: `docker compose up --build` y `/health` 200.

- [ ] **T3 — Alembic + PostGIS**
  - RF: 001.3
  - `CREATE EXTENSION postgis`; tablas mínimas; migración inicial.
  - Hecho cuando: `alembic upgrade head` y `select postgis_version()`.

- [ ] **T4 — `/health` y `/ready`**
  - RF: 001.2
  - Liveness sin DB; readiness con DB/migraciones/snapshots.
  - Hecho cuando: DB caída → 503; DB ok → 200.

- [ ] **T5 — Seed demo**
  - RF: 001.3
  - Perfil `demo`; parcela sintética, 3 cultivos, 3 planes.
  - Hecho cuando: seed idempotente; datos visibles por API/SQL.

- [ ] **T6 — CI**
  - RF: 001.6
  - Postgres service; lint, unit, integración, contrato, build.
  - Hecho cuando: PR de prueba verde; falla con test roto.

- [ ] **T7 — Smoke**
  - RF: 001.7
  - Script `tests/smoke/run.py`; health, ready, ruta placeholder.
  - Hecho cuando: < 60 s y código 0.

- [ ] **T8 — Load test**
  - RF: 001.8
  - k6 10 VU, 2 min; reporte p95.
  - Hecho cuando: p95 < 500 ms o se documenta el límite.

- [ ] **T9 — Docs**
  - `docs/architecture/deploy-local.md`, README de API.
  - Hecho cuando: un dev levanta el stack siguiendo solo el doc.

## Definición de terminado

- [ ] RF con evidencia.
- [ ] CI verde.
- [ ] Smoke y load test documentados.
- [ ] Sin secretos en imagen.
