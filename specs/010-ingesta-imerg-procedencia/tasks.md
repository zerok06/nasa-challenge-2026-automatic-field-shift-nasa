# Tasks 010 — Ingesta IMERG + procedencia

- [ ] **T1 — Autenticación Earthdata**
  - RF: 010.1
  - Variables en ingest; error claro.
  - Hecho cuando: 401 se reporta sin reintentar.

- [ ] **T2 — Descarga/subset**
  - RF: 010.1, 010.2
  - Bbox/período; validar resolución.
  - Hecho cuando: fixture/grano leído.

- [ ] **T3 — Agregados**
  - RF: 010.3
  - Diario/mensual/percentiles; método.
  - Hecho cuando: test numérico.

- [ ] **T4 — Snapshot/manifiesto**
  - RF: 010.4, 010.5, 010.8
  - JSON, checksum, `is_simulated`.
  - Hecho cuando: `--verify` verde.

- [ ] **T5 — Missing/stale**
  - RF: 010.6
  - Repositorio y flags.
  - Hecho cuando: sin snapshot → missing.

- [ ] **T6 — CLI**
  - RF: 010.7
  - Idempotente; perfil ingest.
  - Hecho cuando: segunda corrida no duplica.

- [ ] **T7 — Snapshot demo**
  - RF: 010.1
  - Real si hay Earthdata; si no, extracto etiquetado.
  - Hecho cuando: archivo + manifiesto + etiqueta.

## Definición de terminado

- [ ] Ingesta reproducible.
- [ ] Agregados.
- [ ] Procedencia.
- [ ] Missing/stale.
