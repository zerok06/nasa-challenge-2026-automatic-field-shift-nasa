# Catálogo de specs — Automatic

**Regla de granularidad:** un spec = un resultado verificable, 3–6 RF, máximo 1,5 días, una matriz de pruebas. Si no cabe en una página, se divide.  
**WIP:** máximo 3 specs activas. Se redacta la spec N+2 mientras se implementa la N.  
**Leyenda de test:** U unitario · I integración · C contrato · P paridad · E E2E Maestro · S smoke · M manual.

## Estado de implementación (15-nov-2026)

- **P0 implementado:** backend FastAPI/PostGIS, app Anden/Expo Go, Gemini en
  Vertex AI y demo público en GCP.
- **Verde:** 52 pytest (U/I/C/P), 18 tests TS, `tsc --noEmit`, `eslint`.
- **Parcial:** Maestro requiere dispositivo; 013 NDVI fuera de la UI 028.
- **No implementado:** 023 offline; APK/dev build; validación agronómica;
  revisión nativa de quechua/aimara.
- **Documentado, sin implementar:** 035 PWA web (spec, plan y tasks completos;
  espera aprobación para iniciar código).
- **Desviación:** RNUI → gluestack v5 + NativeWind 5; ver ADR-0004.
- Los estados "escrita" de la tabla son de la fase SDD; el estado real de código está en esta sección.

## Fundaciones

| ID | Spec | Prioridad | Estado | Depende | Test | Días |
|---|---|---|---|---|---|---|
| 000 | Fundaciones, SDD y entorno | P0 | ✅ escrita | — | U | 1 |
| 001 | Docker, PostGIS y CI | P0 | ✅ escrita | 000 | I, S | 1 |
| 002 | Contratos y esqueleto API | P0 | ✅ escrita | 001 | U, C, S | 1 |
| 003 | App shell Expo + RNUI | P0 | ✅ escrita | 002 | U, E, M | 1 |

## Parcela

| ID | Spec | Prioridad | Estado | Depende | Test | Días |
|---|---|---|---|---|---|---|
| 004 | Sesión anónima y autorización | P0 | ✅ escrita | 003 | U, I, E | 0,5 |
| 005 | Parcela: CRUD y geometría | P0 | ✅ escrita | 004 | U, I | 1 |
| 006 | Onboarding y ficha | P0 | ✅ escrita | 005 | U, E | 1 |
| 007 | Historial, agua y suelo | P0 | ✅ escrita | 005 | U, I, E | 1 |

## Evidencia NASA

| ID | Spec | Prioridad | Estado | Depende | Test | Días |
|---|---|---|---|---|---|---|
| 008 | Catálogo de cultivos y supuestos | P0 | ✅ escrita | 001 | U, C | 1 |
| 009 | Ingesta POWER + ETo | P0 | ✅ escrita | 008 | U, I | 1,5 |
| 010 | Ingesta IMERG + procedencia | P0 | ✅ escrita | 008 | U, I | 1,5 |
| 011 | Indicadores y fuentes | P0 | ✅ escrita | 009, 010 | U, C, E | 1 |
| 012 | Mapa y capa GIBS | P0 | ✅ escrita | 005, 010, 003 | U, E, M | 1,5 |
| 013 | NDVI multitemporal | P1 | ✅ escrita | 012 | U, E, M | 1 |

## Motor y comparación

| ID | Spec | Prioridad | Estado | Depende | Test | Días |
|---|---|---|---|---|---|---|
| 014 | Motor hídrico | P0 | ✅ escrita | 007, 008, 009 | U, P | 1 |
| 015 | Economía y suelo | P0 | ✅ escrita | 007, 008 | U, P | 1 |
| 016 | Generación y validación de rotaciones | P0 | ✅ escrita | 014, 015 | U, I | 1,5 |
| 017 | API de comparación y escenarios | P0 | ✅ escrita | 016 | C, I | 1 |
| 018 | UI comparador | P0 | ✅ escrita | 017, 003 | U, E | 1,5 |
| 019 | UI simulador | P0 | ✅ escrita | 017, 018 | U, E | 1 |

## Producto y experiencia

| ID | Spec | Prioridad | Estado | Depende | Test | Días |
|---|---|---|---|---|---|---|
| 028 | Rediseño UI agricultor y retiro de mapas | P0 | implementado | 003, 018 | U, E, M | 1,5 |
| 030 | Perfil, onboarding con ubicación y parcela | P0 | implementado (E2E pendiente) | 004, 005, 028 | U, I, E | 1,5 |
| 031 | Ficha de parcela | P0 | implementado (E2E pendiente) | 007, 030 | U, I, E | 1 |

## Agente

| ID | Spec | Prioridad | Estado | Depende | Test | Días |
|---|---|---|---|---|---|---|
| 020 | Tools del agente | P0 | ✅ escrita | 017–019 | U, I | 1 |
| 021 | Grafo LangGraph + Groq | P0 | ✅ escrita | 020 | U, I | 1,5 |
| 022 | Chat, UI actions y guardado | P0 | ✅ escrita | 021, 018 | U, E | 1 |
| 029 | Gemini en Vertex AI + despliegue GCP | P0 | ✅ implementado | 020–022, 028 | U, I, S | 1 |

## Resiliencia y extras

| ID | Spec | Prioridad | Estado | Depende | Test | Días |
|---|---|---|---|---|---|---|
| 023 | Offline y paridad | P1 | ✅ escrita | 018, 019, 022 | U, P, E | 1,5 |
| 024 | Multi-parcela | P2 | ✅ escrita | 005 | U, I, E | 1 |
| 025 | Voz y accesibilidad avanzada | P2 | ✅ escrita | 022 | U, M | 1,5 |
| 026 | Campaña y precios | P2 | ✅ escrita | 015, 019 | U, I | 2 |
| 027 | Release y entrega | P0 | ✅ escrita | todos P0 | E, S, M | 1 |

## Web (PWA)

| ID | Spec | Prioridad | Estado | Depende | Test | Días |
|---|---|---|---|---|---|---|
| 035 | PWA web: instalación, offline y cierre de precios | P2 | 📝 escrita (lista para aprobación) | 018, 019, 026, 028, 030–034 | U, I, C, P, E, M | 3 |

**P0:** 000–012 + 014–022 + 027–029 + 030–034 (**30 specs**). **P1:** 013, 023.
**P2:** 024–026, 035.

## Backlog P2 sin spec (no entra en la primera semana)

- Alertas automáticas y notificaciones.
- Datos comunitarios agregados.
- Mapas/tiles offline.
- Predicción de precios verificada (hoy: solo escenarios).
- SMAP/ECOSTRESS y series satelitales adicionales.
- iOS nativo (la web queda cubierta por 035).
- Colaboración multiusuario/roles.
- Analítica de uso y panel administrativo.

## Plantilla

Cada spec usa:

- `spec.md`: contexto, usuarios, historias, RF EARS, NFR, casos límite, fuera de alcance, criterios, dudas, matriz de pruebas.
- `plan.md`: archivos, funciones puras, algoritmos, contratos, estados UI, env, estrategia de tests, cobertura RF.
- `tasks.md`: tareas ≤ 60 min, dependencias, RF, “Hecho cuando”.

## Desviaciones conscientes del plan maestro

| Tema | Plan maestro | Decisión SDD | Motivo |
|---|---|---|---|
| UI | React Native sin librería fija | **RNUI + development build** | decisión del equipo; Android Studio disponible |
| Build | Expo | Dev build; Expo Go no soporta `uilib-native` | RNUI nativo |
| Deploy | Cloud Run/Supabase | **Docker local + VM GCP `e2-small`** | demo público con Gemini; Cloud Run queda P2 |
| Rotaciones | 2 mínimo / 3 objetivo | **3 siempre** (actual + 2) | comparación justa |
| ETo | “POWER entrega ETo” | **calcular FAO-56/Hargreaves** | POWER no expone ET0 (verificado) |
| IMERG | capa por parcela | **GIBS regional, zoom ≤ 6** | resolución 0,1° |
| Offline | paridad completa Python/TS | **solo cache + multiplicadores** | evita divergencia y retraso |
| Modelo | 19 tablas | **16 núcleo + `campaign_records` P2** | menos joins, misma auditoría |
| Auth | “mínima pero real” | **anónima por instalación** | 100 agricultores sin fricción |
| Testing | no definido | **unit + contrato + paridad + Maestro** | puerta de calidad |
| Streaming | SSE opcional | **JSON + progreso** | menos complejidad para el demo |
| Web/iOS | posterior | **P2** | Android primero |

## Chequeo de coherencia

- [x] 36 specs en total: 35 con `spec.md`, `plan.md` y `tasks.md`; 033 solo tiene `spec.md`.
- [x] RF únicos por spec y matriz de pruebas.
- [x] Endpoints unificados en `docs/architecture/api-surface.md`.
- [x] Enums y tablas en `docs/architecture/data-model.md`.
- [x] Unidades y fórmulas en `docs/architecture/water-economics.md`.
- [x] Flujos Maestro `00`–`06` alineados entre specs y `testing.md`.
- [x] Sin secretos en specs; `.env` ignorado.
- [x] Sin contradicción 2 vs 3 planes; sin afirmar ETo de POWER.
- [x] Sin UI alternativa contradictoria; RNUI en todas las specs de app.
