# Plan 010 — Ingesta IMERG + procedencia

## Fuente

- NASA GPM IMERG Final (histórico) vía GES DISC.
- `earthaccess` o `requests` con Earthdata Login.
- Producto: `GPM_3IMERGDF` (diario) o `GPM_3IMERGM` (mensual), según disponibilidad.
- Resolución 0,1°.

## Flujo

```text
1. Autenticar Earthdata (env)
2. Buscar granulos por bbox/período
3. Descargar/subsetear
4. Leer precipitación (mm/día o mm/hr según producto)
5. Agregar por día/mes; calcular percentiles
6. Escribir JSON compacto + manifiesto + checksum
7. Registrar dataset_snapshot
```

## Snapshot

`datasets/snapshots/imerg_moquegua_2024_v1.json`:

```json
{
  "snapshot_id": "imerg_moquegua_2024_v1",
  "source": "NASA GPM IMERG Final",
  "product": "GPM_3IMERGDF V07",
  "resolution": "0.1 degree",
  "bbox": [-70.95, -17.25, -70.90, -17.15],
  "period": {"start": "2024-01-01", "end": "2024-12-31"},
  "retrieved_at": "2026-11-14T00:00:00Z",
  "checksum": "sha256:...",
  "missing_pct": 0.0,
  "method": "sum_daily",
  "is_simulated": false,
  "monthly": [{"month": "2024-01", "precip_mm": 12.4, "p50": 10.1, "p90": 20.3}]
}
```

- El valor `12.4` es de ejemplo; no mostrar como observado.
- `quality_flag="satellite_estimate"`.
- `missing_pct` por mes.

## Agregados

- Diario: suma de tasa × horas (si aplica).
- Mensual: suma de diarios.
- Percentiles: p10/p50/p90 sobre años disponibles.
- `method` explícito; no mezclar con POWER.

## CLI

```bash
python -m app.ingest imerg --bbox -70.95,-17.25,-70.90,-17.15 \
  --start 2024-01-01 --end 2024-12-31 --out datasets/snapshots
```

- Idempotente.
- `--verify` checksum.
- No corre en API; perfil `ingest`.

## Fallback

- Sin Earthdata/snapshot: `missing`.
- Para el mapa visual: GIBS IMERG (012) sigue disponible.
- Para números: POWER `PRECTOTCORR` como contexto alternativo, etiquetado distinto; no sustituir silenciosamente.

## Cobertura RF

| RF | Archivo |
|---|---|
| 010.1 | `integrations/imerg.py` |
| 010.2 | `normalize_imerg.py` |
| 010.3 | `aggregates.py` |
| 010.4 | `snapshot.py` |
| 010.5 | `data_sources` |
| 010.6 | `repositories/snapshots.py` |
| 010.7 | `ingest/cli.py` |
| 010.8 | `is_simulated` |

## Tests

- Fixture de grid pequeño.
- Agregados y percentiles.
- `missing`/`stale`.
- Checksum/idempotencia.
- Procedencia.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Earthdata bloqueado | snapshot temprano; GIBS/POWER |
| Unidad mm/hr vs mm/día | validar producto + test |
| 0,1° mal interpretado | warning de resolución |
| Dato sintético | flag + etiqueta |
