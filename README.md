# Anden

Copiloto inteligente de planificación agrícola geoespacial para pequeños productores.
Proyecto para **NASA Space Apps Challenge 2026 - Field Shift: Adapting Farms with NASA Data**.
Piloto: **Moquegua, Perú** · 100 agricultores · Android · español, quechua, aimara e inglés.

> **Estado (14-nov-2026):** MVP P0 implementado en local y desplegado en GCP.
> El recorrido demo (onboarding → Inicio → comparar → probar un cambio → preguntar → guardar)
> funciona contra FastAPI + PostGIS y Expo Go. La UI usa **gluestack v5 + NativeWind 5**,
> con marca Anden, cuatro pestañas (Inicio/Comparar/Preguntar/Mi parcela), copy simple,
> i18n y preferencias de accesibilidad. Los mapas se retiraron en Spec 028.
> El perfil anónimo, el onboarding de 5 pasos con GPS/TTS y la creación de
> parcela guiada están en Spec 030; la ficha de parcela (historial, agua, suelo
> y prioridades) en Spec 031; el riego semanal con Open-Meteo y SRTM en Spec 032.
> Ver `docs/architecture/adr-0005-ui-agricultor-mapas.md`,
> `docs/architecture/adr-0007-perfil-onboarding-gps.md` y
> `docs/architecture/adr-0008-paleta-ilustraciones-motion.md`.
> La parcela demo es sintética y está etiquetada. Las parcelas nuevas usan NASA POWER real
> por coordenadas y datos declarados por el agricultor; no es una recomendación agronómica validada.

## Qué hace

- Crea una parcela o carga la parcela demo y muestra sus datos faltantes.
- Completa una ficha con historial de cultivos, agua, suelo y prioridades.
- Descarga NASA POWER real por parcela (lluvia, temperatura, ETo) con fuente y fecha; la parcela demo sigue etiquetada como sintética.
- Consulta pronóstico real de Open-Meteo a 7 días y elevación/pendiente SRTM 90 m con fuente y límites visibles.
- Compara la rotación actual con dos alternativas en el mismo horizonte.
- Estima agua, suelo y margen; usa `null` cuando falta un dato.
- Simula agua −20 % y precio −15 % sin modificar el baseline.
- Agente con tools deterministas: compara, simula, explica y prepara un borrador con confirmación.
- Guarda el borrador solo tras confirmación humana.
- Muestra gráficos de lluvia/ETo, margen y riego por plan, con tabla de datos accesible.
- Permite elegir español, quechua, aimara o inglés, y ajustar tema/reduce motion.
- Incluye onboarding de accesibilidad y Ajustes; objetivos WCAG 2.2 AA.

## Stack

| Capa | Tecnología |
|---|---|
| Mobile | Expo SDK 58 · React Native 0.88 · TypeScript · gluestack v5 · NativeWind 5 |
| Runtime MVP | APK Android propio (Expo SDK 58); Expo Go para desarrollo |
| i18n | i18next · react-i18next · expo-localization |
| Gráficos | Barras livianas con `View` · tablas accesibles · react-native-svg |
| API | FastAPI · Pydantic v2 · SQLAlchemy 2 |
| DB | PostgreSQL 16 + PostGIS 3.4 |
| Agente | Runtime determinista + Gemini 3.5 Flash (Vertex AI) con tools |
| Datos | NASA POWER + Open-Meteo + SRTM reales · catálogo local · suelo y economía declarados |
| Infra | Docker Compose local · VM GCP `e2-small` para el demo |
| Tests | pytest · contrato OpenAPI · paridad Python/TS · Maestro E2E |

> Demo desplegado: `https://34-55-141-32.sslip.io` (PostGIS + FastAPI + Gemini).
> Operación y rollback: `docs/architecture/deploy-gcp.md`.

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

# Opción A — teléfono físico con backend GCP (recomendada)
#   application/.env.local:
#   EXPO_PUBLIC_API_URL=https://34-55-141-32.sslip.io
pnpm start -- --lan
# Abrir el QR de Expo Go en el teléfono

# Opción B — backend local en la misma Wi-Fi
#   application/.env.local:
#   EXPO_PUBLIC_API_URL=http://<ip-lan-de-tu-pc>:8000
#   arrancar Metro en LAN:
pnpm start -- --lan

# Modo rendimiento (sin dev tools, bundle minificado):
pnpm start:perf

# Opción C — emulador Android con adb reverse
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

# E2E Maestro (emulador encendido y APK com.anden.app instalado)
maestro test application/.maestro/flows
```

Flujos Maestro:

| Flow | Estado |
|---|---|
| `00-launch` | verde sobre APK |
| `01-onboarding` | verde sobre APK |
| `03-compare` | verde sobre APK |
| `04-scenario` | verde sobre APK |
| `05-agent-save` | requiere Vertex; fallback determinista probado por API |
| `06-settings` | verde sobre APK |
| `07-parcel` | verde sobre APK |
| `09-ficha-parcela` | verde sobre APK |
| `10-riego` | verde sobre APK |

## Estructura

```text
application/       Expo + gluestack v5 + cliente API + Maestro flows
backend/            FastAPI, modelos, endpoints, tests
services/           motores puros: agua, economía, rotaciones, escenario
datasets/demo/      snapshot POWER sintético etiquetado
tests/parity/       fixtures compartidos Python/TS
specs/              SDD: specs 000-032
docs/               constitución, arquitectura, ADRs, supuestos, demo
```

## SDD

- Constitución: `docs/constitution.md`
- Catálogo y estado: `specs/README.md`
- Coherencia: `docs/architecture/coherence-report.md`
- UI, marca e i18n: `docs/architecture/adr-0004-anden-brand-i18n-charts-a11y.md`
- Accesibilidad: `docs/accessibility.md`
- Fallback histórico: `docs/architecture/adr-0002-paper-fallback.md`

## Datos y licencia

- Código: MIT (`LICENSE`).
- Datos: NASA POWER, FAO-56, catálogo local de Moquegua y datos declarados por el agricultor; ver `docs/data-licenses.md`.
- App gratuita para agricultores; no se venden datos.
- Parcela demo sintética y etiquetada; cualquier usuario puede crear la suya.

## Seguridad

`.env` está ignorado y no trackeado. La app solo recibe `EXPO_PUBLIC_*`; la
`GROQ_API_KEY` nunca sale del backend. Si el `.env` se compartió, rotar la key.

## Límites conocidos

- El APK de prueba está firmado en debug y se compila desde `C:\anden-app` para
  evitar el límite de 260 caracteres de Ninja/CMake en Windows. No es un APK de
  Play Store; ver `docs/architecture/apk-build.md` y `dist/README-APK.md`.
- El pronóstico de Open-Meteo es una estimación de modelo, no una predicción
  oficial del SENAMHI. La ETo es de referencia y no incluye el Kc del cultivo.
- Offline (spec 023) y Groq real (spec 021) no están implementados en este MVP.
- El demo usa un snapshot sintético etiquetado; las parcelas nuevas descargan NASA POWER real y no usan valores por defecto. La economía debe declararla el agricultor para calcular margen.
- El catálogo de cultivos está `needs_review` hasta validación agronómica local.
- Quechua y aimara están en borrador (`review_pending`) hasta revisión de hablantes nativos.
- El modo oscuro y el escalado de fuente 2.0× requieren QA visual continuo.
