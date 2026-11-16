# Anden PWA (`frontend/`)

Aplicación web instalable de Anden. Reutiliza el mismo backend FastAPI y los
mismos motores deterministas que la app Android; no duplica cálculos
agronómicos.

## Qué es

Es un port web del sistema de diseño nativo:

- Misma paleta y tokens (`src/design/tokens.ts` es espejo de
  `application/src/design-system/tokens.ts`), mismos iconos Lucide y las mismas
  ilustraciones SVG (`src/components/illustrations/Illustration.tsx`).
- Las mismas cuatro pestañas: **Inicio**, **Comparar**, **Preguntar** y
  **Mi parcela**, más la intro de tres diapositivas.
- Los textos en español son las claves de i18n (igual que en la app); quechua y
  aimara siguen marcados `review_pending`.
- El manifest y el service worker los genera `vite-plugin-pwa` al compilar. En
  modo desarrollo (`pnpm dev`) no se registra service worker.

La PWA cubre lectura offline, captura de ficha/precios con cola de
sincronización y simulación local. El agente necesita internet y se desactiva
sin conexión a propósito.

## Stack

| Capa | Tecnología |
|---|---|
| Build | Vite 7 + React 19 + TypeScript |
| Estilos | Tailwind 4 (`@tailwindcss/vite`, tokens en `src/index.css`) |
| Navegación | React Router 7 |
| Datos | TanStack Query 5 + cliente tipado en `src/lib/api.ts` |
| PWA | `vite-plugin-pwa` 1.3 (Workbox `generateSW`) |
| Tests | Vitest + Testing Library · Playwright (`frontend/e2e`) |

Node 22 y pnpm 10.34.9 (ver `packageManager` en `package.json`).

## Inicio rápido con Docker

Desde la raíz del repositorio:

```powershell
# Si no existe el .env raíz
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

docker compose up -d --build
docker compose ps
```

| Servicio | URL | Uso |
|---|---|---|
| `frontend` | http://localhost:5173 | Vite dev con HMR; el navegador llama al backend en `:8000` |
| `web` | http://localhost:8080 | Paridad con producción: build estático + Caddy + proxy `/api` |
| `backend` | http://localhost:8000 | FastAPI |
| `db` | interno | PostgreSQL 16 + PostGIS 3.4 |

`web` es el entorno correcto para probar el service worker, la instalación y el
modo offline. Usa el mismo `deploy/gcp/Dockerfile.web` y el mismo
`deploy/gcp/Caddyfile` que GCP.

```powershell
docker compose logs -f frontend web backend   # logs
docker compose restart frontend               # reiniciar solo el dev server
docker compose down                           # bajar; conserva volúmenes
```

Evita `docker compose down -v`: borra la base de datos y el volumen de
`node_modules` del contenedor.

## Sin Docker

Con el backend ya corriendo en `http://localhost:8000`:

```powershell
cd frontend
corepack enable
pnpm install --frozen-lockfile

# .env.local ya trae VITE_API_URL=http://localhost:8000; créalo si falta:
# Copy-Item .env.example .env.local

pnpm dev
```

Build y preview local:

```powershell
pnpm build
pnpm preview -- --port 4173
```

`vite preview` no proxya `/api`. Para que el build de preview encuentre el
backend, compila con `VITE_API_URL=http://localhost:8000` (y deja ese origen en
`CORS_ORIGINS`).

## Apuntar al backend de GCP

El navegador es quien llama a la API; por eso `VITE_API_URL` debe ser una URL
pública, no `localhost` dentro del contenedor.

Desarrollo con Docker (PowerShell):

```powershell
$env:VITE_API_URL = "https://34-55-141-32.sslip.io"
docker compose up -d --force-recreate frontend
```

Build estático apuntando a GCP:

```powershell
docker build -f deploy/gcp/Dockerfile.web `
  --build-arg VITE_API_URL=https://34-55-141-32.sslip.io `
  -t anden/web:gcp .
```

Producción recomendada: mismo dominio, sin `VITE_API_URL` (vacío). Caddy sirve
el PWA en `/` y proxya `/api/*` al backend, así que no hay CORS:

```powershell
docker build -f deploy/gcp/Dockerfile.web -t anden/web:prod .
```

`VITE_API_URL` se incrusta en el bundle al compilar. Cambiarlo exige rebuild, no
solo reiniciar el contenedor.

### CORS

Solo aplica cuando el navegador y la API están en orígenes distintos (por
ejemplo, PWA en `:5173` y API en `:8000`). En el `.env` raíz:

```dotenv
CORS_ORIGINS=http://localhost:8081,http://localhost:19006,http://localhost:5173,http://localhost:4173
```

No pongas barra final. Si cambias el valor, recrea el backend:

```powershell
docker compose up -d --force-recreate backend
```

En el despliegue con Caddy (`:8080` local o el dominio de GCP) todo es mismo
origen y no se necesita CORS. Si abres el dev server desde otro equipo de la
LAN, usa la IP de la laptop en `VITE_API_URL` y agrega también
`http://<IP-LAN>:5173` a `CORS_ORIGINS`.

## Offline: qué funciona y qué no

**Funciona sin señal**

- El shell y la intro arrancan desde el precache; Inicio muestra la última
  parcela y la última comparación guardada en `localStorage`.
- Lectura de catálogo, parcelas, contexto, comparaciones, planes guardados y
  `auth/me` con `NetworkFirst` (timeout de 5 s).
- El pronóstico de riego queda cacheado 10 minutos.
- La ficha y los precios/costos se pueden capturar; las escrituras van a una
  cola IndexedDB (`src/lib/outbox.ts`, FIFO, 5 reintentos con backoff e
  `Idempotency-Key`) y se reintentan al volver la conexión.
- La simulación de escenario se calcula en el navegador con la misma aritmética
  que `services/scenario.py` (fixtures en `tests/parity/scenario_cases.json`).
- La barra inferior muestra el estado **En línea / Sin conexión** y cuántas
  escrituras quedan por enviar.

**No funciona sin señal**

- El agente: se muestra un aviso y el composer queda deshabilitado. Las
  sugerencias siguen visibles, pero no se envía nada al backend.
- Crear una comparación nueva, descargar clima NASA/Open-Meteo nuevo o pedir un
  pronóstico de riego vencido.
- Guardar un plan desde el comparador y cualquier operación que no esté en la
  cola.
- El service worker no cachea escrituras (`POST`/`PATCH`) ni endpoints del
  agente; solo lecturas como `auth/me`.

Para probarlo: abre una vez con red en `http://localhost:8080`, entra a Inicio y
a Comparar, y luego en DevTools → Network marca **Offline** y recarga.

## Captura sin barreras

- **Agua**: se pregunta cómo la mide el agricultor, no en mm. Modos: turnos
  (turnos × m³/turno), horas por semana + L/s, m³ del recibo o mm directos. La
  conversión se muestra antes de guardar (`1 mm = 10 m³/ha`); sin superficie se
  guarda solo el volumen y no se afirma un valor en mm. "No sé" es una respuesta
  válida y se registra como declarada.
- **Rendimiento y precio**: se aceptan kg/ha, arrobas/ha (1 arroba = 11.5 kg) y
  sacos/ha (50 kg por defecto, configurable); el precio acepta S/kg, S/arroba y
  S/saco. La app muestra el valor canónico antes de guardar y guarda kg/ha y
  S/kg.
- **Catálogo**: cada cultivo trae `price_reference` (distrito → provincia →
  región → histórico) con año, ámbito, fuente y `is_local`. Se usa como primer
  valor editable; si el agricultor lo cambia se marca `Modificado` y se guarda
  `price_source="edited"`, `price_confirmed=true`.
- **Barras de acción**: `StickyActionBar` es `sticky` en el flujo (no `fixed`),
  para que nunca tape un botón ni intercepte el toque.

## Agente ReAct (solo con conexión)

- Loop de inferencia: pensar → ejecutar una tool → observar → decidir, con
  presupuesto `AGENT_MAX_STEPS` (5 por defecto). Cada `tool_trace` lleva `step`.
- El modo `chat` responde la pregunta concreta; `guided` mantiene la captura de
  un dato por vez de la app Android.
- Antes de recomendar consulta el precio del catálogo y ofrece el editor con el
  cultivo preseleccionado (`open_screen` → `/parcela/economia?crop=...`).
- Nada se guarda sin confirmación: `save_preview` + `pending_proposal_id` y
  `POST /api/v1/actions/{id}/confirm`.
- **Sin conexión se deshabilita por completo**: no crea hilo, no envía y muestra
  el motivo. Igual que el riego semanal.

## Instalar en el teléfono

**Android (Chrome)**

1. Abre el enlace desplegado en Chrome.
2. Toca el menú **⋮** → **Instalar aplicación** o **Agregar a pantalla
   principal**.
3. Se abre en modo standalone, sin barra del navegador.

La tarjeta **Instala Anden en tu teléfono** de Ajustes usa
`beforeinstallprompt` cuando Chrome lo permite y, si no, muestra los pasos.

**iPhone (Safari)**

1. Abre el enlace en Safari.
2. Toca **Compartir** → **Añadir a inicio**.

**Mensaje para compartir con agricultores**

> Abre este enlace en Chrome y agrégalo a tu pantalla de inicio; funciona como
> una app y guarda tus datos para consultarlos sin señal.

## Tests y verificación

```powershell
cd frontend

pnpm typecheck          # TypeScript
pnpm test               # Vitest: catálogo y paridad de escenario offline
pnpm test:watch         # Vitest en watch
pnpm build              # build de producción + service worker
```

`vitest` excluye `e2e/**` desde `vite.config.ts`, así que `pnpm test` corre
solo la suite unitaria de `src/`.

E2E con Playwright (los flujos viven en `frontend/e2e` y apuntan a
`http://localhost:8080`; el config no levanta la app):

```powershell
# desde la raíz, con el stack de paridad arriba
docker compose up -d --build web

cd frontend
pnpm exec playwright install chromium   # solo la primera vez
pnpm exec playwright test
```

Verificación manual rápida:

```powershell
curl.exe -fsS http://localhost:8000/ready
curl.exe -fsS http://localhost:8080/api/v1/catalog/crops
```

En Chrome → DevTools → **Application**: revisa **Manifest**, **Service
Workers** y **Cache Storage**. `sw.js` y `manifest.webmanifest` deben servirse
con `Cache-Control: no-cache`.

## Estructura

```text
frontend/
  index.html                  entrada de Vite
  src/
    App.tsx                   rutas, 4 pestañas, badge de conexión
    main.tsx                  React Query + Router + i18n
    pages/                    Intro, Onboarding, Home, Comparison, Agent,
                              Parcel, ParcelFicha, ParcelEconomics,
                              ParcelIrrigation, SavePlan, Settings, Sources
    components/app/           sistema de diseño web (botones, cards, forms,
                              charts, toasts, StepProgress, InstallCard)
    components/illustrations/ ilustraciones SVG compartidas con Android
    design/tokens.ts          paleta, espaciado, radios, estados
    i18n/                     i18next + locales es/qu/ay/en
    lib/                      api, outbox, cache, scenario, catalog, format,
                              useOnline, useInstallPrompt, useQueries
    providers/                Profile, Parcel, Comparison, Toast
  public/                     iconos y fotos de portada
  e2e/                        Playwright
  scripts/                    utilidades de depuración manual
  vite.config.ts              PWA/Workbox y servidor de desarrollo
  Dockerfile.dev              Vite dev para Docker
```

## Problemas comunes

**El puerto 5173 u 8080 está ocupado**

```powershell
Get-NetTCPConnection -LocalPort 5173 -State Listen |
  ForEach-Object { Get-Process -Id $_.OwningProcess }
```

Cierra el proceso o cambia el mapeo en `docker-compose.yml`. Vite usa
`strictPort: true`, así que falla en vez de elegir otro puerto.

**`pnpm test` y `pnpm exec playwright test` comparten el patrón `*.spec.ts`**

Vitest excluye `e2e/**` (ver `vite.config.ts`), así que `pnpm test` corre solo
la suite unitaria. Los E2E se corren aparte con `pnpm exec playwright test`.

**El service worker me muestra una versión vieja**

`pnpm dev` no registra service worker: para probar la PWA usa `http://localhost:8080`.
Si ya hay uno viejo, en DevTools → **Application** → **Service Workers** pulsa
**Unregister** y **Clear storage**, y recarga con `Ctrl+Shift+R`. Para forzar un
build limpio (desde la raíz):

```powershell
docker compose build --no-cache web
docker compose up -d web
```

**Error de CORS en el navegador**

Revisa que el origen exacto (esquema, host y puerto) esté en `CORS_ORIGINS`, sin
barra final, y recrea el backend. Si usas `:8080` o el dominio de GCP con el
build de mismo origen, no debería aparecer.

**La PWA abre pero no hay datos offline**

Abre una vez con red y visita Inicio/Comparar para que se guarden la parcela y
la última comparación. Si nunca se cargó una comparación, no hay nada que
mostrar.

**`web` responde 502**

Caddy no alcanza a la API. Revisa `docker compose ps` y
`docker compose logs backend`; espera a que `/ready` responda.

**No aparece “Instalar aplicación”**

La instalación exige HTTPS (o `localhost`), manifest válido y service worker
activo. En iPhone no existe `beforeinstallprompt`: abre el sitio en Safari y usa
**Compartir** → **Añadir a inicio**.

## Referencias

- Spec: `specs/035-pwa-web/`
- Decisión de despliegue: `docs/architecture/adr-0010-pwa-mismo-dominio-caddy.md`
- Deploy de las dos imágenes: `deploy/gcp/README.md`
- Accesibilidad: `docs/accessibility.md`
