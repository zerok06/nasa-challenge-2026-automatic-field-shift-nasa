# Arquitectura de entorno — un solo `.env`

## Objetivo

Una única fuente de verdad para configuración y secretos, sin filtrar claves al cliente.

```text
.env                      # raíz, gitignored, valores reales
.env.example              # versionado, placeholders
application/.env.local    # generado, gitignored, solo EXPO_PUBLIC_*
docker compose            # lee .env de la raíz
services/api              # pydantic-settings lee .env (local) o variables (Docker)
```

## Estado actual (14-nov-2026)

- `.env` raíz contiene la configuración local del backend y del piloto; está
  ignorado y no trackeado.
- `.env.example` documenta todas las variables, incluida la URL GCP y la IP LAN
  para Expo Go en teléfono físico.
- `application/.env.local` contiene solo `EXPO_PUBLIC_*`. Para el demo apunta a
  GCP: `https://34-55-141-32.sslip.io`.
- Para backend local se puede usar `http://localhost:8000` (la app lo reemplaza
  por el host de Metro) o la IP LAN explícita.
- El stack GCP **no** usa este `.env`: `deploy/gcp/` toma los secretos de
  Secret Manager y genera su propio `.env` en la VM. Ver `deploy-gcp.md`.
- No guardar IPs de teléfonos ni contraseñas de Wi-Fi en el repo; solo la URL
  del backend.
- Pendiente: rotar `GROQ_API_KEY` si el archivo se compartió fuera de la laptop.

## Variables

| Variable | Secreto | Consumidor | Obligatoria | Nota |
|---|---|---|---|---|
| `APP_ENV` | no | API, mobile | sí | `development`/`test`/`demo` |
| `API_PORT` | no | API, compose | sí | 8000 local |
| `POSTGRES_DB` | no | compose | sí | `automatic` |
| `POSTGRES_USER` | no | compose | sí | |
| `POSTGRES_PASSWORD` | **sí** | compose | sí | no usar `postgres` en demo |
| `DATABASE_URL` | **sí** | API | sí | `postgresql+psycopg://...` |
| `JWT_SECRET` | **sí** | API | sí | ≥32 caracteres |
| `CORS_ORIGINS` | no | API | sí | lista separada por comas |
| `LLM_PROVIDER` | no | API | sí | `fake`/`gemini`; `groq` es legado |
| `GROQ_API_KEY` | **sí** | API | si `groq` | **nunca** en mobile |
| `GROQ_MODEL` | no | API | si `groq` | fijar modelo con tool calling |
| `GOOGLE_CLOUD_PROJECT` | no | API | si `gemini` | project ID de GCP |
| `GOOGLE_CLOUD_LOCATION` | no | API | si `gemini` | `global` para `gemini-3.5-flash` |
| `GEMINI_MODEL` | no | API | si `gemini` | `gemini-3.5-flash` |
| `GEMINI_MAX_OUTPUT_TOKENS` | no | API | no | 512 |
| `GEMINI_MAX_TOOL_CALLS` | no | API | no | 4 |
| `GEMINI_TEMPERATURE` | no | API | no | 0 |
| `AGENT_MAX_ANSWER_CHARS` | no | API | no | 220 |
| `EARTHDATA_USERNAME` | **sí** | ingest | solo ingest | no en API runtime |
| `EARTHDATA_PASSWORD` | **sí** | ingest | solo ingest | no en API runtime |
| `EXPO_PUBLIC_API_URL` | no | mobile | sí | `http://<ip-lan>:8000` para teléfono físico; `localhost` solo emulador/web |
| `EXPO_PUBLIC_DEMO_MODE` | no | mobile | sí | `true` en demo |
| `JWT_EXPIRE_MINUTES` | no | API | sí | 10080 (7 días) |
| `LLM_TIMEOUT_SECONDS` | no | API | sí | 20 |
| `POWER_CACHE_TTL_HOURS` | no | API/ingest | no | 24 |
| `LOG_LEVEL` | no | API | no | `INFO` |
| `SENTRY_DSN` | **sí** | API/mobile | no | opcional |

**Regla:** todo lo que empieza con `EXPO_PUBLIC_` es público y queda embebido en el bundle. Nunca poner `GROQ_API_KEY`, `DATABASE_URL`, `JWT_SECRET` ni credenciales Earthdata con ese prefijo.

## Expo Go en un teléfono físico (misma Wi-Fi)

`localhost` en el teléfono apunta al teléfono, no a la computadora. Para que la
app llegue al backend:

1. Obtener la IP LAN de la computadora:
   `Get-NetIPAddress -AddressFamily IPv4` (Windows) o `ipconfig`.
2. En `application/.env.local`:
   `EXPO_PUBLIC_API_URL=https://34-55-141-32.sslip.io` para GCP, o
   `http://localhost:8000` (la app usa el host de Metro), o la IP LAN explícita
   `http://192.168.1.50:8000`.
3. Arrancar Metro en modo LAN: `pnpm start -- --lan` (no `--localhost`).
4. Verificar desde la computadora: `curl http://192.168.1.50:8000/api/v1/health`.
5. Permitir TCP 8000 en el firewall de Windows si el teléfono no conecta.

La app además reemplaza `localhost` por el host de Metro cuando corre en Expo Go
(`application/src/services/api/client.ts`), así que el mismo `.env.local` sigue
funcionando si cambia la IP. Si se usa un túnel, la URL del backend debe ser
pública; el host de Metro no sirve para la API.

## Scripts

### `scripts/env/check.mjs`

- Lee `.env` raíz.
- Verifica variables obligatorias según `APP_ENV` y `LLM_PROVIDER`.
- Falla con un mensaje que nombra la variable, sin imprimir valores.
- Verifica que `EXPO_PUBLIC_*` no contenga nombres de secretos.
- Verifica que `.env` esté ignorado por Git (`git check-ignore`).

### `scripts/env/sync.mjs`

- Lee `.env` raíz.
- Escribe `application/.env.local` con **solo** `EXPO_PUBLIC_API_URL` y `EXPO_PUBLIC_DEMO_MODE`.
- Cabecera `# GENERATED — DO NOT EDIT`.
- Nunca copia secretos; si detecta un prefijo público sobre un secreto, aborta.

### `package.json` (raíz)

```json
{
  "scripts": {
    "env:check": "node scripts/env/check.mjs",
    "env:sync": "node scripts/env/sync.mjs",
    "predev": "pnpm env:sync && pnpm env:check"
  }
}
```

`application/package.json` ejecuta `pnpm --dir ../.. env:sync` en `prestart` y `prebuild`.

## Docker y CI

- `docker-compose.yml` en la raíz usa `env_file: .env`; no hornea `.env` en la imagen (`.dockerignore`).
- La API recibe variables en runtime; `pydantic-settings` falla si falta una obligatoria.
- CI usa GitHub Secrets; los logs no imprimen valores.
- `git ls-files .env` debe estar vacío; el CI falla si `.env` está trackeado.

## Migración desde el estado actual

1. ✅ Crear `.gitignore` y verificar `git check-ignore .env`.
2. ✅ Crear `.env.example` con todas las variables y placeholders.
3. ⏳ Agregar al `.env` actual las variables faltantes (sin borrar `GROQ_API_KEY`).
4. ⏳ Ejecutar `pnpm env:check`.
5. ⏳ Rotar `GROQ_API_KEY` si el archivo se compartió o se sincronizó fuera de la laptop.
6. ⏳ Documentar en `MEMORY.md`.

