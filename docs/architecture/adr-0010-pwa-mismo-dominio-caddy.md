# ADR-0010 — PWA web en el mismo dominio con Caddy

| Campo | Valor |
|---|---|
| Estado | Propuesta; pendiente aprobación de la spec 035 |
| Fecha | 2026-11-15 |
| Decisores | Producto, backend, despliegue |
| Relacionado | Spec 035, ADR-0006 (GCP), ADR-0008 (paleta) |

## Contexto

El piloto vive en la app Expo (Android). La spec 035 agrega una PWA instalable
que reutiliza el mismo backend FastAPI y los motores deterministas. Hoy
`deploy/gcp/Caddyfile` solo hace `reverse_proxy api:8000` y CORS únicamente
permite los orígenes de Expo (`:8081`, `:19006`).

Una PWA necesita scope de service worker en la raíz, servir shell y API sin
CORS, TLS para instalar y una sola versión del contrato.

## Decisión

1. **Un solo host.** Se reutiliza el dominio actual de la VM (`sslip.io`). La
   PWA se sirve en `/` y la API en `/api/v1`. No se crea subdominio ni una
   segunda VM.
2. **Caddy** en `deploy/gcp/Caddyfile`:
   - `/api/v1/*` → `reverse_proxy api:8000`
   - resto → `file_server` sobre `/srv` (build de `frontend/`) con fallback
     SPA `try_files {path} /index.html`.
3. **Caché:** `index.html` y `sw.js` con `no-cache`; assets con hash
   `immutable` y `max-age=31536000`. El service worker se actualiza por versión
   de build y no cachea auth, agente ni POST.
4. **Build:** Cloud Build compila `frontend/` (`pnpm build`) y copia `dist/` a
   la imagen/VM; el contenedor de Caddy lo monta en `/srv`.
5. **Dev:** Vite en `:5173`, preview en `:4173`; CORS los permite junto a los
   orígenes de Expo. En producción no hay CORS porque todo es mismo origen.
6. **Secretos:** solo backend; el bundle web usa variables públicas, nunca
   secretos. El JWT sigue en `Authorization: Bearer`.

## Alternativas consideradas

- **Subdominio dedicado (`app.…`).** Aísla el scope del service worker, pero
  suma DNS/TLS y reintroduce CORS y configuración duplicada; se descarta para
  el piloto.
- **Host estático separado / CDN.** Menor acoplamiento de despliegue, pero
  obliga a CORS, versionado cruzado y otro pipeline; sobra para 100 usuarios.
- **Nginx.** Ya hay Caddy en la VM y TLS automático; cambiar no aporta.

## Consecuencias

**Positivas**

- Sin CORS en producción y un solo certificado TLS.
- El service worker controla la raíz; instalación y offline funcionan.
- Un solo despliegue mantiene PWA y API en la misma versión.

**Negativas / límites**

- El rollback acopla PWA y API; hay que versionar el build del frontend.
- Caddy necesita el `dist/` dentro de la imagen o montado en la VM.
- El caché del service worker debe invalidarse por build; un `sw.js` mal
  cacheado deja versiones viejas.
- iOS/Safari queda fuera del alcance de esta decisión.

## Evidencia

- Spec 035: `specs/035-pwa-web/`
- Caddyfile actual: `deploy/gcp/Caddyfile`
- A verificar al implementar: `curl -I` de `/` y `/api/v1/health`, instalación
  en Chrome y arranque offline.

## Cuándo revisar

1. Si se necesita CDN o más de una región.
2. Si la API se separa a otro dominio.
3. Si se adopta iOS/PWA en Safari.
4. Si la autenticación pasa de Bearer a cookies de sesión.
