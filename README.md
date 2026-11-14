# Automatic

Copiloto inteligente de planificación agrícola geoespacial para pequeños productores.
Proyecto para **NASA Space Apps Challenge 2026 - Field Shift: Adapting Farms with NASA Data**.
Piloto: **Moquegua, Perú** · 100 agricultores · Android · español.

> **Estado (14-nov-2026):** MVP P0 implementado y ejecutándose en local.
> El recorrido demo (onboarding → dashboard → mapa → comparador → simulador → agente → guardado)
> funciona contra FastAPI + PostGIS y Expo Go. La UI usa **React Native Paper** por el fallback
> documentado en `docs/architecture/adr-0002-paper-fallback.md`.
> Datos de demo sintéticos y etiquetados; no es una recomendación agronómica validada.

## Qué hace

- Crea una parcela o carga la parcela demo y muestra sus datos faltantes.
- Muestra contexto NASA POWER (lluvia, temperatura, ETo calculada) con fuente y fecha.
- Muestra capas regionales NASA GIBS: IMERG (maxZ 6) y NDVI (maxZ 7).
- Compara la rotación actual con dos alternativas en el mismo horizonte.
- Estima agua, suelo y margen; usa `null` cuando falta un dato.
- Simula agua −20 % y precio −15 % sin modificar el baseline.
- Agente con tools deterministas: compara, simula, explica y prepara un borrador con confirmación.
- Guarda el borrador solo tras confirmación humana.

## Stack

| Capa | Tecnología |
|---|---|
| Mobile | Expo SDK 58 · React Native 0.88 · TypeScript · React Native Paper 5 |
| Runtime MVP | Expo Go 58 (fallback Paper; ver ADR-0002) |
| API | FastAPI · Pydantic v2 · SQLAlchemy 2 |
| DB | PostgreSQL 16 + PostGIS 3.4 |
| Agente | Runtime determinista con tools; Groq opcional pendiente |
| Datos | NASA POWER (snapshot demo) · NASA GIBS (IMERG, NDVI) |
| Infra | Docker Compose local |
| Tests | pytest · contrato OpenAPI · paridad Python/TS · Maestro E2E |

## Inicio rápido

```bash
# 1. Env (nunca commitear .env)
# Si .env NO existe: cp .env.example .env
# Si .env ya existe: completar variables sin borrar GROQ_API_KEY
pnpm env:check

# 2. Backend + PostGIS
docker compose up -d --build
curl http://localhost:8000/ready          # {"status":"ready", ...}
curl http://localhost:8000/api/v1/ready

# 3. Mobile
cd application
pnpm install
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
pnpm start -- --localhost
# Abrir exp://127.0.0.1:8081 en Expo Go
```

La app recibe solo `EXPO_PUBLIC_*` desde `application/.env.local`. La `GROQ_API_KEY`
nunca sale del backend.

## Tests

```bash
# Backend: unitarios, integración, contrato y paridad
.\backend\.venv\Scripts\python.exe -m pytest backend\tests -q

# Mobile: typecheck + paridad de multiplicadores
cd application
pnpm typecheck
pnpm test

# E2E Maestro (emulador encendido, Metro en 8081 y Expo Go abierto)
maestro test application/.maestro/flows
```

Flujos Maestro:

| Flow | Estado |
|---|---|
| `00-launch` | verde |
| `01-onboarding` | verde |
| `02-map` | verde |
| `02b-ndvi` | verde (P1 parcial) |
| `03-compare` | verde |
| `04-scenario` | verde |
| `05-agent-save` | verde |
| `06-offline` | no implementado (P1 023) |

## Estructura

```text
application/       Expo + Paper + cliente API + Maestro flows
backend/            FastAPI, modelos, endpoints, tests
services/           motores puros: agua, economía, rotaciones, escenario
datasets/demo/      snapshot POWER sintético etiquetado
tests/parity/       fixtures compartidos Python/TS
specs/              SDD: 28 specs (000-027)
docs/               constitución, arquitectura, ADRs, supuestos, demo
```

## SDD

- Constitución: `docs/constitution.md`
- Catálogo y estado: `specs/README.md`
- Coherencia: `docs/architecture/coherence-report.md`
- Fallback de UI: `docs/architecture/adr-0002-paper-fallback.md`

## Datos y licencia

- Código: MIT (`LICENSE`).
- Datos: NASA POWER/GIBS, FAO-56, anuario de Moquegua; ver `docs/data-licenses.md`.
- App gratuita para agricultores; no se venden datos.
- Parcela demo sintética y etiquetada; cualquier usuario puede crear la suya.

## Seguridad

`.env` está ignorado y no trackeado. La app solo recibe `EXPO_PUBLIC_*`; la
`GROQ_API_KEY` nunca sale del backend. Si el `.env` se compartió, rotar la key.

## Límites conocidos

- No hay APK/dev build generado; Maestro corre contra Expo Go con Paper.
  Se intentó `assembleDebug`; falló por el límite de 260 caracteres de Ninja/CMake en el
  codegen de RN 0.88 en Windows (ver ADR-0002). `application/.npmrc` usa `node-linker=hoisted`
  para acortar rutas.
- Offline (spec 023) y Groq real (spec 021) no están implementados en este MVP.
- El snapshot NASA es sintético para el demo; la ingesta POWER real queda como siguiente paso.
- El catálogo de cultivos está `needs_review` hasta validación agronómica local.
