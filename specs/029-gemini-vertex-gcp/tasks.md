# Tasks 029 — Gemini en Vertex AI + despliegue GCP

## Fase A — Código

- [x] **029.1** Agregar `google-genai` al extra `agent`, actualizar `uv.lock` y
  el `Dockerfile` (`uv sync --frozen --extra agent`).
- [x] **029.2** Extender `config.py` con proyecto, location, modelo, tokens y
  máximo de tools.
- [x] **029.3** Crear `agent/tools.py` con las 4 declaraciones y el dispatcher
  autorizado por parcela.
- [x] **029.4** Crear `agent/llm.py` con el loop de function calling, timeout,
  reintento y logging.
- [x] **029.5** Crear `agent/validation.py` con el guard numérico y la plantilla.
- [x] **029.6** Refactorizar `agent/runtime.py` para `gemini|fake` y fallback.
- [x] **029.7** Tests: tools, guard, contrato Gemini mockeado; verificar que la
  integración existente sigue verde.

## Fase B — Infra

- [x] **029.8** Crear `deploy/gcp/docker-compose.yml` con límites, Postgres
  afinado, `migrate`, API y Caddy.
- [x] **029.9** Crear `Caddyfile`, `startup.sh`, `cloudbuild.yaml` y
  `.env.example`.
- [x] **029.10** Crear `scripts/gcp/bootstrap.sh`, `deploy.sh` y `smoke.sh`.

## Fase C — Despliegue

- [x] **029.11** Ejecutar bootstrap: APIs, service account, roles, secretos,
  IP estática, firewall y VM.
- [x] **029.12** Build/push de la imagen y despliegue del stack.
- [x] **029.13** Verificar `/ready`, logs y smoke tests.
- [x] **029.14** Apuntar `EXPO_PUBLIC_API_URL` al dominio y probar la app.

## Fase D — Cierre

- [x] **029.15** Documentar `deploy-gcp.md`, ADR-0006 y `MEMORY.md`.
- [x] **029.16** Completar la matriz RF → test/evidencia.
