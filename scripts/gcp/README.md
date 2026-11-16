# Scripts GCP — Anden

## Deploy diario (Windows)

Un solo comando desde la raíz del repo:

```powershell
.\scripts\gcp\deploy.ps1
```

Hace, en orden:

1. `pytest` del backend.
2. `pnpm typecheck`, `pnpm test` y `pnpm lint` del móvil.
3. Build de la imagen en Cloud Build y push a Artifact Registry con tag
   `gcp-<fecha>-<hora>`.
4. Copia `docker-compose.yml`, `Caddyfile` y `remote-deploy.sh` a la VM.
5. Regenera `/opt/anden/.env` desde Secret Manager (sirve también si
   reconstruyes la VM), hace `pull`, `up -d`, valida y recarga Caddy.
6. Corre el smoke test (health, ready, comparación con Gemini, guardado).

Opciones:

```powershell
# Saltar tests (solo si ya corriste la suite)
.\scripts\gcp\deploy.ps1 -SkipTests

# Rollback / redeploy de una imagen existente, sin build
.\scripts\gcp\deploy.ps1 -Tag gcp-20261114-1744 -SkipTests

# Solo desplegar, sin smoke
.\scripts\gcp\deploy.ps1 -SkipTests -NoSmoke
```

## Smoke y estado

```powershell
.\scripts\gcp\smoke.ps1
.\scripts\gcp\status.ps1
```

`smoke.ps1` valida `/ready`, crea un usuario anónimo, una parcela demo, una
comparación con `open_comparison`, y un guardado con `save_plan_draft`.
Falla si Gemini cae al fallback o si la respuesta supera 220 caracteres.

`status.ps1` muestra la VM, los contenedores, RAM, disco y `/ready`.

## Primera instalación

El bootstrap de infraestructura se corre una vez, desde Cloud Shell o WSL con
`gcloud` autenticado:

```bash
bash scripts/gcp/bootstrap.sh
```

Crea APIs, service accounts, roles, secretos, IP estática, firewall y VM. No
crea la imagen ni arranca el stack; eso lo hace `deploy.ps1` o `deploy.sh`.

## CI

`.github/workflows/ci.yml` corre en cada push/PR:

- Backend: PostGIS en service container, `uv sync --extra dev --extra gemini`,
  `pytest`.
- Mobile: `pnpm install --frozen-lockfile`, `typecheck`, `test`, `lint`.

El CD es manual a propósito (`deploy.ps1`) para no guardar credenciales de GCP
en GitHub. Si luego quieres push-to-deploy, el siguiente paso es configurar
Workload Identity Federation y un workflow de deploy.

## Requisitos

- `gcloud` autenticado con permisos de Owner/Editor en el proyecto y acceso a
  los secretos (`anden-database-url`, `anden-jwt-secret`).
- Python 3.12 con `backend/.venv` y `pytest`.
- `pnpm` y dependencias de `application/`.
- El working tree se sube a Cloud Build tal cual: si quieres desplegar un
  commit exacto, haz commit antes.
