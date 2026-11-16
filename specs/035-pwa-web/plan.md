# Plan — Spec 035

Estado: decisiones aprobadas por el usuario (Caddy + mismo GCP `sslip.io`;
precio prellenado y editable; offline lectura+captura+cola; qu/ay borrador
completo con `review_pending`). Documento completo, pendiente de aprobación
final antes de implementar.

## 0. Alcance del primer corte demoable (lo que se construye primero)

1. `frontend/`: Vite + React 19 + TypeScript + Tailwind + React Router +
   React Query + PWA shell (manifest + service worker) + tipos desde
   `/api/v1/openapi.json`.
2. `src/lib/api`: cliente tipado, manejo 401 + refresh, `Idempotency-Key` en
   escrituras.
3. Autenticación anónima reutilizando `POST /auth/anonymous` + `/auth/refresh`.
4. Pantallas **Inicio**, **Mi Parcela** (distrito/lat/lon/superficie),
   **Comparación** (tabs Actual/B/C), **Simulación** y **Agente**.
5. Autollenado de precio del catálogo con fuente/año/ámbito/estado editables.
6. Service worker: solo shell + catálogo + GETs de lectura; nada de
   auth/agente/comparación nueva.
7. Outbox offline (IndexedDB) con cola de escrituras y reintentos.

## 1. Backend (bug de precios + marketable_share)

### 1.1 Alias de cultivo inglés→catálogo

- `backend/app/agent/price_catalog.py`: resolver el id de DB (inglés) al id de
  catálogo (español) antes de buscar. Fuente de verdad:
  `backend/app/use_cases/seed.py::CATALOG_ID_MAP` invertido; el mapa ya cubre
  los 25 cultivos, incluidos los 8 pendientes. Si el id ya es del catálogo, se
  usa directo.
- `corn` mapea a `maiz_amilaceo` y `maiz_choclo`: desempatar por la referencia
  disponible para el distrito/provincia y, si ambas existen, mantener el orden
  estable del mapa (`maiz_amilaceo` primero). No duplicar filas.
- Cubrir en `find_price_reference` y `find_mentioned_price_reference`.
- Test unitario: los 8 ids pendientes de `MEMORY.md` (`corn`, `carrot`,
  `lettuce`, `beetroot`, `sweet_potato`, `green_pea`, `pickle_cucumber`,
  `cauliflower`) resuelven su referencia para Moquegua.

### 1.2 `marketable_share` en el motor

- `backend/app/schemas/parcel.py`: `CropEconomicsIn.marketable_share:
  float | None = Field(default=None, ge=0, le=1)`.
- `backend/app/use_cases/comparison.py::_plan_economics`: producción
  comercializable = `yield * area * marketable_share` (default 1.0). Si el
  motor ya multiplica por área completa, ajustar para aplicar la fracción.
- Test: con `marketable_share=0.6` la producción/ganancia se reducen en un
  40 % respecto a 1.0; con `None` es idéntico al comportamiento actual.

### 1.3 CORS

- `backend/app/core/config.py` + `.env.example`: orígenes
  `http://localhost:5173`, `http://localhost:4173` (dev/build) y el dominio
  de producción (mismo dominio: CORS no aplica al PWA mismo dominio, solo a
  la API proxyeada).

### 1.4 Catálogo en la API

- `backend/app/api/v1/catalog.py`: `list_crops` incluye `catalog_id` por
  cultivo y las referencias de `precios_chacra_2025` ya están en
  `prices_chacra_2025` (RF-034.12). Verificar el mapeo `crop_id` para que la
  PWA pueda cruzar con su cultivo de parcela.
- Bundle offline: las mismas referencias para precargar sin conexión
  (RF-034.13).

## 2. Despliegue (Caddy + GCP)

- Un solo host (`{$DOMAIN}` = `sslip.io` actual). Caddy sirve:
  - `/api/v1/*` → `reverse_proxy api:8000`
  - resto → `frontend/dist` con `file_server` y fallback SPA
    (`try_files {path} /index.html`)
- `frontend/dist` se compila en Cloud Build y se copia a la imagen/VM; el
  contenedor de Caddy lo monta en `/srv`.
- Cabeceras: `index.html` y `sw.js` con `Cache-Control: no-cache`; assets con
  hash, `immutable`. Se conservan HSTS, `nosniff`, `X-Frame-Options` y
  `Referrer-Policy` del Caddyfile actual.
- `VITE_API_URL` (o `EXPO_PUBLIC_API_URL` por compatibilidad) apunta al mismo
  origen en producción; en dev, `http://localhost:8000`.
- Decisión registrada en `docs/architecture/adr-0010-pwa-mismo-dominio-caddy.md`
  y en `MEMORY.md`. No hay subdominio ni segunda VM.

## 3. PWA

- `public/manifest.webmanifest`: iconos 192/512, nombre "Anden", tagline,
  paleta verde/marrón/crema (`#1B5E20`, `#6D4C41`, `#FAF7F0`, tinta
  `#1E231E`), `display: standalone`, `theme_color`, `background_color`.
- Service worker (`vite-plugin-pwa` o propio): precache del shell +
  `GET /catalog/crops` (caché de solo lectura con TTL) + `GET /auth/me`,
  `GET /parcels*`, `GET /comparisons/*`, `GET /saved-plans*` en lectura.
  Network-first para el shell; sin caché de `POST`/`PATCH`, `/agent/*`,
  `/comparisons` (POST), `/auth/*`.
- Estado de conexión con `netinfo`/`online` events; banda de "sin conexión".
- Outbox en `IndexedDB` para las escrituras; `navigator.onLine` +
  `visibilitychange` disparan el flush con reintentos (max 5, backoff).

## 4. Accesibilidad

- Targets ≥ 48 dp; icon buttons 48×48; botones `min-h-12` (ver
  `docs/accessibility.md`); labels en iconos; gráficos con tabla de datos y
  resumen hablado; live regions para estado de conexión y sincronización.
- Reduce motion desactiva animaciones y transiciones.

## 5. Tests

- Frontend: Vitest + React Testing Library; Playwright para el recorrido
  offline (Inicio → comparación cacheada → captura → sync) e
  `Idempotency-Key`.
- Paridad TS/Python para `marketable_share` y el alias de precio.
- Backend: pytest (ver `backend/tests`).

## 6. Orden de ejecución por cortes

| Corte | Entregable demoable |
|---|---|
| A | `frontend/` scaffold + PWA shell + tipos + cliente + auth + Inicio |
| B | Mi Parcela (distrito/coords/superficie) + autollenado de precio |
| C | Comparación tabs Actual/B/C + detalle + CTA de agua + Simulación |
| D | Agente (chat) + guardado con confirmación |
| E | Offline: outbox + banda de estado + service worker + sync |
| F | i18n completo (es-PE + qu/ay `review_pending`) + a11y + Playwright + Caddyfile (ADR-0010) + README |

## 7. Riesgos controlados

- Comparación depende de NASA POWER: si responde 503, se muestra el error y se
  ofrece reintentar o usar el bundle.
- Agente depende de Gemini: si falla, se usa el runtime determinista y se
  avisa.
- PDF/reporte se carga diferido.
- Service worker no cachea auth ni agente; solo shell, catálogo y GETs.
- Quechua/aimara quedan como borrador, nunca como revisadas.
- El service worker cachea solo lectura; las escrituras siempre van por
  red+outbox; si la PWA abre dos pestañas, la cola de outbox se comparte por
  dispositivo (IndexedDB).
