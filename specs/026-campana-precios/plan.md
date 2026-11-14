# Plan 026 — Campaña y precios (P2)

## Modelo

`campaign_records` (nueva, P2):

| Campo | Tipo |
|---|---|
| id | UUID |
| parcel_id | UUID |
| crop_id | text |
| sowing_date / harvest_date | date |
| water_applied_m3 | numeric null |
| yield_kg | numeric null |
| price_pen_kg | numeric null |
| notes | text |
| consent_aggregate | bool |
| created_at | timestamptz |

## Comparación

```text
error_yield = (observado - estimado) / estimado
error_margin = observado - estimado
```

- Si falta estimado/observado → null.
- Mostrar “error” no “precisión”.
- No calibrar automáticamente.

## Privacidad

- Owner-only.
- `consent_aggregate` para uso agregado.
- Export CSV/JSON; delete.
- No publicar datos individuales.

## UI

- Formulario corto.
- Tarjeta “Estimado vs observado”.
- `testID`: `campaign.add`, `campaign.compare`.

## Cobertura RF

| RF | Archivo |
|---|---|
| 026.1 | `api/v1/campaigns.py` |
| 026.2 | `services/campaign_compare.py` |
| 026.3 | UI |
| 026.4 | consent |
| 026.5 | no job |
| 026.6 | export/delete |
| 026.7 | labels |
| 026.8 | tests |

## Tests

- Unit: error, null, etiquetas.
- Integration: CRUD/export/delete.
- Manual: consentimiento.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Datos sensibles | owner + consentimiento |
| Sobreinterpretar error | copy |
| Auto-entrenamiento | prohibido |
| P2 | no bloquear |
