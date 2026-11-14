# Estrategia de testing

## Pirámide

| Nivel | Herramienta | Qué cubre | Cuándo | Tiempo |
|---|---|---|---|---|
| Unitario backend | pytest | Motores puros, schemas, auth, nodos del agente con tools fake | Cada PR | < 30 s |
| Unitario mobile | Jest + React Native Testing Library | Componentes RNUI, hooks, formateo, cache, multiplicadores | Cada PR | < 60 s |
| Integración | pytest + Postgres | Repositorios, endpoints, migraciones, IDOR, idempotencia | Cada PR | < 2 min |
| Contrato | OpenAPI drift + Pydantic/Zod + Postman/Newman | Que API y app hablen el mismo contrato | Cada PR | < 1 min |
| Paridad | pytest + Jest con fixtures JSON | Que Python y TS den los mismos números | Cada PR | < 30 s |
| E2E | **Maestro** | Recorrido demo en APK/dev build | Pre-release y pre-demo | 5–8 min |
| Manual | Checklist | Mapa, offline, accesibilidad, pantalla pequeña, túnel | Pre-demo | 20 min |

**Meta:** ≥ 85 % de ramas en motores de cálculo; todos los RF P0 con test o evidencia manual. No perseguir un % global.

## Unitarios

### Backend

- `water_engine`: ETc, lluvia efectiva, riego neto/bruto, déficit, `mm ↔ m³/ha`, eficiencia en (0,1], nulos.
- `economics`: margen, precio de equilibrio, costos faltantes → `null`, no 0.
- `rotation_engine`: ventana, duración, familia repetida, `eligible/needs_review/invalid`.
- `soil_signals`: sin análisis → `not_measured`; sin puntajes inventados.
- Seguridad: parcela ajena → 404, token vencido, payload inválido, prompt injection en nombre/notas.
- Agente: ruteo, allowlist, timeout, cifra alucinada → plantilla.

### Mobile

- Componentes RNUI: `EvidenceBadge`, `ProvenanceSheet`, `RotationTimeline`, `ScenarioPresets`.
- Formularios: desconocidos, validación, consentimiento.
- Cliente API: envelope de error, timeout, retry, loading/empty/offline.
- Cache y multiplicadores offline con fixtures compartidos.
- Accesibilidad: labels, roles, tamaño táctil.

**Regla:** los motores reciben `today` como parámetro; no usan `Date.now()` ni red.

## Contrato y paridad

- `contracts/openapi.json` se genera desde FastAPI y se compara en CI.
- `openapi-typescript` genera tipos; Zod valida en el borde.
- Postman collection con 6 requests del recorrido + environments `local`/`tunnel`; Newman en CI o smoke.
- `tests/parity/*.json`: inputs/outputs esperados; pytest y Jest los ejecutan; tolerancia `1e-6`.

## E2E con Maestro

**Base:** Maestro corre contra un **build instalable**. RNUI ya exige development build, así que no hay conflicto con Expo Go.

### Build

```bash
# local con Android Studio
cd apps/mobile
npx expo run:android --variant release

# o EAS
eas build -p android --profile e2e-test
```

`eas.json`:

```json
{
  "build": {
    "e2e-test": {
      "withoutCredentials": true,
      "android": { "buildType": "apk", "image": "latest" },
      "ios": { "simulator": true, "image": "latest" }
    }
  }
}
```

### Flows

| Flow | Cubre | RF |
|---|---|---|
| `00-launch.yaml` | shell, tabs, tema | 003 |
| `01-onboarding.yaml` | crear parcela, unknowns, dashboard | 004–006, 011 |
| `02-map.yaml` | IMERG, leyenda, fecha | 012 |
| `02b-ndvi.yaml` (P1) | NDVI, fechas, leyenda | 013 |
| `03-compare.yaml` | 3 planes, margen null, fuentes | 016–018 |
| `04-scenario.yaml` | agua −20 %, precio −15 %, reset | 019 |
| `05-agent-save.yaml` | preguntar, tool trace, guardar, rechazar | 020–022 |
| `06-offline.yaml` | cache, banner, `last_updated_at` | 023 |

Ejemplo:

```yaml
appId: com.automatic.app
---
- launchApp:
    clearState: true
- tapOn: { id: "onboarding.start" }
- inputText: "Parcela demo"
- tapOn: { id: "onboarding.continue" }
- assertVisible: "NO DISPONIBLE"
```

### testIDs

`onboarding.start`, `onboarding.continue`, `parcel.create`, `comparison.plan.existing`, `scenario.water.preset20`, `scenario.price.preset15`, `scenario.reset`, `agent.input`, `agent.send`, `agent.save`, `sources.sheet`.

### Datos

- `APP_ENV=test`; endpoint `POST /api/v1/test/reset` protegido por entorno y header.
- Seed determinista: `parcel_demo_01`, 3 cultivos, 3 planes, 2 escenarios.
- `clearState` limpia la app; el reset del servidor se hace con script.
- Fechas fijas; LLM `fake`; sin dependencia de Groq.

### CI

- PR: unit, integración, contrato, paridad, build Docker. Sin emulador.
- Release/tag: Maestro con emulador Android (GitHub Actions) o local antes del demo.
- Artefactos: JUnit, capturas, video.

## Carga (100 usuarios)

- Supuesto: 100 registrados, ~10 concurrentes, lecturas dominantes.
- Objetivo: p95 < 500 ms en lecturas; agente < 15 s; 0 errores 5xx en 2 min.
- Herramienta: k6 o `hey` contra Docker local; script en `tests/load/`.
- No es un SLA; es una prueba de que la laptop aguanta el demo.

## Checklist manual

- [ ] Mapa: tiles IMERG en zoom 6; NDVI en zoom 7; leyenda, fecha y fuente.
- [ ] Modo avión: ficha/comparación cacheadas; banner; escenario base.
- [ ] Pantalla 5": textos y botones legibles; scroll; sin solapamientos.
- [ ] Accesibilidad: labels, contraste, tamaño táctil, dynamic type.
- [ ] Túnel: URL HTTPS; app apunta al túnel; API responde; CORS.
- [ ] APK en dispositivo limpio; instalación y arranque.
- [ ] Errores: API caída → mensaje claro; sin pantalla en blanco.
