# Plan 024 — Multi-parcela (P2)

## API

- `GET /parcels` ya paginado.
- `PATCH /parcels/{id}` con `archived_at`.
- `GET /me` incluye `active_parcel_id` o preferencia local.

## UI

- `ParcelSwitcher` en header.
- `ParcelListScreen`.
- Zustand `activeParcelId` persistido en SecureStore/SQLite.
- Invalidar queries al cambiar.

## Aislamiento

- Query keys incluyen `parcel_id`.
- Cache offline por parcela.
- Comparaciones/escenarios atados a parcela.

## Tests

- Unit: selector, cache keys.
- Integration: aislamiento.
- E2E: crear 2, cambiar, ver datos distintos.

## Cobertura RF

| RF | Archivo |
|---|---|
| 024.1 | `ParcelListScreen` |
| 024.2 | `ParcelSwitcher` |
| 024.3 | repos/query keys |
| 024.4 | onboarding |
| 024.5 | cache |
| 024.6 | header |
| 024.7 | soft delete |
| 024.8 | Maestro |

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Mezclar datos | query keys + tests |
| UI compleja | selector simple |
| P2 | no bloquear P0 |
