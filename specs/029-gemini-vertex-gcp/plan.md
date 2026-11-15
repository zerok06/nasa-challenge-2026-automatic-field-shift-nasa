# Plan 029 — Gemini en Vertex AI + despliegue GCP

## Decisiones

| Tema | Decisión |
|---|---|
| Proveedor | Vertex AI (`aiplatform.googleapis.com`), endpoint global |
| Modelo | `gemini-3.5-flash` (verificado en el proyecto) |
| Auth | Service account de la VM vía ADC; sin API key |
| Tools | 4 tools con parcela ligada al servidor |
| Fallback | Modo `fake` actual, sin cambios de contrato |
| Cómputo | VM `e2-small`, `us-central1-a`, 20 GB `pd-standard` |
| DB | Postgres 16 + PostGIS 3.4 en Docker, volumen persistente |
| TLS | Caddy + `sslip.io` sobre IP estática |
| Imagen | Cloud Build → Artifact Registry → VM |
| Secretos | Secret Manager (`DATABASE_URL`, `JWT_SECRET`) |

## Arquitectura

```text
Android / Expo
      │ HTTPS 443
      ▼
Caddy (VM e2-small)
      │
      ▼
FastAPI :8000 ──► Vertex AI (gemini-3.5-flash, global)
      │
      ▼
Postgres 16 + PostGIS (volumen Docker, sin puerto público)
```

## Fase A — Adaptador Gemini

1. Dependencias: `google-genai>=2.30` en el extra `agent`; `uv lock`.
2. `config.py`: `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` (default
   `global`), `GEMINI_MODEL` (default `gemini-3.5-flash`),
   `GEMINI_MAX_OUTPUT_TOKENS`, `GEMINI_MAX_TOOL_CALLS`.
3. `agent/tools.py`: declaraciones JSON Schema y dispatcher autorizado.
4. `agent/llm.py`: loop de function calling, timeout, reintento, logging de
   tokens y latencia.
5. `agent/validation.py`: guard numérico y plantilla de respaldo.
6. `agent/runtime.py`: selector `gemini|fake`, conserva el camino determinista.
7. Tests: unitarios del guard y dispatcher, contrato con cliente mockeado;
   integración existente sigue con `fake`.

## Fase B — Artefactos de despliegue

```text
deploy/gcp/docker-compose.yml
deploy/gcp/Caddyfile
deploy/gcp/startup.sh
deploy/gcp/cloudbuild.yaml
deploy/gcp/.env.example
scripts/gcp/bootstrap.sh
scripts/gcp/deploy.sh
scripts/gcp/smoke.sh
```

- Compose con `mem_limit`, Postgres afinado y `migrate` como servicio one-shot.
- Cloud-init instala Docker, crea swap y activa rotación de logs.
- Bootstrap: APIs, service account, roles, secretos, IP, firewall y VM.
- Deploy: build/push, subida de compose/Caddyfile/`.env`, pull y `up -d`.
- Smoke: health, ready, auth anónimo, comparación y agente.

## Fase C — Despliegue

1. `bootstrap.sh` (idempotente).
2. `deploy.sh` con tag `git rev-parse --short HEAD`.
3. Verificar `/api/v1/ready` y `/health`.
4. Ejecutar smoke tests y revisar `docker compose ps` y logs.
5. Apuntar `EXPO_PUBLIC_API_URL=https://<ip>.sslip.io`, `pnpm env:sync`.

## Fase D — Documentación

- `docs/architecture/deploy-gcp.md` con operación, costos y rollback.
- `docs/architecture/adr-0006-gemini-vertex-gcp-vm.md`.
- Entrada en `MEMORY.md`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| 2 GB justos | Límites por contenedor, swap, 1 worker |
| Modelo no disponible | `gemini-3.5-flash` verificado; configurable por env |
| Free trial vence | Documentar upgrade; no es crítico para el demo |
| Fuga de secretos | Secret Manager + `.env` 600 en la VM |
| Costo de tokens | `max_output_tokens`, 1 reintento, tools acotadas |
| Sin historial multi-turno | Documentado; spec futura |

## Pruebas

- `pytest backend/tests -q` (fake).
- `pytest backend/tests/unit/test_number_guard.py` (guard).
- `pytest backend/tests/contract/test_gemini_contract.py` (mock).
- Smoke HTTP contra el dominio.
- Maestro contra Expo Go apuntando al dominio.
