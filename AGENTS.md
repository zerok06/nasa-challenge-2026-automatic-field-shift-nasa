# AGENTS.md - Automatic

## Contexto

Copiloto de planificación agrícola para una parcela piloto en Moquegua.
Piloto: **100 agricultores**, Android, conectividad intermitente, español.

Stack real del MVP:

- Mobile: Expo SDK 58 + React Native 0.88 + TypeScript + **gluestack v5 + NativeWind 5**
- i18n: i18next + expo-localization (es-PE default; qu-PE/ay-PE en borrador; en)
- Gráficos: react-native-gifted-charts + tablas de datos accesibles
- API: FastAPI + SQLAlchemy 2 + Pydantic v2
- DB: PostgreSQL 16 + PostGIS 3.4
- Agente: runtime determinista con tools; Groq queda como integración opcional pendiente
- Infra: Docker Compose local
- Tests: pytest (unitario/integración/contrato/paridad) + paridad TS + Maestro E2E

La decisión de UI, marca, i18n, gráficos y accesibilidad está en
`docs/architecture/adr-0004-anden-brand-i18n-charts-a11y.md`. Paper queda como
decisión histórica (ADR-0002, superseded).

## Estructura

```text
application/          Expo + RN + TypeScript + Paper
backend/              FastAPI + SQLAlchemy + tests
services/             motores puros (agua, economía, rotaciones, escenario)
datasets/demo/        snapshot POWER sintético
specs/NNN-*/          spec.md → plan.md → tasks.md
docs/                 constitución, arquitectura, ADRs, demo
tests/parity/         fixtures compartidos Python/TS
```

## Comandos

```bash
# Backend + DB
docker compose up -d --build
curl http://localhost:8000/ready
.\backend\.venv\Scripts\python.exe -m pytest backend\tests -q

# Mobile
cd application
pnpm install
pnpm typecheck
pnpm test
pnpm start -- --localhost

# E2E (emulador + Metro + Expo Go)
adb reverse tcp:8000 tcp:8000
adb reverse tcp:8081 tcp:8081
maestro test application/.maestro/flows
```

## Reglas

- Leer `docs/constitution.md` y la spec activa antes de tocar código.
- No implementar fuera de la spec; no inventar datos; `null` ≠ 0.
- No commitear `.env` ni secretos. La app solo usa `EXPO_PUBLIC_*`.
- No calcular cifras en el LLM; usar los motores.
- Registrar decisiones en `MEMORY.md` y ADRs.
- UI/docs en español; código/DB en inglés.
- i18n: no hardcodear copy nuevo sin clave/traducción; quechua/aimara son
  `review_pending` hasta revisión nativa.
- Accesibilidad: targets ≥48 dp, labels en iconos, gráficos con tabla de datos
  y respetar reduce motion. Ver `docs/accessibility.md`.
- Cada tarea termina con tests o evidencia manual; sin eso no se marca.
- Si un test E2E falla, revisar el artefacto de Maestro (jerarquía + screenshot) antes de cambiar el flujo.

## Puertas

1. Spec aprobada antes de plan.
2. Plan aprobado antes de tasks.
3. Tasks aprobadas antes de código.
4. Tests verdes antes de merge.
5. Matriz RF → test/evidencia completa antes de cerrar la spec.
