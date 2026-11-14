# Plan 008 — Catálogo de cultivos y supuestos

## Datos

`crops` con `kc_json`:

```json
{
  "stages": [
    {"name": "initial", "days": 20, "kc": 0.7},
    {"name": "development", "days": 30, "kc": 0.85},
    {"name": "mid", "days": 40, "kc": 1.05},
    {"name": "late", "days": 20, "kc": 0.9}
  ]
}
```

Ventanas:

```json
{"sowing": [{"start": "2027-08-01", "end": "2027-10-15"}], "notes": "..."}
```

## Cultivos iniciales (hipótesis)

| ID | Nombre | Familia | Ciclo | Estado |
|---|---|---|---|---|
| `onion` | Cebolla | Amaryllidaceae | 110–150 d | `needs_review` |
| `pumpkin` | Zapallo | Cucurbitaceae | 90–120 d | `needs_review` |
| `chili` | Ají | Solanaceae | 120–150 d | `needs_review` |

- Kc y ventanas se completan con FAO-56 y referencias locales.
- No afirmar que son los cultivos principales de Moquegua sin fuente.

## API

`GET /catalog/crops` → `{catalog_version, review_status, crops[]}`.

- `region` y `season` opcionales.
- Solo lectura; no POST/PATCH en MVP.
- IDs estables; nombres localizados.

## Revisión

- `docs/agricultural-assumptions/catalog_review.md`:
  - fila por cultivo, revisor, fecha, decisión (`approved`/`needs_review`), cambios.
- Sin firma: `needs_review` y UI “Hipótesis pendiente de revisión local”.

## Cobertura RF

| RF | Archivo |
|---|---|
| 008.1 | `datasets/demo/crops.json`, `crops` |
| 008.2 | `schemas/crop.py` |
| 008.3 | `source_refs`, `risks_json` |
| 008.4 | `review_status` |
| 008.5 | `api/v1/catalog.py` |
| 008.6 | endpoint solo lectura |
| 008.7 | `docs/agricultural-assumptions/` |
| 008.8 | `catalog_review.md` |

## Tests

- Unit: Kc suma/días, ventanas, review.
- Contract: endpoint.
- Manual: revisión experta.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Cultivos no representativos | revisión local + `needs_review` |
| Kc incorrecto | fuente FAO + test |
| LLM inventa cultivo | catálogo cerrado |
