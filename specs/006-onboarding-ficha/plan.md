# Plan 006 — Onboarding y ficha

## Flujo

```text
1. Parcela: nombre, punto/polígono, superficie (o No sé)
2. Historial: último cultivo, familia, fechas aproximadas
3. Agua/suelo: método, volumen (o No sé), textura, análisis (o No sé)
4. Prioridades: agua / suelo / margen (pesos)
5. Consentimiento + resumen
```

## UI

- RNUI `Wizard` o stepper propio con `ProgressBar`.
- `TextInput`, `SegmentedButtons`/chips, `Button`.
- `testID`: `onboarding.start`, `onboarding.next`, `onboarding.skip`, `onboarding.consent`, `onboarding.finish`.
- Estado local con `useReducer` + Zod; persistencia de borrador en `expo-sqlite` (P1) o memoria + reintento.
- Al guardar: `POST/PATCH /parcels`, `/crop-history`, `/water`, `/soil`.
- Idempotencia por `client_id` en el borrador.

## Completitud

```ts
type Completeness = {
  comparison: "ready" | "partial" | "blocked";
  water: "ready" | "unknown";
  margin: "ready" | "partial" | "blocked";
  missing: string[];
};
```

- Sin área → comparación parcial; sin agua → factibilidad unknown; sin precio/costo/rendimiento → margen null.
- La ficha muestra `EvidenceBadge` por dato.

## Ficha resumen

- Nombre, distrito, área (o “No disponible”), historial, agua, suelo, prioridades.
- Botones: “Comparar”, “Editar”, “Ver fuentes”.
- Etiqueta “Parcela sintética” si `is_simulated`.

## Errores

- 422 → marcar campo; no perder formulario.
- 500/red → banner + reintentar.
- 401 → refresh; si falla, sesión nueva.

## Cobertura RF

| RF | Archivo |
|---|---|
| 006.1 | `app/onboarding/` |
| 006.2 | `src/features/onboarding/schema.ts` |
| 006.3 | `src/features/onboarding/completeness.ts` |
| 006.4 | `src/features/onboarding/draft.ts` |
| 006.5 | `ErrorState`, mutation |
| 006.6 | `app/parcel/[id].tsx` |
| 006.7 | `ConsentStep` |
| 006.8 | `.maestro/flows/01-onboarding.yaml` |

## Tests

- Unit: schema, unknowns, completeness, pesos.
- E2E: flujo completo con “No sé”.
- Manual: teclado, scroll, font scale.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Formulario largo | 5 pasos, saltar opcionales |
| Pérdida de datos | borrador local + reintento |
| Unknown tratado como 0 | tests de tipos |
| Duplicados | idempotencia |
