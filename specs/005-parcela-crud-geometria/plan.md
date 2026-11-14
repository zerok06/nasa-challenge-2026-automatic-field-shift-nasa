# Plan 005 — Parcela: CRUD y geometría

## Modelo

`parcels` según `docs/architecture/data-model.md`:

- `geom geometry(Geometry,4326)` con check `ST_GeometryType IN ('POINT','POLYGON')`.
- `area_ha numeric(10,4) null`.
- `preferences_json jsonb` con esquema Pydantic:
  ```json
  {"weights":{"water":0.5,"soil":0.3,"margin":0.2},
   "constraints":{"equipment":[],"market":[],"budget_pen":null}}
  ```
- `is_simulated bool`.
- Índice GIST y `owner_user_id`.

## Endpoints

| Método | Ruta | Nota |
|---|---|---|
| GET | `/parcels` | paginado |
| POST | `/parcels` | point/polygon |
| GET | `/parcels/{id}` | 404 si ajeno |
| PATCH | `/parcels/{id}` | parcial |
| DELETE | `/parcels/{id}` | soft delete |

## Validación

- `lat` ∈ [-90,90], `lon` ∈ [-180,180].
- Polygon: cerrado, ≥3 vértices distintos, `ST_IsValid`.
- Área: `ST_Area(geography)` / 10 000.
- Si área declarada y calculada difieren >20 % → warning, no error.
- Punto → `area_ha=null` salvo declarada.
- Preferencias: pesos ≥0; suma normalizada; restricciones string.

## Repositorio

- `create`, `list_by_owner`, `get_by_owner`, `update`, `soft_delete`.
- Todas reciben `user_id`.
- `get_parcel_or_404` centralizado.

## UI

- La creación completa está en 006.
- 005 expone el endpoint y el contrato; 006 construye el formulario.
- `testID` reservados: `parcel.create`, `parcel.name`, `parcel.save`.

## Cobertura RF

| RF | Archivo |
|---|---|
| 005.1 | `schemas/parcel.py`, `api/v1/parcels.py` |
| 005.2 | `services/geo.py` |
| 005.3 | `repositories/parcels.py` |
| 005.4 | `validators/geometry.py` |
| 005.5 | `schemas/preferences.py` |
| 005.6 | `seed.py`, UI badge |
| 005.7 | paginación + 404 |
| 005.8 | `context` service |

## Tests

- Unit: geometría, área, preferencias, missing.
- Integration: CRUD, IDOR, paginación.
- Manual: punto vs polígono en mapa (012).

## Riesgos

| Riesgo | Mitigación |
|---|---|
| SRID incorrecto | validar 4326 |
| Área falsa | PostGIS + null |
| Polígono inválido | `ST_IsValid` |
| Datos reales en demo | seed sintético + flag |
