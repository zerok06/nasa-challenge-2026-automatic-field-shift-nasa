# Evidencia 029 — Gemini en Vertex AI + despliegue GCP

Fecha: 2026-11-14. Proyecto: `project-59be27c2-c126-4ea7-b01`. Dominio:
`https://34-55-141-32.sslip.io`.

## Tests automatizados

| Comando | Resultado |
|---|---|
| `backend/.venv/Scripts/python.exe -m pytest backend/tests -q` | **47 passed** |
| `pnpm typecheck` (`application/`) | OK |
| `pnpm test` (`application/`) | **18 passed** |
| `pnpm lint` (`application/`) | OK |

Incluye los tests nuevos de la spec 028 (`test_agent_guardrails.py`) y los de
esta spec (`test_number_guard.py`, `test_agent_tools.py`).

## Smoke test vivo

| Caso | Evidencia |
|---|---|
| `/api/v1/health` | HTTP 200, `{"status":"ok"}` |
| `/api/v1/ready` | `{"status":"ready","checks":{"database":true,"crops":true,"snapshot":true}}` |
| Comparación | `tool_trace[0]=compare_rotations`, `open_comparison`, 191–206 caracteres, sin `gemini_fallback` |
| Agua | Respuesta de 166 caracteres, “A tu plan actual…”, sin jerga |
| Ganancia | Respuesta de 162 caracteres, “ganarías…”, sin “margen” |
| Clima | Guardrail “No predigo el clima…”, 85 caracteres |
| Datos faltantes | “análisis de suelo”, `next_step=datos` |
| Guardar | `save_plan_draft`, `next_step=listo`, determinista |

## Infraestructura

| Recurso | Evidencia |
|---|---|
| VM | `anden-vm`, `e2-small`, `us-central1-a`, RUNNING, IP `34.55.141.32` |
| Contenedores | `anden-db-1` healthy, `anden-api-1` healthy, `anden-caddy-1` up |
| Memoria de contenedores | API 121.5 MiB/512, DB 22.9 MiB/700, Caddy 31.9 MiB/128 |
| Host | 816 MiB usados de 1976, 1159 disponibles, swap 2047 MiB |
| Disco | 6.7 GB usados de 20 GB |
| Imagen | `…/anden/api:gcp-20261114-180923` |
| Cloud Build | `b6018c0d-7bf4-4efe-b628-36e1b44bef06` — SUCCESS |
| Log Gemini | `gemini turn model=gemini-3.5-flash tool_calls=1 latency_ms=2550 prompt_tokens=1548 output_tokens=70 total_tokens=1618` |
| Deploy de cambios | `.\scripts\gcp\deploy.ps1 -SkipTests` → build/deploy/smoke OK; `-Tag …` regenera `.env` y smoke OK |
| Firewall | `anden-web` 80/443 público; `anden-ssh-iap` 22 solo IAP |
| Secretos | `anden-database-url`, `anden-jwt-secret` (sin valores en logs) |

## Matriz RF → evidencia

| RF | Evidencia |
|---|---|
| 029.1 Vertex AI + config | `backend/app/agent/llm.py`, `core/config.py`; smoke sin `gemini_fallback` |
| 029.2 Tools ligadas a parcela | `test_tool_declarations_do_not_accept_identity_parameters`; `AgentTools` recibe `Parcel`/`User` |
| 029.3 Servidor ejecuta tools | `test_run_gemini_turn_executes_tool_then_answers`, `test_run_gemini_turn_forces_final_answer_after_tool_budget` |
| 029.4 Guard numérico | `test_validate_accepts_numbers_from_evidence`, `test_validate_rejects_invented_numbers`, `test_validate_accepts_spanish_thousands_separator` |
| 029.5 Timeout/reintento/fallback | `llm._generate` (2 intentos, 20 s), `runtime.run_agent` (`gemini_fallback`) |
| 029.6 `fake` por defecto | `backend/tests/conftest.py`; 47 pytest con `LLM_PROVIDER=fake` |
| 029.7 VM/firewall | `gcloud compute instances describe`, `gcloud compute firewall-rules list`, `deploy-gcp.md` |
| 029.8 Postgres/PostGIS | `deploy/gcp/docker-compose.yml`; `/ready` con `database=true` |
| 029.9 Secretos/IAM | `gcloud secrets list`, IAM de `anden-api`/`anden-builder`; `.env` 600 en la VM |
| 029.10 Cloud Build/Artifact Registry | build `12d712c7…` SUCCESS; imagen `gcp-20261114-1736` |
| 029.11 Ready + smoke | `/api/v1/ready` 200; smoke de agente arriba |
| 029.12 App al dominio | `application/.env.local`; `pnpm test` (`api-url.test.ts`) |
| 029.13 Documentación | `deploy-gcp.md`, `adr-0006-gemini-vertex-gcp-vm.md`, `MEMORY.md` |

## Notas

- El proyecto no tiene `cloud-init`; la VM usa `startup-script` de GCE.
- Los modelos Gemini 2.5 no están disponibles en este proyecto; se usa
  `gemini-3.5-flash` en el endpoint global.
- El token de PowerShell no afecta a la API: la app envía UTF-8; los acentos
  se ven correctos en el JSON. La consola de PowerShell los muestra como
  `Ã¡` por su encoding.
- Las escrituras son deterministas para no depender del modelo.
