# Informe de coherencia — specs vs. plan maestro

**Fecha:** 14-nov-2026  
**Alcance:** 28 specs, documentos de arquitectura y decisiones del equipo.  
**Naturaleza:** validación documental y de dependencias externas; **no** es un sistema implementado ni probado en campo.

## Veredicto

El conjunto es **coherente y ejecutable** como plan de implementación. Cubre el recorrido del plan maestro (parcela → evidencia NASA → comparación → escenario → agente → decisión humana), corrige supuestos técnicos falsos y hace explícitos los límites. Las brechas restantes son de **implementación y validación**, no de contradicción interna.

**Listo para implementar:** 000–003.  
**Riesgo que debe resolverse primero:** spike RNUI 10 + Expo 58 + `uilib-native`.

## Fuentes

- `docs/AUTOMATIC_PLAN_MAESTRO_V2.md` (plan maestro).
- Decisiones del equipo: RNUI con Expo, Android Studio, Groq, 100 agricultores, parcela sintética, uso libre, mejor validación.
- Verificaciones externas del 14-nov-2026: POWER, GIBS, npm RNUI, Expo SDK 58, free tiers.

## Trazabilidad con el plan maestro

| Sección del plan maestro | Artefacto SDD | Estado |
|---|---|---|
| §0 Resumen ejecutivo | `README.md`, `specs/README.md` | cubierto |
| §A Problema/solución | `README.md`, specs 001–022 | cubierto |
| §B Correcciones estratégicas | 015, 016, 021 | cubierto |
| §B.1 Planificar antes de monitorizar | 016, 018 | cubierto |
| §B.2 Salud del suelo | 015 | cubierto |
| §B.3 Datos faltantes | 006, 014, 015 | cubierto |
| §B.4 Validación de rotaciones | 008, 016 | cubierto |
| §B.5 Seguimiento y aprendizaje | 026 (P2) | diferido |
| §1 Problema | `README.md` | cubierto |
| §2 Visión/público/NASA | `README.md`, 006 | cubierto |
| §3 Principios | `docs/constitution.md` | cubierto |
| §4 Fases | `specs/README.md` (P0/P1/P2) | cubierto |
| §5 Entidades | `docs/architecture/data-model.md` | cubierto |
| §6 Fuentes/ingestión | 008–012 | cubierto |
| §7 Inputs | 004–007 | cubierto |
| §8 Outputs | 011, 017–019, 022 | cubierto |
| §9 Pantallas | 003, 006, 012, 018, 019, 022 | cubierto |
| §10 Arquitectura | 001–003, 012, 021 | cubierto |
| §11 Agente LangGraph | 020–022 | cubierto (MVP 6 tools) |
| §12 Motor de rotaciones | 014–016 | cubierto |
| §13 API FastAPI | `api-surface.md`, 002, 004, 005, 007, 011, 017, 020, 022 | cubierto |
| §14 Modelo DB | `data-model.md` | cubierto (16 + P2) |
| §15 Offline | 023 (P1) | cubierto, acotado |
| §16 Seguridad/privacidad | 004, 021, 022, `security.md` | cubierto |
| §17 Criterios/aceptación | matrices de cada spec | cubierto |
| §18 Plan de implementación | `specs/README.md`, 000–027 | cubierto |
| §19 Demo | `docs/demo/script.md`, 027 | cubierto |
| §20 Métricas/riesgos | este informe, 027 | cubierto |
| §21 Repo | `README.md`, estructura | cubierto |
| §22 Historias | 004–022 | cubierto |
| §23 Decisiones abiertas | `MEMORY.md`, ADR-0001 | cubierto |
| §23A Especificación operativa | 006, 016–019, 027 | cubierto |
| §24 Fuentes | `docs/data-licenses.md` | cubierto |
| §25 Definición final | `README.md` | cubierto |

## Decisiones del equipo aplicadas

| Decisión | Artefacto |
|---|---|
| RNUI (`react-native-ui-lib`) con Expo | 003, ADR-0001, `README.md` |
| Development build con Android Studio | 003, `testing.md`, `deploy-local.md` |
| Groq real en `.env` | `env.md`, 021, `.env.example` |
| 100 agricultores | 001, 003, 004, 027 |
| Parcela sintética + uso libre | 005, 008, `README.md`, LICENSE |
| Mejor validación (experto + usuarios) | `docs/agricultural-assumptions/validation.md` |
| E2E Maestro | `testing.md`, 003, 006, 012, 018, 019, 022, 023, 027 |
| Docker local + túnel | 001, 027, `deploy-local.md` |

## Contradicciones resueltas

| # | Contradicción / riesgo | Resolución |
|---|---|---|
| 1 | “2 planes” vs “3 estrategias” | **3 planes** (actual + 2); si no hay 2 elegibles, se completan con `needs_review`/`invalid` |
| 2 | POWER “entrega ETo” | **No**: `ET0`/`ETo` → 422; se calcula FAO-56/Hargreaves (009/014) |
| 3 | IMERG como medición de parcela | **No**: 0,1° (~11 km); GIBS maxZ 6, contexto regional (012) |
| 4 | RNUI en Expo Go | **No**: `uilib-native` exige dev build; Expo Go descartado (ADR-0001) |
| 5 | Offline con paridad total Python/TS | **No**: cache + multiplicadores de escenario (023) |
| 6 | 19 tablas | **16 núcleo + `campaign_records` P2**; JSONB donde aplica |
| 7 | Auth “mínima pero real” | **Anónima por instalación**; email P2 (004) |
| 8 | Cloud Run/Supabase | **Docker local + túnel** por decisión; cloud P2 |
| 9 | SSE obligatorio | **No**: JSON + progreso; SSE P2 |
| 10 | 13 tools del agente | **6 tools MVP**: contexto, clima, comparar, simular, UI, guardar |
| 11 | Farmer vs User | **`users`** con `is_anonymous` |
| 12 | “Predicción de precios” | **No**: escenarios y registro de campaña; sin predicción (026) |
| 13 | Voz/multiparcela/NDVI en MVP | **P2/P1**: 025, 024, 013 |
| 14 | `.env` real sin `.gitignore` | **Resuelto**: `.gitignore`, `.env` ignorado/no trackeado; rotar key si se compartió |
| 15 | Copiar `.env.example` sobre `.env` | **Corregido**: no sobrescribir; completar variables |

## Decisiones abiertas del §23 del plan maestro

| Decisión | Resolución SDD | Spec |
|---|---|---|
| Mapa móvil | `react-native-maps` + GIBS; maxZ 6/7 | 012 |
| DB | PostgreSQL + PostGIS local | 001 |
| ETo | Calcular FAO-56 / Hargreaves | 009, 014 |
| Catálogo | 3 cultivos `needs_review` | 008 |
| Número de rotaciones | 3 (actual + 2) | 016 |
| Modelo LLM | Groq + fake/fallback | 021 |
| Offline | SQLite + cache + multiplicadores | 023 |
| Auth del piloto | Anónima por instalación | 004 |
| Tiles offline | Fuera de alcance | 012, 023 |
| Fuente de precios | Histórico etiquetado + campo editable; sin predicción | 015, 026 |

## Brechas abiertas (implementación)

| Brecha | Impacto | Próximo paso |
|---|---|---|
| RNUI 10 no compilado aún en Expo 58 | alto | Spike 003 (4 h) |
| `uilib-native`/Reanimated en Android | alto | Dev build temprano |
| Earthdata no verificado | medio | Registro + snapshot 010 |
| Google Maps key | medio | GCP + restricción 012 |
| Groq modelo/rate limit | medio | Probar `GROQ_MODEL`; fallback fake |
| Catálogo sin agrónomo | alto | Revisión 008 + validation.md |
| Maestro sin APK | medio | `expo run:android --variant release` |
| Load test 100 usuarios | bajo | k6 001 |
| Key de Groq sin rotar | medio | Rotar si se compartió |
| Sin código/CI | esperado | Implementar 000–003 |

## Evidencia de verificación

- 28 specs, cada una con `spec.md`, `plan.md`, `tasks.md`.
- 8–9 RF por spec; **sin IDs duplicados** dentro de una spec.
- Matriz de pruebas y “Cobertura RF” en todas.
- Flujos Maestro alineados: `00-launch`, `01-onboarding`, `02-map`, `02b-ndvi` (P1), `03-compare`, `04-scenario`, `05-agent-save`, `06-offline` (P1).
- Endpoints unificados en `api-surface.md`; enums/tablas en `data-model.md`.
- Unidades/fórmulas en `water-economics.md`; capas/zoom en `map-layers.md`.
- `.env` ignorado y no trackeado (`git check-ignore`); `.env.example` sin valores reales.
- Sin UI alternativa contradictoria; RNUI en las specs de app.
- POWER `ET0`/`ETo` 422; GIBS IMERG PNG en zoom 6 y 400 en zoom 7; NDVI PNG en zoom 7.
- Expo Free 15+15 builds/mes; Cloud Run/Supabase free tiers verificados (no usados en P0).

## Conclusión

Las specs son lógicas entre sí y fieles al plan maestro, con desviaciones explícitas y justificadas. La primera implementación debe ser **000 → 001 → 002 → 003**, con el spike RNUI como puerta. Si el spike falla, el ADR-0001 ya define el fallback y el resto del plan no cambia.
