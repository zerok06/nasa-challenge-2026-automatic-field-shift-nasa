# Tasks 009 — Ingesta POWER + ETo

- [ ] **T1 — Adaptador POWER**
  - RF: 009.1, 009.2
  - Fetch, timeout, reintentos, normalización `-999`.
  - Hecho cuando: snapshot de 3 días válido.

- [ ] **T2 — ETo FAO-56**
  - RF: 009.3, 009.8
  - Implementación + fixture FAO.
  - Hecho cuando: tolerancia declarada.

- [ ] **T3 — Hargreaves**
  - RF: 009.4
  - Fallback y marca de método.
  - Hecho cuando: test sin RH/viento.

- [ ] **T4 — Snapshot + manifiesto**
  - RF: 009.5
  - JSON canónico, checksum, missing.
  - Hecho cuando: `--verify` verde.

- [ ] **T5 — Cache/stale**
  - RF: 009.6
  - DB + TTL; no request a POWER.
  - Hecho cuando: TTL vencido → stale.

- [ ] **T6 — CLI**
  - RF: 009.7
  - `python -m app.ingest power`; idempotente.
  - Hecho cuando: segunda ejecución no duplica.

- [ ] **T7 — Snapshot real**
  - RF: 009.1
  - Moquegua 2024; fuente/fecha.
  - Hecho cuando: archivo + manifiesto en `datasets/snapshots/`.

## Definición de terminado

- [ ] POWER normalizado.
- [ ] ETo FAO/Hargreaves.
- [ ] Snapshot/checksum.
- [ ] Cache/stale.
