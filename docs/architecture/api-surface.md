# Superficie de API canónica

Base: `/api/v1` · JSON UTF-8 · Bearer JWT · `X-Request-ID` · `Idempotency-Key` en escrituras.

## Errores

```json
{
  "error": {
    "code": "insufficient_data",
    "message": "Falta el agua disponible para confirmar suficiencia.",
    "details": {"missing_inputs": ["water_volume"]},
    "request_id": "..."
  }
}
```

| Código | HTTP | Uso |
|---|---|---|
| `validation_error` | 422 | payload inválido |
| `unauthorized` | 401 | token ausente/vencido |
| `not_found` | 404 | recurso o parcela ajena |
| `conflict` | 409 | idempotencia/estado |
| `insufficient_data` | 200/422 | análisis parcial; se devuelve resultado con warnings |
| `upstream_unavailable` | 503 | NASA/LLM sin datos |
| `rate_limited` | 429 | límite |
| `internal_error` | 500 | inesperado |

## Auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/anonymous` | crea usuario anónimo + JWT |
| GET | `/auth/me` | perfil, locale, consentimiento y onboarding |
| PATCH | `/auth/me` | actualiza nombre, locale, `profile_json` y consentimiento |
| GET | `/me` | perfil, consentimiento |
| POST | `/auth/refresh` | renueva token |
| POST | `/auth/upgrade` | P2: vincular email |

## Parcelas

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/parcels` | lista propia |
| POST | `/parcels` | crear (punto/polígono, área opcional) |
| GET | `/parcels/{id}` | detalle |
| PATCH | `/parcels/{id}` | editar; `preferences` se mergea (prioridades, restricciones, economía) |
| DELETE | `/parcels/{id}` | soft delete |
| GET | `/parcels/{id}/context` | ficha + clima + suelo + faltantes |
| GET | `/parcels/{id}/irrigation` | pronóstico Open-Meteo 7 días + SRTM + agua declarada |

## Historial, agua y suelo

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/parcels/{id}/crop-history` | campañas |
| GET/POST | `/parcels/{id}/water` | disponibilidad |
| GET/POST | `/parcels/{id}/soil` | observaciones |

## Catálogo y datos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/catalog/crops` | catálogo versionado + `review_status` |
| GET | `/parcels/{id}/indicators` | lluvia, temperatura, ETo |
| GET | `/parcels/{id}/layers` | capas disponibles + metadatos |
| GET | `/parcels/{id}/layers/{layer_id}/stats` | estadísticas y calidad |
| GET | `/sources/{snapshot_id}` | procedencia |

## Análisis

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/comparisons` | genera 3 planes y compara |
| GET | `/comparisons/{id}` | resultado versionado |
| POST | `/comparisons/{id}/simulate` | escenario agua/precio |
| GET | `/comparisons/{id}/scenarios` | P2: historial |

**Contrato de comparación:** `comparison_id`, `parcel_id`, `analysis_period`, `plans[]`, `source_snapshots[]`, `model_version`, `catalog_version`, `scenario_type`, `warnings[]`, `disclaimer`. Cada plan incluye `water`, `soil`, `economics`, `risk_flags`, `missing_inputs`, `evidence_level`.

## Agente

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/agent/threads` | crea hilo por parcela |
| POST | `/agent/threads/{id}/messages` | turno; devuelve respuesta + `tool_trace` + `ui_actions` |
| GET | `/agent/threads/{id}` | historial seguro |
| POST | `/actions/{proposal_id}/confirm` | confirma/rechaza acción |

## Planes guardados

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/saved-plans` | lista propia |
| POST | `/saved-plans` | guarda con confirmación |
| GET | `/saved-plans/{id}` | detalle |

## Salud

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | liveness, sin DB |
| GET | `/ready` | DB + migraciones + snapshots |

## P2 (no MVP)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/agent/transcribe` | audio → texto (Groq Whisper), consentimiento |
| GET/POST | `/campaigns` | registro de campaña real |
| GET | `/campaigns/{id}` | detalle estimado vs observado |
| GET | `/campaigns/export` | exportación del agricultor |

## Convenciones

- Listas: `limit` (default 20, max 100) y `cursor`.
- Escrituras: `Idempotency-Key` obligatorio en comparaciones, escenarios, guardado y confirmación.
- Fechas: `YYYY-MM-DD`; timestamps ISO-8601 UTC.
- Unidades en el nombre o en un objeto `unit`; nunca implícitas.
- Nada de `user_id` en el body como autoridad; sale del JWT.
- CORS: orígenes de Expo dev + túnel; sin `*` en demo compartido.
- Rate limit: login 5/min; agente 20/min; comparaciones 10/min por usuario.

## Ejemplo de comparación (recortado)

```json
{
  "comparison_id": "cmp_demo_001",
  "parcel_id": "parcel_demo_01",
  "analysis_period": {"start": "2027-01-01", "end": "2027-12-31"},
  "plans": [
    {
      "plan_id": "existing",
      "label": "Rotación actual",
      "crop_sequence": ["onion", "pumpkin"],
      "water": {"net_irrigation_mm": null, "feasibility": "unknown"},
      "soil": {"fertility_status": "not_measured", "risk_flags": []},
      "economics": {"margin_pen": null, "confidence": "insufficient_inputs"},
      "missing_inputs": ["water_volume", "crop_yield", "crop_cost"],
      "status": "needs_review"
    }
  ],
  "source_snapshots": ["power_moquegua_2024_v1"],
  "model_version": "rotation-engine-v0.1",
  "scenario_type": "baseline",
  "is_simulated": true,
  "disclaimer": "Ejemplo de contrato; no es una recomendación real"
}
```
