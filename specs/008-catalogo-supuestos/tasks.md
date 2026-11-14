# Tasks 008 — Catálogo de cultivos y supuestos

- [ ] **T1 — Modelo `crops` + migración**
  - RF: 008.1–008.3
  - Campos y JSONB.
  - Hecho cuando: migración y seed.

- [ ] **T2 — Datos iniciales**
  - RF: 008.1, 008.2
  - 3 cultivos con familia, ciclo, Kc, ventanas, fuentes.
  - Hecho cuando: validación de Kc/días.

- [ ] **T3 — `review_status`**
  - RF: 008.4, 008.8
  - `needs_review` por defecto; doc de revisión.
  - Hecho cuando: UI/API muestran estado.

- [ ] **T4 — Endpoint**
  - RF: 008.5, 008.6
  - Solo lectura; versión.
  - Hecho cuando: contrato y tests.

- [ ] **T5 — Supuestos**
  - RF: 008.7
  - ETo, lluvia efectiva, economía, fuentes.
  - Hecho cuando: doc con ejemplos.

- [ ] **T6 — Revisión experta**
  - RF: 008.8
  - Protocolo de `docs/agricultural-assumptions/validation.md`.
  - Hecho cuando: fila aprobada o marcada.

## Definición de terminado

- [ ] 3 cultivos.
- [ ] Kc/ventanas/fuentes.
- [ ] Estado de revisión.
- [ ] API y docs.
