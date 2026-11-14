# AGENTS.md — Automatic

## Contexto

Copiloto de planificación agrícola para una parcela piloto en Moquegua.  
Piloto: **100 agricultores**, Android, conectividad intermitente, español.  
Stack: Expo SDK 58 + RNUI (`react-native-ui-lib`) + FastAPI + PostgreSQL/PostGIS + LangGraph/Groq.

## Estructura

```text
apps/mobile/          Expo + RN + TypeScript + RNUI
services/api/         FastAPI + SQLAlchemy + Alembic
services/ingest/      POWER / IMERG (imagen separada)
contracts/            openapi.json + tipos TS
datasets/{metadata,demo,snapshots}/
specs/NNN-*/          spec.md · plan.md · tasks.md
tests/{contract,parity,smoke}/
postman/              colección + environments
docs/                  constitución, arquitectura, deploy, demo
```

## Comandos

```bash
# Entorno
pnpm install
pnpm env:sync          # genera apps/mobile/.env.local con EXPO_PUBLIC_*
pnpm env:check         # falla si falta una variable obligatoria

# Backend
docker compose up --build
docker compose run --rm migrate
docker compose run --rm api pytest -q
docker compose --profile demo up --build

# Mobile (development build; Expo Go NO es compatible con RNUI/uilib-native)
pnpm --filter mobile android
pnpm --filter mobile test
pnpm --filter mobile typecheck

# Contrato y paridad
docker compose run --rm api pytest tests/contract -q
pnpm --filter mobile test:contract
docker compose run --rm api pytest tests/parity -q
pnpm --filter mobile test:parity

# E2E (APK/dev build)
pnpm --filter mobile e2e:build
maestro test apps/mobile/.maestro/flows

# Smoke
python tests/smoke/run.py --base-url http://localhost:8000
```

## Reglas

- Leer `docs/constitution.md` y la spec activa antes de tocar código.
- No implementar fuera de la spec; no inventar datos; `null` ≠ 0.
- No commitear `.env` ni secretos. La app solo usa `EXPO_PUBLIC_*`.
- No calcular cifras en el LLM; usar los motores.
- Registrar decisiones en `MEMORY.md` y ADRs.
- UI/docs en español; código/DB en inglés.
- Cada tarea termina con tests o evidencia manual; sin eso no se marca.

## Puertas

1. Spec aprobada antes de plan.
2. Plan aprobado antes de tasks.
3. Tasks aprobadas antes de código.
4. Tests verdes antes de merge.
5. Matriz RF → test/evidencia completa antes de cerrar la spec.
