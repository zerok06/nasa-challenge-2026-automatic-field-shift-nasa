# Plan 007 — Historial, agua y suelo

## Modelos

Según `docs/architecture/data-model.md`: `parcel_crop_history`, `water_availability`, `soil_observations`.

## Endpoints

| Método | Ruta |
|---|---|
| GET/POST | `/parcels/{id}/crop-history` |
| PATCH/DELETE | `/parcels/{id}/crop-history/{hid}` |
| GET/POST | `/parcels/{id}/water` |
| PATCH/DELETE | `/parcels/{id}/water/{wid}` |
| GET/POST | `/parcels/{id}/soil` |
| PATCH/DELETE | `/parcels/{id}/soil/{sid}` |
| GET | `/parcels/{id}/context` |

## Reglas

- Agua:
  - `volume_m3` y `mm` mutuamente excluyentes; si hay área, derivar el otro.
  - `method`: `meter`/`turn`/`estimate`/`unknown`.
  - `efficiency` en (0,1].
  - Turno sin caudal → `unknown`, no volumen.
- Suelo:
  - `variable` enum; `unit` obligatoria si valor.
  - `method`: `lab`/`reported`/`unknown`.
  - Sin análisis → `fertility_status=not_measured`.
- Historial:
  - `crop_id` del catálogo o texto libre; `family` si se conoce.
  - Fechas aproximadas permitidas; solapamiento warning.

## Context service

```python
def build_context(parcel, history, water, soil) -> dict:
    return {
      "parcel": ...,
      "history": ...,
      "water": {"available_mm": ..., "missing_inputs": [...]},
      "soil": {"fertility_status": "not_measured", "observations": [...]},
      "missing_inputs": [...],
      "quality_flags": [...]
    }
```

- No calcula ETc ni margen (eso es 014/015).
- Solo normaliza y marca faltantes.

## UI

- Ficha con secciones: Historial, Agua, Suelo.
- Editar/agregar con formularios cortos; “No sé”.
- Badges: `REPORTADO`, `MEDIDO`, `NO DISPONIBLE`.
- `testID`: `parcel.history.add`, `parcel.water.add`, `parcel.soil.add`.

## Cobertura RF

| RF | Archivo |
|---|---|
| 007.1 | `api/v1/crop_history.py` |
| 007.2 | `api/v1/water.py`, `services/water.py` |
| 007.3 | `api/v1/soil.py` |
| 007.4 | `services/units.py` |
| 007.5 | `services/water.py` |
| 007.6 | `services/context.py` |
| 007.7 | `app/parcel/[id].tsx` |
| 007.8 | `soil` schema/UI |

## Tests

- Unit: conversiones, validaciones, unknown.
- Integration: CRUD, context, IDOR.
- E2E: ficha con “fertilidad por verificar”.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Convertir turnos sin caudal | bloqueo + test |
| Unidades mezcladas | canónicas + validación |
| Datos reales en demo | seed sintético |
