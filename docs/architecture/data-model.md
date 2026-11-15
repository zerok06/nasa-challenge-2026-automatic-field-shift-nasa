# Modelo de datos canónico

## Principios

- Geometría en **WGS84 (EPSG:4326)**; áreas con `ST_Area(geography)`.
- Fechas de calendario en `America/Lima` (UTC-5, sin DST); timestamps en UTC.
- Unidades canónicas: `mm`, `m³/ha`, `kg/ha`, `PEN`, `ha`.
- Resultados de análisis **inmutables** y versionados (`model_version`, `catalog_version`, `snapshot_ids`).
- `null` significa “sin medición/cálculo”; nunca se convierte en 0.
- Cada tabla con `created_at`; las editables con `updated_at`.
- Toda consulta de dominio filtra por `owner_user_id`.

## Tablas

### `users`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| display_name | text | opcional |
| is_anonymous | bool | true en piloto |
| locale | text | `es-PE` |
| consent_version | text | versión aceptada |
| consent_at | timestamptz | |
| profile_json | jsonb | audio, experiencia y ubicación base |
| onboarding_completed_at | timestamptz | perfil completo |
| created_at / deleted_at | timestamptz | soft delete |

### `parcels`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| owner_user_id | UUID FK users | índice |
| name | text | |
| geom | geometry(Point/Polygon,4326) | GIST |
| area_ha | numeric(10,4) null | calculada o declarada |
| district | text null | |
| timezone | text | `America/Lima` |
| preferences_json | jsonb | pesos agua/suelo/margen, prioridades (agua/suelo/ganancia/plagas/forraje/mercado), restricciones, economía y supuestos de precio |
| terrain_json | jsonb | caché de elevación/pendiente (SRTM o Copernicus) con fuente y fecha |
| is_simulated | bool | true en demo |
| created_at / updated_at | timestamptz | |

### `parcel_crop_history`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| parcel_id | UUID FK | índice |
| crop_id | text null | catálogo |
| family | text null | |
| date_start / date_end | date null | |
| notes | text null | |
| source | text | `farmer`/`demo` |

### `water_availability`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| parcel_id | UUID FK | |
| start_at / end_at | date | |
| volume_m3 | numeric null | |
| mm | numeric null | derivado si hay área |
| method | text | `meter`/`turn`/`estimate`/`unknown` |
| efficiency | numeric null | (0,1] |
| confidence | text | `high`/`medium`/`low`/`unknown` |
| notes | text null | |

### `soil_observations`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| parcel_id | UUID FK | |
| variable | text | `texture`/`ph`/`organic_matter`/`n`/`p`/`k` |
| value | numeric null | |
| unit | text null | |
| observed_at | date null | |
| method | text null | `lab`/`reported`/`unknown` |
| source | text null | |
| notes | text null | |

### `crops`

| Campo | Tipo | Nota |
|---|---|---|
| id | text PK | `onion`, `pumpkin`, `chili` |
| local_name / scientific_name | text | |
| family | text | |
| catalog_version | text | |
| duration_days | int | |
| windows_json | jsonb | ventanas de siembra |
| kc_json | jsonb | etapas y Kc |
| risks_json | jsonb | helada, agua, familia |
| source_refs | jsonb | fuentes |
| review_status | text | `approved`/`needs_review` |

### `data_sources`

| Campo | Tipo | Nota |
|---|---|---|
| id | text PK | `nasa_power`, `nasa_gibs`, `nasa_imerg` |
| provider | text | NASA |
| dataset | text | |
| product_version | text | |
| spatial_resolution | text | |
| temporal_resolution | text | |
| license | text | |
| url | text | |

### `dataset_snapshots`

| Campo | Tipo | Nota |
|---|---|---|
| id | text PK | `power_moquegua_2024_v1` |
| source_id | text FK | |
| bbox | jsonb | |
| period_start / period_end | date | |
| retrieved_at | timestamptz | |
| object_path | text | archivo o imagen |
| checksum | text | |
| missing_pct | numeric | |
| method | text | |
| metadata_json | jsonb | parámetros, unidades, notas |

### `parcel_indicators`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| parcel_id | UUID FK | |
| snapshot_id | text FK | |
| indicator | text | `precip_mm`, `tmin_c`, `eto_mm` |
| value | numeric null | |
| unit | text | |
| time_start / time_end | date | |
| quality_flag | text | ver enums |
| method | text | |

### `rotation_plans`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| parcel_id | UUID FK | |
| analysis_run_id | UUID FK | |
| label | text | “Actual”, “Alternativa B” |
| kind | text | `existing`/`candidate` |
| horizon_start / horizon_end | date | mismo horizonte |
| status | text | ver enums |
| version | int | |
| assumptions_json | jsonb | |

### `rotation_plan_steps`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| plan_id | UUID FK | |
| crop_id | text FK | |
| sowing_date / harvest_date | date | |
| ordinal | int | |

### `analysis_runs`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| parcel_id | UUID FK | |
| kind | text | `comparison`/`scenario` |
| model_version | text | `rotation-engine-v0.1` |
| catalog_version | text | |
| inputs_json | jsonb | parámetros y supuestos |
| snapshot_ids | jsonb | |
| status | text | ver enums |
| results_json | jsonb | contrato de comparación |
| warnings_json | jsonb | |
| parent_run_id | UUID null | escenario → baseline |
| created_at | timestamptz | |

### `agent_threads`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| owner_user_id | UUID FK | |
| parcel_id | UUID FK | |
| graph_thread_id | text | LangGraph |
| created_at / last_message_at | timestamptz | |

### `action_proposals`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| owner_user_id | UUID FK | |
| parcel_id | UUID FK | |
| type | text | `save_plan`/`update_parcel` |
| payload_json | jsonb | |
| status | text | ver enums |
| idempotency_key | text unique | |
| expires_at | timestamptz | |
| created_at | timestamptz | |

### `saved_decisions`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| parcel_id | UUID FK | |
| rotation_plan_id | UUID FK | |
| analysis_run_id | UUID FK | |
| name | text | |
| status | text | `draft`/`reviewed`/`archived` |
| created_at | timestamptz | |

### `campaign_records` (P2)

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| parcel_id | UUID FK | |
| crop_id | text | |
| sowing_date / harvest_date | date | |
| water_applied_m3 | numeric null | |
| yield_kg | numeric null | |
| price_pen_kg | numeric null | |
| notes | text null | |
| consent_aggregate | bool | uso agregado |
| created_at | timestamptz | |

Se implementa en la spec 026; no afecta al MVP P0. No se autoentrena ni se predicen precios.

### `audit_events`

| Campo | Tipo | Nota |
|---|---|---|
| id | UUID PK | |
| user_id | UUID | |
| entity / entity_id | text | |
| action | text | |
| payload_json | jsonb | sin PII sensible |
| created_at | timestamptz | |

## Enums canónicos

```text
analysis_run.status: queued | running | completed | failed | partial
rotation_plan.status: draft | eligible | needs_review | invalid | saved
proposal.status: pending | confirmed | rejected | expired
saved_decision.status: draft | reviewed | archived
quality_flag: measured | reported | estimated | modeled | satellite_estimate |
              simulated | stale | missing
fertility_status: not_measured | declared | measured
```

## Índices

- `parcels(owner_user_id)`, GIST `parcels(geom)`.
- `parcel_crop_history(parcel_id, date_start)`.
- `analysis_runs(parcel_id, created_at desc)`.
- `rotation_plans(analysis_run_id)`.
- `agent_threads(owner_user_id, parcel_id)`.
- `action_proposals(idempotency_key)` unique.
- `audit_events(created_at)`.

## Acceso y privacidad

- Repositorios reciben `user_id` y filtran; no hay consulta “global”.
- `GET` de parcela ajena → 404, no 403.
- Exportación/borrado: `deleted_at` + job de limpieza (P1).
- Logs sin PII; solo IDs y códigos.
