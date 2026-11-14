# Plan 011 — Indicadores y fuentes

## Servicio

```python
def build_indicators(parcel_id, period) -> list[Indicator]:
    # elige snapshots vigentes
    # normaliza unidades
    # calcula agregados
    # adjunta procedencia
```

- POWER: `precip_mm`, `tmin_c`, `tmax_c`, `eto_mm`.
- IMERG: `precip_mm` (si disponible; si no, POWER etiquetado distinto).
- No mezclar fuentes en un mismo indicador sin declararlo.

## Contrato

```json
{
  "parcel_id": "parcel_demo_01",
  "period": {"start": "2024-01-01", "end": "2024-12-31"},
  "indicators": [
    {
      "key": "precip_mm",
      "value": 12.4,
      "unit": "mm",
      "source": "NASA GPM IMERG Final",
      "snapshot_id": "imerg_moquegua_2024_v1",
      "resolution": "0.1 degree",
      "quality_flag": "satellite_estimate",
      "time_start": "2024-01-01",
      "time_end": "2024-12-31"
    }
  ],
  "warnings": [],
  "missing_inputs": []
}
```

- `value=null` + `quality_flag="missing"` si no hay.
- `stale` si TTL vencido.

## Fuentes

`GET /sources/{snapshot_id}`:

```json
{
  "snapshot_id": "...",
  "provider": "NASA",
  "dataset": "GPM IMERG Final",
  "product_version": "V07",
  "resolution": "0.1 degree",
  "period": {"start": "...", "end": "..."},
  "retrieved_at": "...",
  "method": "...",
  "license": "NASA open data",
  "url": "https://gpm.nasa.gov/data/imerg",
  "is_simulated": false
}
```

## UI

- `IndicatorCard`: título, valor, unidad, período, fuente, badge.
- `ProvenanceSheet`: detalle + enlace.
- `StaleBanner`.
- `testID`: `dashboard.indicator.precip`, `dashboard.sources`.

## Cobertura RF

| RF | Archivo |
|---|---|
| 011.1 | `services/indicators.py` |
| 011.2 | `schemas/indicator.py` |
| 011.3 | `indicators.py` null |
| 011.4 | `api/v1/indicators.py` |
| 011.5 | `api/v1/sources.py` |
| 011.6 | `src/features/dashboard/IndicatorCard.tsx` |
| 011.7 | `StaleBanner` |
| 011.8 | `.maestro/flows/01-onboarding.yaml` |

## Tests

- Unit: agregados, null, stale.
- Contract: indicadores/sources.
- E2E: tarjeta con fuente.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Mezclar POWER/IMERG | fuente por indicador |
| Cero por faltante | null + test |
| Resolución oculta | mostrar siempre |
| Snapshot viejo | stale visible |
