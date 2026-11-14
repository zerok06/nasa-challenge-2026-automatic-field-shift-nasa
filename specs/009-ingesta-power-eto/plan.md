# Plan 009 — Ingesta POWER + ETo

## Endpoint POWER

```text
GET https://power.larc.nasa.gov/api/temporal/daily/point
  ?parameters=T2M,T2M_MAX,T2M_MIN,RH2M,WS2M,ALLSKY_SFC_SW_DWN,PRECTOTCORR
  &community=AG
  &longitude={lon}&latitude={lat}
  &start={YYYYMMDD}&end={YYYYMMDD}
  &format=JSON
```

- Sin key.
- `header.fill_value = -999`.
- `time_standard = LST`; documentar.

## Normalización

```python
def normalize(raw: dict) -> list[DailyRecord]:
    # -999 -> None
    # unidades: C, %, m/s, MJ/m2/day, mm/day
    # validar Tmin <= Tmax; RH 0..100; WS >=0; Rs >=0
```

## ETo

### FAO-56

Implementar `eto_fao56(tmax,tmin,rh,ws,rs,lat,elev,date)` según FAO-56 cap. 4.

- `Rs` de MJ/m²/día; convertir a mm/día si la fórmula lo requiere.
- `u2` a 2 m; si el viento viene a otra altura, corregir.
- `elev` de POWER geometry (metros).
- Resultado `mm/día`; null si faltan variables.

### Hargreaves

```text
ETo = 0.0023 * (Tmean + 17.8) * sqrt(Tmax - Tmin) * Ra
```

- `Ra` por latitud/día.
- `method="hargreaves"`, `quality_flag="estimated"`.

## Snapshot

`datasets/snapshots/power_moquegua_2024_v1.json`:

```json
{
  "snapshot_id": "power_moquegua_2024_v1",
  "source": "NASA POWER",
  "product": "MERRA-2 / POWER Daily",
  "version": "v2.10.3",
  "bbox": [-70.94, -17.20, -70.92, -17.18],
  "period": {"start": "2024-01-01", "end": "2024-12-31"},
  "retrieved_at": "2026-11-14T00:00:00Z",
  "checksum": "sha256:...",
  "missing_pct": 0.0,
  "method": "fao56",
  "records": [{"date": "2024-01-01", "tmin_c": 4.55, "tmax_c": 17.14, "eto_mm": 3.1}]
}
```

- `checksum` del archivo canónico.
- `missing_pct` por variable.
- `quality_flag`: `modeled_reanalysis`.

## Cache

- Tabla `dataset_snapshots` + archivo.
- TTL `POWER_CACHE_TTL_HOURS` (default 24).
- Si TTL vencido: `stale`; no borrar.
- API lee snapshot; no llama POWER en request.

## CLI

```bash
python -m app.ingest power --lat -17.19 --lon -70.93 \
  --start 2024-01-01 --end 2024-12-31 --out datasets/snapshots
```

- Idempotente por `snapshot_id`.
- `--verify` valida checksum/rangos.

## Cobertura RF

| RF | Archivo |
|---|---|
| 009.1 | `integrations/power.py` |
| 009.2 | `normalize.py` |
| 009.3 | `water_engine/eto.py` |
| 009.4 | `eto.py` fallback |
| 009.5 | `snapshot.py` |
| 009.6 | `repositories/snapshots.py` |
| 009.7 | `ingest/cli.py` |
| 009.8 | `tests/fixtures/eto_fao.json` |

## Tests

- FAO ejemplo numérico (tolerancia 0.1 mm/día).
- `-999` → null.
- Hargreaves.
- Snapshot idempotente/checksum.
- Stale.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| ETo mal calculada | fixture FAO + revisión |
| POWER latencia/cobertura | snapshot + stale |
| `-999` como 0 | test |
| Altura de viento | corregir/documentar |
