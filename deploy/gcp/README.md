# Despliegue GCP — API + PWA (`api` y `web`)

Guía operativa de las **dos imágenes** de Anden. La infraestructura base (VM,
IP, secretos, Artifact Registry) se crea una vez con
`scripts/gcp/bootstrap.sh`; aquí se documenta el despliegue del día a día.
Contexto y costos: `docs/architecture/deploy-gcp.md`. Decisión de mismo
dominio: `docs/architecture/adr-0010-pwa-mismo-dominio-caddy.md`.

## Contrato: un dominio, dos responsabilidades

```text
Navegador / Android
        │ HTTPS 443
        ▼
  web (imagen PWA + Caddy)
        ├── /            → /srv (build de frontend/, SPA)
        ├── /api/*       → api:8000
        └── /ready       → api:8000
                              │
                              ▼
                    FastAPI + PostGIS
```

- El PWA se sirve en la **raíz** (`start_url` y scope `/`) para que el service
  worker controle todo el sitio.
- `/api/*` y `/ready` se proxyean al contenedor `api` (`API_UPSTREAM`).
- Caddy hace fallback SPA: cualquier ruta desconocida devuelve `index.html`.
- `sw.js`, `registerSW.js` y `manifest.webmanifest` salen con
  `Cache-Control: no-cache`; el resto de assets se sirve desde `/srv`.
- Como PWA y API comparten origen, **no hay CORS en producción**.
- Caddy añade HSTS, `nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin` y limita el body a 2 MB.

## Imágenes

| Imagen | Dockerfile | Contenido |
|---|---|---|
| `API_IMAGE` | `backend/Dockerfile` | FastAPI, modelos, motores y datasets/catálogo |
| `WEB_IMAGE` | `deploy/gcp/Dockerfile.web` | build de `frontend/` + Caddy 2 (el `Caddyfile` se monta en la VM) |

`deploy/gcp/Dockerfile.web` compila con Node 22, pnpm 10.34.9 y el build arg
`VITE_API_URL`. El valor queda **incrustado en el bundle**: si cambia, hay que
recompilar la imagen.

- `VITE_API_URL=""` (recomendado): mismo dominio; el navegador llama a
  `/api/v1` y Caddy lo proxya.
- `VITE_API_URL=https://api.ejemplo.com`: backend separado; entonces hay que
  agregar el origen del PWA a `CORS_ORIGINS`.

El `Caddyfile` **no** viaja dentro de la imagen: `docker-compose.yml` lo monta
desde `/opt/anden/Caddyfile`. Así puedes cambiar de dominio o agregar una
redirección sin reconstruir ni volver a subir la imagen web.

## Dominio y DNS (DuckDNS o sslip.io)

Caddy emite el certificado solo (HTTP-01). Requisitos:

1. El dominio resuelve a la IP estática de la VM.
2. Puertos **80** y **443** abiertos en el firewall de GCP.
3. Un solo dominio canónico: el service worker y el almacenamiento del PWA son
   **por origen**. Si cambias de dominio, los agricultores deben reinstalar la
   app desde el nuevo enlace.

### DuckDNS (recomendado para la demo)

1. En <https://www.duckdns.org>, crea el subdominio (por ejemplo `anden`) y
   apunta la IP de la VM. También puedes hacerlo por URL:

   ```powershell
   $Token = "<tu-token-duckdns>"
   $Ip = (gcloud compute addresses describe anden-ip --region=us-central1 `
       --project=project-59be27c2-c126-4ea7-b01 --format="value(address)").Trim()
   Invoke-RestMethod "https://www.duckdns.org/update?domains=anden&token=$Token&ip=$Ip"
   ```

   Debe responder `OK`. Verifica con `Resolve-DnsName anden.duckdns.org`.

2. Abre el firewall una sola vez (el script de deploy lo crea si falta):

   ```powershell
   gcloud compute firewall-rules create anden-web `
     --allow tcp:80,tcp:443 --source-ranges=0.0.0.0/0 `
     --description="Anden PWA + API (Caddy)" `
     --project=project-59be27c2-c126-4ea7-b01
   ```

3. Despliega con el dominio canónico:

   ```powershell
   .\scripts\gcp\deploy.ps1 -Domain anden.duckdns.org
   ```

   El script fija `DOMAIN` y `CORS_ORIGINS`, copia el `Caddyfile` y ejecuta el
   smoke contra `https://anden.duckdns.org`.

### Redirecciones que ya existen

- **HTTP → HTTPS**: automático en Caddy; no hay que configurar nada.
- **Deep links SPA** (`/parcela/ficha`, `/comparar/guardar`, …): devuelven
  `index.html`, nunca 404.
- **API**: `/api/*` y `/ready` van al backend en el mismo origen.
- **Dominio anterior → nuevo** (opcional): si vienes de `sslip.io`, despliega
  una vez con `-LegacyDomain 34-55-141-32.sslip.io`. El script agrega un bloque
  `redir ... permanent` (301) en el `Caddyfile`. Ese dominio debe seguir
  resolviendo a la misma VM (sslip.io lo hace por la IP).

> No uses `www.` con DuckDNS: el subdominio no existe y Caddy no podría emitir
> certificado para él. Un solo host canónico es suficiente para el PWA.

## Variables

### Runtime de la VM (`/opt/anden/.env`)

| Variable | Ejemplo | Uso |
|---|---|---|
| `API_IMAGE` | `…/anden/api:gcp-20261115-210000` | Imagen FastAPI |
| `WEB_IMAGE` | `…/anden/web:gcp-20261115-210000` | Imagen PWA + Caddy |
| `DOMAIN` | `34-55-141-32.sslip.io` | Host de Caddy; sin `https://`. En local: `:80` |
| `API_UPSTREAM` | `api:8000` | Backend al que Caddy proxya `/api/*` y `/ready` |
| `CORS_ORIGINS` | `https://34-55-141-32.sslip.io,http://localhost:5173,http://localhost:4173` | Orígenes permitidos por la API (sin barra final) |
| `POSTGRES_*`, `DATABASE_URL`, `JWT_SECRET` | secretos | Solo backend; nunca en la imagen web |

### Build (Cloud Build)

| Sustitución | Ejemplo | Uso |
|---|---|---|
| `_IMAGE` | `…/anden/api:<tag>` | Tag de la API |
| `_WEB_IMAGE` | `…/anden/web:<tag>` | Tag del PWA |
| `_VITE_API_URL` | vacío o `https://api.ejemplo.com` | Se pasa como build arg a la imagen web |

`_IMAGE` y `_WEB_IMAGE` deben llevar el **mismo tag** para que PWA y API sean
la misma versión. Si `_WEB_IMAGE` queda vacío, el paso de build web falla.

## Construir las dos imágenes

Desde la raíz del repositorio, en PowerShell:

```powershell
$Project = "project-59be27c2-c126-4ea7-b01"
$Tag = "gcp-" + (Get-Date -Format "yyyyMMdd-HHmmss")
$ApiImage = "us-central1-docker.pkg.dev/$Project/anden/api:$Tag"
$WebImage = "us-central1-docker.pkg.dev/$Project/anden/web:$Tag"

gcloud config set project $Project

# Mismo dominio: _VITE_API_URL queda vacío (default de cloudbuild.yaml).
gcloud builds submit . `
  --config deploy/gcp/cloudbuild.yaml `
  --substitutions="_IMAGE=$ApiImage,_WEB_IMAGE=$WebImage" `
  --service-account="projects/$Project/serviceAccounts/anden-builder@$Project.iam.gserviceaccount.com" `
  --project $Project
```

Si el PWA debe apuntar a otro backend, agrega la sustitución:

```powershell
gcloud builds submit . `
  --config deploy/gcp/cloudbuild.yaml `
  --substitutions="_IMAGE=$ApiImage,_WEB_IMAGE=$WebImage,_VITE_API_URL=https://api.ejemplo.com" `
  --service-account="projects/$Project/serviceAccounts/anden-builder@$Project.iam.gserviceaccount.com" `
  --project $Project
```

Cloud Build construye y publica ambas imágenes en Artifact Registry. El tag
queda impreso en la salida; anótalo para el rollback.

## Publicar en la VM

1. Entra a la VM:

   ```powershell
   gcloud compute ssh anden-vm `
     --zone=us-central1-a `
     --tunnel-through-iap `
     --project=project-59be27c2-c126-4ea7-b01
   ```

2. Edita `/opt/anden/.env` y fija las dos imágenes y el dominio:

   ```bash
   sudo nano /opt/anden/.env
   ```

   ```dotenv
   API_IMAGE=us-central1-docker.pkg.dev/project-59be27c2-c126-4ea7-b01/anden/api:gcp-20261115-210000
   WEB_IMAGE=us-central1-docker.pkg.dev/project-59be27c2-c126-4ea7-b01/anden/web:gcp-20261115-210000
   DOMAIN=34-55-141-32.sslip.io
   API_UPSTREAM=api:8000
   CORS_ORIGINS=https://34-55-141-32.sslip.io,http://localhost:5173,http://localhost:4173
   ```

   Si tu `.env` viejo no tiene `WEB_IMAGE` ni `API_UPSTREAM`, agrégalas.

3. Descarga y recrea los servicios:

   ```bash
   cd /opt/anden
   sudo docker compose --env-file .env pull && sudo docker compose --env-file .env up -d
   sudo docker compose --env-file .env ps
   ```

   O usa el script de la VM, que además valida y recrea Caddy:

   ```bash
   sudo /opt/anden/remote-deploy.sh
   ```

   `remote-deploy.sh` obtiene un token de metadata para Artifact Registry, hace
   `pull`, `up -d`, valida el `Caddyfile` montado y fuerza la recreación de
   `web` para que Caddy tome cambios.

> `scripts/gcp/deploy.ps1` automatiza todo: tests (backend, mobile y PWA),
> build de **las dos** imágenes, copia de `docker-compose.yml`, `Caddyfile`,
> `remote-deploy.sh` y `.env`, despliegue y smoke. Uso:
>
> ```powershell
> .\scripts\gcp\deploy.ps1 -Domain anden.duckdns.org
> .\scripts\gcp\deploy.ps1 -Domain anden.duckdns.org -LegacyDomain 34-55-141-32.sslip.io
> ```
>
> Si cambias el `Caddyfile` o el dominio, vuelve a correrlo: el archivo se copia
> y `web` se recrea sin reconstruir la imagen.

Si cambió `deploy/gcp/docker-compose.yml`, cópialo antes de recrear:

```powershell
gcloud compute scp deploy/gcp/docker-compose.yml anden-vm:/tmp/docker-compose.yml `
  --zone=us-central1-a --tunnel-through-iap --project=project-59be27c2-c126-4ea7-b01
gcloud compute ssh anden-vm `
  --zone=us-central1-a --tunnel-through-iap --project=project-59be27c2-c126-4ea7-b01 `
  --command="sudo mv /tmp/docker-compose.yml /opt/anden/docker-compose.yml"
```

> `scripts/gcp/deploy.ps1` automatiza tests, build de API y web, copia de archivos
> (incluido el `Caddyfile`), despliegue y smoke. La sección "Dominio y DNS"
> explica DuckDNS y las redirecciones.

## Verificación

### API y sitio

```powershell
$Domain = "34-55-141-32.sslip.io"

curl.exe -fsS "https://$Domain/ready"
curl.exe -fsS "https://$Domain/api/v1/health"
curl.exe -fsS "https://$Domain/api/v1/catalog/crops"
curl.exe -fsS "https://$Domain/"
```

Esperado:

- `/ready` → `{"status":"ready",...}`.
- `/api/v1/health` → estado OK.
- `/api/v1/catalog/crops` → catálogo con `crops` y `prices_chacra_2025`.
- `/` → HTML de Anden (no JSON ni 404).

### Caché y service worker

```powershell
curl.exe -I "https://$Domain/sw.js"
curl.exe -I "https://$Domain/manifest.webmanifest"
```

Ambos deben responder `200` y `Cache-Control: no-cache`.

En Chrome:

1. Abre `https://$Domain/`.
2. DevTools → **Application** → **Manifest**: nombre Anden, iconos 192/512,
   `display: standalone`.
3. **Service Workers**: `sw.js` activado y controlando el scope `/`.
4. **Cache Storage**: precache del shell, `api-reads`, `api-irrigation` y
   `static`.
5. Network → **Offline** → recarga: debe abrir Inicio con la última parcela y
   la última comparación; **Preguntar** debe mostrar el aviso de que necesita
   internet.

### Flujo funcional

- Crear una parcela demo o una parcela nueva.
- Comparar 3 planes; el margen debe calcularse con precios confirmados.
- Abrir **Preguntar**, enviar una pregunta, revisar `save_preview` y confirmar
  o descartar el borrador.
- Revisar `/api/v1/ready` y los logs:

  ```bash
  sudo docker compose -f /opt/anden/docker-compose.yml --env-file /opt/anden/.env logs -f api web
  ```

## Rollback

El rollback debe mover **las dos imágenes al mismo tag** para no mezclar un
bundle web nuevo con una API vieja (o al revés).

1. Lista los tags anteriores:

   ```powershell
   gcloud artifacts docker images list `
     us-central1-docker.pkg.dev/project-59be27c2-c126-4ea7-b01/anden/api `
     --include-tags --limit=10 --project=project-59be27c2-c126-4ea7-b01
   ```

2. En `/opt/anden/.env`, fija `API_IMAGE` y `WEB_IMAGE` con el tag anterior.

3. Recrea:

   ```bash
   cd /opt/anden
   sudo docker compose --env-file .env pull && sudo docker compose --env-file .env up -d
   ```

4. Verifica `/ready`, `/api/v1/catalog/crops`, `/` y el `sw.js` con
   `Cache-Control: no-cache`.

Notas:

- Los clientes con el service worker viejo pueden seguir viendo el shell
  anterior hasta que recarguen o cierren las pestañas; `sw.js` no se cachea para
  que la actualización llegue en la siguiente visita.
- `migrate` ejecuta las migraciones idempotentes de `init_db` y el seed. No hay
  downgrade automático: si el rollback afecta el esquema, restaura el dump de
  Postgres (`pg_dump` en `docs/architecture/deploy-gcp.md`).
- Si solo falla el sitio y la API está sana, puedes recrear solo `web`
  (`sudo docker compose --env-file .env up -d --force-recreate web`), pero
  mantén el mismo tag si el contrato cambió.

## Problemas comunes

| Síntoma | Revisar |
|---|---|
| `web` en 502 | `docker compose ps`; `api` unhealthy; `API_UPSTREAM` mal escrito |
| Caddy no obtiene certificado | DNS del dominio, puertos 80/443, logs de `web` |
| El PWA llama a `localhost:8000` en producción | Se compiló sin `_VITE_API_URL=""`; recompila la imagen web |
| CORS en el navegador | Origen exacto en `CORS_ORIGINS`; no aplica si es mismo dominio |
| Manifest no instala | HTTPS, `sw.js` activo, scope `/`, iconos 192/512 |
| Versión vieja tras desplegar | Service worker: DevTools → Application → Unregister/Clear storage; `sw.js` debe ser `no-cache` |
| `/api/*` devuelve 404 | Caddyfile sin `handle /api/*` o `API_UPSTREAM` vacío |
| Body > 2 MB rechazado | Límite de Caddy; el flujo normal no lo necesita |
