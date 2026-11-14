# Automatic

Copiloto inteligente de planificación agrícola geoespacial para pequeños productores.
Proyecto para **NASA Space Apps Challenge 2026 — Field Shift: Adapting Farms with NASA Data**.
Piloto: **Moquegua, Perú** · 100 agricultores · Android · español.

> **Estado:** especificaciones y arquitectura. No es un sistema desplegado.
> Los cultivos, precios y secuencias de demo son hipótesis etiquetadas; requieren revisión local.

## Qué hace

- Registra una parcela y su historial con datos desconocidos explícitos.
- Muestra contexto NASA (POWER, GIBS/IMERG) con fuente, fecha, resolución y límites.
- Compara la rotación actual con alternativas en el mismo horizonte.
- Estima agua, suelo y margen bajo supuestos; no inventa datos faltantes.
- Simula menos agua y menor precio por separado.
- Un agente LangGraph (Groq) consulta herramientas deterministas y explica; no calcula cifras.
- Permite guardar un borrador con confirmación humana.

## Stack

| Capa | Tecnología |
|---|---|
| Mobile | Expo SDK 58 · React Native 0.88 · TypeScript · **RNUI** (`react-native-ui-lib`) |
| Build | Development build con Android Studio; Expo Go no es compatible con `uilib-native` |
| API | FastAPI · Pydantic v2 · SQLAlchemy 2 · Alembic |
| DB | PostgreSQL 16 + PostGIS 3.4 |
| Agente | LangGraph · Groq · fallback `fake` |
| Datos | NASA POWER · NASA GIBS (IMERG, NDVI) · snapshot IMERG |
| Infra | Docker Compose local · Cloudflare Tunnel · APK opcional |
| Tests | pytest · Jest/RNTL · OpenAPI · paridad · **Maestro** |

## Inicio rápido

```bash
# 1. Configuración (nunca commitear .env)
# Si .env NO existe: cp .env.example .env
# Si .env ya existe: completar variables sin borrar GROQ_API_KEY
# Completar el .env antes de validar:
pnpm env:check

# 2. Backend + DB
docker compose up --build

# 3. Mobile (development build; no Expo Go)
pnpm --filter mobile android

# 4. Tests
docker compose run --rm api pytest -q
pnpm --filter mobile test
maestro test apps/mobile/.maestro/flows
```

## Estructura

```text
apps/mobile/       Expo + RNUI + TypeScript
services/api/      FastAPI
services/ingest/   POWER / IMERG
contracts/         OpenAPI + tipos TS
datasets/          metadatos, demo sintético, snapshots
docs/              constitución, arquitectura, supuestos, demo
specs/             SDD: spec.md · plan.md · tasks.md
tests/             contrato, paridad, smoke
postman/           colección y environments
```

## SDD

Leer `docs/constitution.md` y la spec activa antes de tocar código.
El catálogo y el estado están en `specs/README.md`.
Plantillas: `specs/_template/`.
Informe de coherencia: `docs/architecture/coherence-report.md`.

## Datos y licencia

- Código: MIT (`LICENSE`).
- Datos: NASA POWER/GIBS/IMERG, FAO-56, anuario de Moquegua; ver `docs/data-licenses.md`.
- La app es gratuita para agricultores; no se venden datos.
- Parcela demo sintética y etiquetada; cualquier usuario puede crear la suya.

## Seguridad

`.env` está en `.gitignore`. La app solo recibe `EXPO_PUBLIC_*`; la `GROQ_API_KEY` nunca sale del backend.
Si el `.env` se compartió, rotar la key.
