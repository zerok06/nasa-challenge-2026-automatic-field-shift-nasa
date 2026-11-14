# Plan 001 — Docker, PostGIS y CI

## Decisiones

| Tema | Elección | Alternativa | Motivo |
|---|---|---|---|
| DB local | `postgis/postgis:16-3.4` | Supabase/Neon | Local, sin pausas, PostGIS real |
| API | `python:3.12-slim`, uv | Alpine | Wheels y compatibilidad |
| Migraciones | Alembic en servicio one-shot | `create_all` al arrancar | Seguro con réplicas |
| Ingesta | Imagen separada | Incluir rasterio en API | Cold start y tamaño |
| CI | GitHub Actions + Postgres service | Solo local | Puerta real |
| Puerto | `$PORT` con default 8000 | Fijo 8000 | Cloud Run-ready |

## Servicios Docker

| Servicio | Imagen/build | Comando | Perfil |
|---|---|---|---|
| `db` | `postgis/postgis:16-3.4` | postgres | siempre |
| `api` | `services/api` target `dev`/`runtime` | uvicorn | siempre |
| `migrate` | API runtime | `alembic upgrade head` | siempre |
| `seed` | API runtime | `python -m app.seed` | `demo` |
| `ingest` | `services/ingest` | CLI POWER/IMERG | `ingest` |
| `adminer` | `adminer` | UI DB | `tools` |

## Dockerfile

Etapas: `base` → `builder` → `runtime` → `dev` → `test`.

- `base`: python 3.12-slim, usuario `app` UID 10001, `PYTHONUNBUFFERED`, `PIP_NO_CACHE_DIR`.
- `builder`: uv, lockfile, `uv sync --no-dev`.
- `runtime`: copia venv + app, `EXPOSE 8000`, `HEALTHCHECK` a `/health`, `CMD ["sh","-c","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]`.
- `dev`: deps de dev, `--reload`, bind mount en compose override.
- `test`: pytest.
- `.dockerignore`: `.env`, `.git`, tests, datasets grandes.

## Compose

```yaml
services:
  db:
    image: postgis/postgis:16-3.4
    env_file: .env
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 10
  api:
    build: { context: services/api, target: dev }
    env_file: .env
    ports: ["${API_PORT:-8000}:8000"]
    depends_on:
      db: { condition: service_healthy }
      migrate: { condition: service_completed_successfully }
  migrate:
    build: { context: services/api, target: runtime }
    env_file: .env
    command: ["alembic", "upgrade", "head"]
    depends_on: { db: { condition: service_healthy } }
volumes: { pgdata: {} }
```

## Migraciones

- `alembic init`, `env.py` async o sync con `DATABASE_URL`.
- Primera migración: `users`, `parcels` mínimos + `CREATE EXTENSION postgis`.
- En Cloud Run futuro: job `migrate` antes del deploy; nunca en entrypoint con múltiples instancias.

## Health y ready

- `/api/v1/health`: `{status:"ok", version, commit}`; sin DB.
- `/api/v1/ready`: `SELECT 1`, `alembic_version`, snapshots requeridos; 503 con `details` seguro.

## Seed demo

- `parcel_demo_01` sintética, 1.2 ha, historial cebolla→zapallo.
- 3 cultivos, 3 planes, 2 escenarios.
- `is_simulated=true`; sin PII.
- Idempotente por `parcel_id`.

## CI

```yaml
jobs:
  api:
    services:
      postgres: { image: postgis/postgis:16-3.4, env: ..., ports: [5432:5432] }
    steps:
      - checkout
      - setup-python 3.12
      - uv sync
      - ruff check
      - alembic upgrade head
      - pytest -q
  mobile:
    steps: [checkout, setup-node 22, pnpm install, pnpm --filter mobile test, typecheck]
  contract:
    steps: [pytest tests/contract, openapi drift]
  parity:
    steps: [pytest tests/parity, pnpm --filter mobile test:parity]
  docker:
    steps: [docker build]
```

## Capacity

- 100 registrados, 10 concurrentes, lecturas dominantes.
- Pool 10–20; índices por owner/parcel; paginación.
- k6 `tests/load/read.js`: 10 VU, 2 min; p95 < 500 ms.

## Cobertura RF

| RF | Archivo |
|---|---|
| 001.1 | `docker-compose.yml` |
| 001.2 | `app/api/v1/health.py` |
| 001.3 | `alembic/`, `app/seed.py`, compose |
| 001.4 | volumen `pgdata` |
| 001.5 | `Dockerfile`, `.dockerignore` |
| 001.6 | `.github/workflows/ci.yml` |
| 001.7 | `tests/smoke/run.py` |
| 001.8 | `tests/load/read.js` |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Migración falla y API arranca | `migrate` bloquea; ready 503 |
| Imagen grande | target runtime sin geo |
| Secretos en imagen | `.dockerignore`, env runtime |
| Windows volumes lentos | documentar; usar named volume |
| CI lento | cache uv/pnpm; tests unitarios rápidos |
