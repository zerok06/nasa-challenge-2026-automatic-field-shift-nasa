# MEMORY — Automatic

## Estado actual

- Specs redactadas: **000–027** (28 specs × 3 archivos) en `specs/`.
- Documentos de arquitectura: `docs/architecture/` (env, testing, data-model, api-surface, water-economics, map-layers, agent, security, deploy-local, ADR RNUI).
- `.env` raíz contiene `GROQ_API_KEY`; `.gitignore` creado y verificado: `.env` está ignorado y no trackeado.
- `.env.example` creado con placeholders; pendiente completar variables y rotar la key si el workspace se compartió.
- Repo listo para implementar 000.

## Estado de implementación (14-nov-2026)

- Backend FastAPI + PostGIS en Docker; `/health`, `/ready`, `/api/v1/ready` responden.
- Endpoints demo: auth anónima, parcelas, contexto, catálogo, indicadores, comparación, escenario, agente y guardado.
- Mobile Paper/Expo Go: onboarding, dashboard, mapa IMERG/NDVI, comparador, simulador, agente y fuentes.
- Tests: **17 pytest** (unitario, integración, contrato, paridad), **4 tests TS** de paridad, `tsc --noEmit` verde.
- Maestro: `00`, `01`, `02`, `02b`, `03`, `04`, `05` verdes contra Expo Go.
- Pendiente: APK/dev build, offline 023, Groq real, ingesta POWER real, validación agronómica.
- Intento de APK: `node-linker=hoisted` acortó rutas, pero Ninja/CMake 3.22 falló por nombres de objeto > 260 caracteres en codegen de gesture-handler; no hay APK validado.

## Decisiones (append-only)

### 2026-11-14 - Fallback de RNUI a React Native Paper

**Contexto:** el spike de RNUI 10 + `uilib-native` falló en Windows (ProGuard/AGP 9, `wix-react-native-text-size` incompatible con RN 0.88 y rutas CMake > MAX_PATH).  
**Decisión:** usar React Native Paper (JS puro) y Expo Go para el MVP; documentar en `docs/architecture/adr-0002-paper-fallback.md`.  
**Consecuencias:** se cumple el recorrido P0 y Maestro 00-05/02b; no se cumple literalmente "RNUI + dev build"; APK queda pendiente.  
**Spec:** `003`, `027`.


### 2026-11-14 — RNUI + Expo con development build

**Contexto:** se evaluó React Native Paper para usar Expo Go, pero el equipo prefiere RNUI.  
**Decisión:** usar `react-native-ui-lib` v10 + `uilib-native` con Expo SDK 58 y development build local (Android Studio). Expo Go no es compatible con `uilib-native`.  
**Alternativas:** RNUI 9.1.3; React Native Paper; componentes RN puros.  
**Consecuencias:** build nativo desde el día 0; Maestro corre contra el dev build/APK; el spike de 003 es puerta dura.  
**Spec:** `003-app-shell-rnui`.

### 2026-11-14 — Env centralizado en la raíz

**Decisión:** un único `.env` raíz; `.env.example` versionado; la app recibe solo `EXPO_PUBLIC_*` mediante `scripts/env/sync.mjs`; la API usa `pydantic-settings`; Docker Compose usa `env_file`.  
**Consecuencias:** `GROQ_API_KEY` nunca sale del backend; `.env` debe estar en `.gitignore`; rotar la key si se compartió.  
**Spec:** `000-fundaciones`, `docs/architecture/env.md`.

### 2026-11-14 — Deploy local + túnel

**Decisión:** Docker Compose en la laptop + Cloudflare Tunnel; APK opcional para entrega y Maestro. Sin cloud en la primera semana.  
**Consecuencias:** el demo depende de la laptop y su red; documentar `adb reverse`, LAN y túnel; el código queda listo para Cloud Run después.  
**Spec:** `001`, `027`.

### 2026-11-14 — Agente Groq + fallback fake

**Decisión:** LangGraph con `LLM_PROVIDER=groq`; `fake` determinista para tests y fallback. El LLM no produce cifras.  
**Spec:** `021`.

### 2026-11-14 — Testing: unitarios + Maestro E2E

**Decisión:** pirámide con pytest, Jest/RNTL, contrato/paridad y **Maestro** contra development build/APK (no Expo Go). Flujos `00`–`06`; CI unit/contrato en PR; E2E local/pre-release.  
**Consecuencias:** `testID` estables, reset de datos, APK release para E2E; no bloquear el demo por un emulador.  
**Spec:** `003`, `027`, `docs/architecture/testing.md`.

### 2026-11-14 — Parcela sintética, código abierto y uso gratuito

**Decisión:** demo con parcela sintética etiquetada; cualquier agricultor puede crear la suya gratis; código MIT; datos con atribución.  
**Spec:** `000`, `005`, `027`.

### 2026-11-14 — Validación agronómica

**Decisión:** revisión por agrónomo local + 3–5 pruebas de usabilidad; sin revisor, el catálogo queda `needs_review` y no se presenta como recomendación validada.  
**Spec:** `008`, `027`.

## Riesgos abiertos

| Riesgo | Estado | Mitigación |
|---|---|---|
| `.env` real sin `.gitignore` | **resuelto** | `.gitignore` + verificación; rotar key si se compartió |
| RNUI 10 (3 días de publicado) + Expo 58 | alto | spike de 4 h en 003; fallback RNUI 9.1.3 con ADR |
| `uilib-native` en build Android | alto | build temprano con Android Studio; documentar |
| Google Maps key para APK | medio | GCP offer; fallback de mapa |
| Maestro necesita APK | medio | `expo run:android --variant release` o EAS `e2e-test` |
| Groq rate limits | medio | `fake`/guided; reintentos acotados |
| IMERG requiere Earthdata | medio | snapshot pre-descargado; GIBS+POWER |
| 100 usuarios en laptop | bajo | 10 concurrentes, pool, índices, load test |
