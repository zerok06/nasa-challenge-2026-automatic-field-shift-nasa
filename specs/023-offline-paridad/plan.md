# Plan 023 — Offline y paridad

## Cache

`npx expo install expo-sqlite`

`expo-sqlite`:

```sql
CREATE TABLE cache_entries (
  key TEXT PRIMARY KEY,
  parcel_id TEXT,
  payload TEXT,
  updated_at TEXT,
  version INTEGER
);
CREATE TABLE outbox (
  id TEXT PRIMARY KEY,
  method TEXT,
  path TEXT,
  body TEXT,
  idempotency_key TEXT,
  created_at TEXT
);
```

- Claves: `parcel:{id}`, `context:{id}`, `comparison:{id}`, `sources:{id}`.
- Guardar solo respuestas exitosas.
- TTL visible; no borrar automáticamente.

## Escenario offline

Función TS `applyScenarioMultipliers(comparison, water, price)`:

- Solo cambia agua disponible y precio.
- Recalcula déficit y margen con las mismas fórmulas que 014/015.
- No recalcula ETc/lluvia.
- `quality_flag="offline_estimate"`.
- Fixtures `tests/parity/scenario_*.json`.

## Sync

- Outbox con `idempotency_key`.
- Al recuperar red: enviar en orden; si 409, resolver.
- No sobrescribir cambios del servidor; mostrar conflicto.
- Limpiar outbox al confirmar.

## UI

- `OfflineBanner` con `last_updated_at`.
- `StaleBadge`.
- “Sin datos descargados” si no hay cache.
- `testID`: `offline.banner`, `scenario.offline.result`.

## Tests

- Unit: cache, cola, multiplicadores.
- Parity: pytest+Jest.
- E2E: modo avión (debug toggle o `adb`), abrir comparación, simular.
- Manual: cache corrupto, conflicto.

## Cobertura RF

| RF | Archivo |
|---|---|
| 023.1 | `src/offline/cache.ts` |
| 023.2 | `OfflineBanner` |
| 023.3 | `src/offline/scenario.ts` |
| 023.4 | flag |
| 023.5 | `outbox.ts` |
| 023.6 | `sync.ts` |
| 023.7 | `stale.ts` |
| 023.8 | `tests/parity` |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Divergencia TS/Python | alcance mínimo + fixtures |
| Cache viejo | stale visible |
| Conflictos | resolución explícita |
| P1 retrasa | timebox; cortar sin bloquear P0 |
