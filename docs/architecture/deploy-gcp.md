# Despliegue GCP — Anden (Spec 029)

## Estado

| Recurso | Valor |
|---|---|
| Proyecto (ID) | `project-59be27c2-c126-4ea7-b01` |
| Proyecto (nombre) | `nasa-2026-automatic` |
| Región / zona | `us-central1` / `us-central1-a` |
| VM | `anden-vm` · `e2-small` · Debian 12 · 20 GB `pd-standard` |
| IP estática | `34.55.141.32` |
| Dominio | `https://34-55-141-32.sslip.io` |
| Service accounts | `anden-api@…`, `anden-builder@…` |
| Secretos | `anden-database-url`, `anden-jwt-secret` |
| Modelo | `gemini-3.5-flash` · Vertex AI · endpoint global |
| Imagen | `us-central1-docker.pkg.dev/project-59be27c2-c126-4ea7-b01/anden/api:<tag>` |

## Arquitectura

```text
Android / Expo
      │ HTTPS 443
      ▼
Caddy (VM e2-small) ──► FastAPI :8000 ──► Vertex AI (gemini-3.5-flash)
                                │
                                ▼
                    Postgres 16 + PostGIS 3.4
                    (volumen Docker, sin puerto público)
```

- Un worker de uvicorn y límites por contenedor: API 512 MB, DB 700 MB,
  Caddy 128 MB.
- Swap de 2 GB y `vm.swappiness=10`.
- El disco de arranque conserva el volumen `anden_pgdata`.
- La IP es estática; el dominio `sslip.io` se deriva de ella y Caddy saca el
  certificado de Let's Encrypt automáticamente.

## Despliegue

Requisitos: `gcloud` autenticado, permisos de Owner/Editor, billing activo.

```bash
gcloud config set project project-59be27c2-c126-4ea7-b01

# 1. Infra base: APIs, SAs, roles, secretos, IP, firewall y VM
bash scripts/gcp/bootstrap.sh

# 2. Build + push + deploy (idempotente)
bash scripts/gcp/deploy.sh

# 3. Smoke test
DOMAIN=34-55-141-32.sslip.io bash scripts/gcp/smoke.sh
```

En Windows se puede ejecutar desde Cloud Shell o WSL con `gcloud` autenticado.
La VM usa un `startup-script` de GCE (no cloud-init): instala Docker, crea swap
y configura la rotación de logs.

### Deploy de cambios (día a día)

```powershell
.\scripts\gcp\deploy.ps1
```

Corre tests de backend/móvil, construye la imagen, la sube a Artifact Registry,
actualiza la VM, valida Caddy y ejecuta el smoke test. Para saltar tests o
hacer rollback:

```powershell
.\scripts\gcp\deploy.ps1 -SkipTests
.\scripts\gcp\deploy.ps1 -Tag gcp-20261114-1744 -SkipTests
```

El CD es manual a propósito; el CI de `.github/workflows/ci.yml` corre tests en
cada push/PR. Si se quiere push-to-deploy, el siguiente paso es Workload
Identity Federation.

### Variables del stack

El `.env` de la VM lo genera `deploy.sh` a partir de Secret Manager. No se
commitea. Las variables no secretas están en `deploy/gcp/.env.example`.

## Operación

```bash
# Shell en la VM
gcloud compute ssh anden-vm --zone=us-central1-a --tunnel-through-iap

# Estado y logs
sudo docker compose -f /opt/anden/docker-compose.yml --env-file /opt/anden/.env ps
sudo docker compose -f /opt/anden/docker-compose.yml --env-file /opt/anden/.env logs -f api

# Reiniciar solo la API
sudo docker compose -f /opt/anden/docker-compose.yml --env-file /opt/anden/.env restart api

# Rollback a un tag anterior
sudo sed -i 's|^API_IMAGE=.*|API_IMAGE=.../anden/api:<tag-anterior>|' /opt/anden/.env
/opt/anden/remote-deploy.sh
```

### Backup de la base

```bash
sudo docker compose -f /opt/anden/docker-compose.yml --env-file /opt/anden/.env \
  exec -T db pg_dump -U automatic -Fc automatic > /opt/anden/anden-$(date +%F).dump
```

Opcional: copiar el `.dump` a un bucket con lifecycle de 7 días.

### Actualizar la app móvil

```bash
# application/.env.local
EXPO_PUBLIC_API_URL=https://34-55-141-32.sslip.io
cd application && pnpm start -- --lan
```

El resolver conserva URLs que no son loopback, así que el teléfono usa el
dominio directo. `EXPO_PUBLIC_DEMO_MODE=true` se mantiene.

## Seguridad

- Firewall público solo `tcp:80,443` (`anden-web`).
- SSH solo desde el rango de IAP `35.235.240.0/20` (`anden-ssh-iap`).
- Se eliminaron `default-allow-ssh` y `default-allow-rdp` del VPC default;
  no hay 22/3389 abiertos a internet.
- Postgres no publica puertos al host.
- `anden-api` solo tiene `aiplatform.user`, `artifactregistry.reader`,
  `logging.logWriter` y `monitoring.metricWriter`. **No** puede leer Secret
  Manager: los secretos los lee el operador/CI al desplegar.
- `anden-builder` solo tiene `cloudbuild.builds.builder` y
  `artifactregistry.writer`.
- Secretos en Secret Manager; `.env` en la VM con modo `600` y dueño root.
- Sin API keys de Gemini en código, imagen ni app: la VM usa ADC.
- Caddy añade HSTS, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy` y un límite de body de 2 MB.
- `unattended-upgrades` está instalado; SSH con password deshabilitado.

## Costos estimados (us-central1)

| Ítem | Aprox. |
|---|---|
| `e2-small` 730 h | US$ 12.23 |
| Disco 20 GB `pd-standard` | US$ 0.80 |
| IP estática adjunta | US$ 0 |
| Egress demo | centavos |
| Gemini 3.5 Flash | centavos por conversación |
| Cloud Build / Artifact Registry | free tier o centavos |

Total ≈ US$ 13/mes + tokens, cubierto por los créditos del free trial. El free
trial vence a los 90 días; si el demo es después, hay que upgradar la cuenta.

## Límites conocidos

- Una sola VM: si se cae, la API se cae. Para el piloto/demo es aceptable.
- Sin historial multi-turno: `agent_threads` no guarda mensajes.
- El sandbox de 1.7–2 GB obliga a un worker y límites estrictos.
- Si se recrea la VM, el volumen `anden_pgdata` se pierde; restaurar el dump.
- `sslip.io` depende de DNS público; si falla, usar `nip.io` o un dominio real.

## Troubleshooting

| Síntoma | Revisar |
|---|---|
| Caddy no saca certificado | DNS de `sslip.io`, firewall 80/443, logs de Caddy |
| `/ready` en `partial` | `docker compose logs migrate`, seed, conexión a DB |
| `gemini_fallback` en la respuesta | logs de `api`, cuota/permiso de Vertex, modelo/region |
| `explanation_fallback` | el modelo citó una cifra que no está en la evidencia; es el guard funcionando |
| La VM no tiene Docker | metadata `startup-script`, `sudo tail -100 /var/log/daemon.log` |
| Memoria alta | `docker stats`, bajar `shared_buffers` o `max_connections` |
