# Plan 002 — Contratos y esqueleto API

## Estructura

```text
services/api/
├── app/
│   ├── main.py
│   ├── core/{config,logging,errors,security}.py
│   ├── api/v1/{router,health}.py
│   ├── schemas/common.py
│   └── middleware/{request_id,body_limit}.py
├── alembic/
├── tests/{unit,contract,integration}/
├── pyproject.toml
└── Dockerfile
```

## Settings

`pydantic-settings` con `env_file` raíz y validadores:

- `APP_ENV`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`.
- `LLM_PROVIDER`; si `groq`, exige `GROQ_API_KEY` y `GROQ_MODEL`.
- `API_PORT`, `LOG_LEVEL`.
- `SecretStr` para secretos; `__repr__` no los muestra.

## Errores

```python
class ApiError(Exception):
    code: str
    status: int
    message: str
    details: dict
```

Handler global: envelope + `request_id`; no stack traces en producción.

| Código | HTTP |
|---|---|
| validation_error | 422 |
| unauthorized | 401 |
| not_found | 404 |
| conflict | 409 |
| insufficient_data | 200/422 |
| upstream_unavailable | 503 |
| rate_limited | 429 |
| payload_too_large | 413 |
| internal_error | 500 |

## request_id

- Middleware lee `X-Request-ID`; si falta o es inválido, genera UUID.
- ContextVar para logs; header en respuesta.
- No incluir en logs el cuerpo completo.

## OpenAPI y tipos

- FastAPI genera `/api/v1/openapi.json`.
- Script `scripts/export-openapi.py` escribe `contracts/openapi.json`.
- `openapi-typescript contracts/openapi.json -o apps/mobile/src/api/schema.d.ts`.
- CI: regenerar y `git diff --exit-code`.

## CORS

- `CORS_ORIGINS` coma-separado.
- Dev: `http://localhost:8081`, `http://localhost:19006`, túnel.
- Demo compartido: origen explícito, no `*`.
- Métodos/headers permitidos; preflight 204.

## Rate limit y body

- Middleware body max 1 MB → 413.
- `slowapi` o limitador propio en memoria para demo; key por usuario/IP.
- Login 5/min; agente 20/min; comparaciones 10/min.

## Postman

- `postman/Automatic.postman_collection.json`.
- `postman/local.postman_environment.json` (sin secretos).
- Requests: health, ready, placeholder parcel, placeholder comparison.
- Newman en CI/smoke.

## Cobertura RF

| RF | Archivo |
|---|---|
| 002.1 | `api/v1/health.py` |
| 002.2 | `core/errors.py` |
| 002.3 | `middleware/request_id.py`, `core/logging.py` |
| 002.4 | `core/config.py` |
| 002.5 | `scripts/export-openapi.py`, CI |
| 002.6 | `openapi-typescript`, `apps/mobile/src/api` |
| 002.7 | `main.py` CORS |
| 002.8 | `postman/` |
| 002.9 | `middleware/body_limit.py`, limiter |

## Tests

- Unit: settings faltantes, error handler, request_id, body limit.
- Contract: OpenAPI drift, TS compile.
- Integration: CORS preflight, 413/429.
- Smoke: Newman.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Drift OpenAPI | CI + script |
| Secretos en logs | `SecretStr`, filtros |
| CORS mal configurado | tests preflight + env |
| Rate limit en memoria | suficiente demo; Redis P2 |
