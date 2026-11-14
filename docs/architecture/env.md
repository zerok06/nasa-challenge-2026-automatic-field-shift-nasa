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

- `.env` raíz contiene **solo** `GROQ_API_KEY`.
- `.gitignore` creado; verificado: `.env` está ignorado y no trackeado (`git check-ignore`).
- `.env.example` creado con placeholders; faltan las demás variables en `.env`.
- Pendiente: completar `.env`, ejecutar `env:check` y rotar la key si el workspace se compartió.

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
| `LLM_PROVIDER` | no | API | sí | `groq`/`fake` |
| `GROQ_API_KEY` | **sí** | API | si `groq` | **nunca** en mobile |
| `GROQ_MODEL` | no | API | sí | fijar modelo con tool calling |
| `EARTHDATA_USERNAME` | **sí** | ingest | solo ingest | no en API runtime |
| `EARTHDATA_PASSWORD` | **sí** | ingest | solo ingest | no en API runtime |
| `EXPO_PUBLIC_API_URL` | no | mobile | sí | `http://localhost:8000` o túnel |
| `EXPO_PUBLIC_DEMO_MODE` | no | mobile | sí | `true` en demo |
| `GOOGLE_MAPS_API_KEY` | público restringido | build mobile | APK Android | restringir por package |
| `JWT_EXPIRE_MINUTES` | no | API | sí | 10080 (7 días) |
| `LLM_TIMEOUT_SECONDS` | no | API | sí | 30 |
| `POWER_CACHE_TTL_HOURS` | no | API/ingest | no | 24 |
| `LOG_LEVEL` | no | API | no | `INFO` |
| `SENTRY_DSN` | **sí** | API/mobile | no | opcional |

**Regla:** todo lo que empieza con `EXPO_PUBLIC_` es público y queda embebido en el bundle. Nunca poner `GROQ_API_KEY`, `DATABASE_URL`, `JWT_SECRET` ni credenciales Earthdata con ese prefijo.

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

