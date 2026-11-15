# Plan 031 — Ficha de parcela

## Enfoque

1. Extender `PreferencesIn` con `priorities` y validar pesos/prioridades.
2. Cambiar `PATCH /parcels/{id}` a merge de preferencias para no perder economía.
3. Agregar tipos y endpoints de app para catálogo, historial, agua, suelo y preferencias.
4. Crear `profileStatus` para calcular progreso y faltantes de la ficha.
5. Crear `ParcelProfileScreen` con 5 pasos y guardado por paso.
6. Agregar tarjetas de entrada en Inicio y Mi parcela.
7. Aplicar paleta verde/marrón y una ilustración SVG por paso.
8. Cerrar con tests, bundle Android y Maestro.

## Fases

| Fase | Alcance | Evidencia |
|---|---|---|
| 0 | `PreferencesIn`, merge, tests backend | `test_parcel_profile.py` |
| 1 | Tipos/API de app, progreso | typecheck |
| 2 | Ficha 5 pasos: historial, agua, suelo, prioridades, resumen | Maestro `09` |
| 3 | Tarjetas en Inicio/Mi parcela | prueba manual |
| 4 | Paleta verde/marrón + SVG | capturas + lint |
| 5 | Deploy GCP y verificación de prioridades | OpenAPI + PATCH real |
| 6 | Maestro y QA visual | pendiente |

## Archivos principales

- `backend/app/schemas/parcel.py`
- `backend/app/api/v1/parcels.py`
- `backend/tests/integration/test_parcel_profile.py`
- `application/src/services/api/types.ts`
- `application/src/services/api/endpoints.ts`
- `application/src/features/parcel/ParcelProfileScreen.tsx`
- `application/src/features/parcel/profileStatus.ts`
- `application/src/components/app/FichaIllustration.tsx`
- `application/src/design-system/tokens.ts`
- `application/global.css`
- `application/.maestro/flows/09-ficha-parcela.yaml`

## Riesgos

- **Datos declarados:** agua, suelo e historial son del agricultor; se etiquetan como tales y no se validan solos.
- **Fechas aproximadas:** el año de campaña se guarda como intervalo anual; no es una fecha exacta.
- **Duplicados:** editar agua/suelo crea una observación nueva; el contexto usa la última. No hay PATCH por fila todavía.
- **Offline:** guardar requiere red; la ficha no se sincroniza sola.
- **Prioridades:** se guardan y se muestran, pero el motor todavía no las usa para ordenar candidatos (Spec 032).
- **Paleta:** los estados usan icono + texto, no solo color; falta QA de contraste y modo oscuro.

## Orden de merge

Backend + tests; tipos/API; pantalla; tarjetas de entrada; paleta/SVG; Maestro.
