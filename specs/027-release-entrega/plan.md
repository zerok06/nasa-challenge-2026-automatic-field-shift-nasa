# Plan 027 — Release y entrega

## Runbook

```bash
# 1. Env (no sobrescribir un .env existente con la key real)
# Si no existe: cp .env.example .env
pnpm env:check
pnpm env:sync

# 2. Backend
docker compose --profile demo up --build -d
curl http://localhost:8000/api/v1/ready

# 3. Túnel (o adb reverse)
cloudflared tunnel --url http://localhost:8000
# actualizar EXPO_PUBLIC_API_URL y pnpm env:sync

# 4. App
pnpm --filter mobile android
# o APK:
cd apps/mobile && npx expo run:android --variant release

# 5. E2E
maestro test apps/mobile/.maestro/flows

# 6. Smoke
python tests/smoke/run.py --base-url http://localhost:8000
```

## Entregables

| Entregable | Ubicación |
|---|---|
| Repo | GitHub |
| README | raíz |
| Specs | `specs/` |
| OpenAPI | `contracts/openapi.json` |
| APK | release/artifact |
| Video | `docs/demo/` o link |
| Fuentes | `docs/data-licenses.md` |
| Datos demo | `datasets/demo/` |
| Snapshot NASA | `datasets/snapshots/` |

## Checklist de demo

- [ ] `/ready` 200; DB/snapshots.
- [ ] 3 planes; 2 escenarios.
- [ ] Mapa IMERG zoom 6; leyenda.
- [ ] Agente responde con evidencia; fake probado.
- [ ] Guardar borrador + rechazo.
- [ ] APK en dispositivo limpio.
- [ ] Túnel/adb/LAN probados.
- [ ] Video descargado.
- [ ] Labels y disclaimers visibles.
- [ ] `.env` ignorado; sin keys en repo.
- [ ] Laptop sin suspensión; teléfono cargado.

## Video (3–5 min)

1. Problema (20–30 s).
2. Parcela (30 s).
3. Mapa (30–45 s).
4. Comparación (45–60 s).
5. Simulación (40–50 s).
6. Agente (45–60 s).
7. Decisión humana (20–30 s).
8. Cierre (15 s).

## Cobertura RF

| RF | Archivo / evidencia |
|---|---|
| 027.1 | `docker-compose.yml`, runbook |
| 027.2 | `tests/smoke/run.py`, `docs/demo/script.md` |
| 027.3 | `apps/mobile` release APK |
| 027.4 | `docs/architecture/deploy-local.md` |
| 027.5 | `apps/mobile/.maestro/flows/00–06` |
| 027.6 | `README.md`, `specs/`, video, `docs/data-licenses.md` |
| 027.7 | etiquetas en UI/seed |
| 027.8 | `.gitignore`, check de secretos |

## Riesgos de entrega

| Riesgo | Mitigación |
|---|---|
| Túnel efímero | adb reverse/LAN/video |
| APK falla | dev build/Expo dev client |
| Groq 429 | fake/guiado |
| Laptop duerme | energía/checklist |
| Datos reales | seed sintético |
| Secretos | check + rotación |
| Poco tiempo | P0 vertical; cortar P1/P2 |

## Post-entrega

- Cloud Run + Supabase si se quiere URL permanente.
- Validación con agrónomo/agricultores.
- Campaña real (026).
