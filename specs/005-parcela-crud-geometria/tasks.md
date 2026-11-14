# Tasks 005 — Parcela: CRUD y geometría

- [ ] **T1 — Modelo y migración**
  - RF: 005.1, 005.6
  - `parcels` + PostGIS + GIST + `is_simulated`.
  - Hecho cuando: migración y `ST_IsValid` disponibles.

- [ ] **T2 — Schemas y validadores**
  - RF: 005.1, 005.4, 005.5
  - Point/Polygon, preferencias, límites.
  - Hecho cuando: tests 422 para geometría inválida.

- [ ] **T3 — Repositorio con owner**
  - RF: 005.3, 005.7
  - CRUD filtrado; soft delete; paginación.
  - Hecho cuando: IDOR → 404.

- [ ] **T4 — Endpoints**
  - RF: 005.1–005.3
  - `/parcels` y `/{id}`.
  - Hecho cuando: OpenAPI actualizado y tests verdes.

- [ ] **T5 — Área y warnings**
  - RF: 005.2, 005.8
  - `ST_Area(geography)`; discrepancia; null en punto.
  - Hecho cuando: fixture con polígono conocido.

- [ ] **T6 — Contrato para 006**
  - RF: 005.1
  - Documentar payload de creación y `testID`s reservados.
  - Hecho cuando: 006 puede construir el formulario sin cambios de API.

- [ ] **T7 — Seed demo**
  - RF: 005.6
  - `parcel_demo_01` sintética, 1.2 ha, etiquetada.
  - Hecho cuando: visible en API y UI.

## Definición de terminado

- [ ] CRUD + validaciones + área.
- [ ] IDOR/paginación.
- [ ] Contrato listo para 006.
- [ ] Seed demo.
