# Plan 022 — Chat, UI actions y guardado

## Pantalla

`app/(tabs)/agent.tsx`:

```text
Header: parcela + modo (Groq/guiado)
MessageList: texto, tool cards, evidencia
Chips: "Ver parcela", "Comparar", "Simular agua", "¿Por qué?"
Input + send
ActionBar: abrir comparación, mapa, fuentes
SaveSheet: preview + confirmar/rechazar
```

## API

- `POST /agent/threads` → thread.
- `POST /agent/threads/{id}/messages` → `answer`, `tool_trace`, `evidence_refs`, `ui_actions`, `warnings`.
- `POST /actions/{id}/confirm` → `confirmed`/`rejected`.
- `GET /saved-plans` / `POST /saved-plans`.

## UI actions

```ts
type UiAction =
  | {action:"open_comparison"; payload:{comparison_id:string}}
  | {action:"open_scenario"; payload:{comparison_id:string}}
  | {action:"show_sources"; payload:{snapshot_id:string}}
  | {action:"save_plan_draft"; payload:{plan_id:string}};
```

- Zod valida; desconocida → ignorar.
- No URLs ni navegación arbitraria.

## Guardado

- `propose_save_plan` → `action_proposals(pending, expires_at, idempotency_key)`.
- UI muestra nombre, plan, supuestos, advertencias.
- Confirmar → `POST /actions/{id}/confirm` → `saved_decisions(draft)`.
- Rechazar → `rejected`, sin escritura.
- Doble tap → misma respuesta.

## Tool trace

- Card por tool: nombre, estado, latencia, resumen.
- Sin argumentos sensibles.
- Enlace a fuentes.

## Fallback

- Sin LLM/red: “Modo guiado”; chips y plantillas.
- Sin tools: respuesta “no disponible” + qué falta.

## Cobertura RF

| RF | Archivo |
|---|---|
| 022.1 | `app/(tabs)/agent.tsx` |
| 022.2 | `ToolTraceCard.tsx` |
| 022.3 | `uiActions.ts` |
| 022.4 | `SaveSheet.tsx` |
| 022.5 | `confirm` |
| 022.6 | `api/v1/actions.py` |
| 022.7 | `saved-plans.tsx` |
| 022.8 | `.maestro/flows/05-agent-save.yaml` |

## Tests

- Unit: enum, preview, rechazo.
- Integration: proposal/confirm idempotente.
- E2E: preguntar/guardar/rechazar.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Acción arbitraria | enum + Zod |
| Guardado sin querer | confirmación |
| Doble escritura | idempotencia |
| Trace con PII | resumen |
