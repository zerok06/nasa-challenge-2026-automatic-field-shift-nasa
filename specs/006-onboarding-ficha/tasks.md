# Tasks 006 — Onboarding y ficha

- [ ] **T1 — Schema y estado del onboarding**
  - RF: 006.1, 006.2
  - Zod, `useReducer`, unknowns.
  - Hecho cuando: tests de “No sé” y validación.

- [ ] **T2 — Paso 1: parcela**
  - RF: 006.1
  - Nombre, punto, superficie opcional.
  - Hecho cuando: crea parcela con área null.

- [ ] **T3 — Paso 2: historial**
  - RF: 006.1
  - Cultivo, familia, fechas aproximadas.
  - Hecho cuando: guarda y muestra.

- [ ] **T4 — Paso 3: agua y suelo**
  - RF: 006.2
  - Método, volumen, textura, análisis.
  - Hecho cuando: guarda unknowns sin convertir turnos.

- [ ] **T5 — Paso 4: prioridades**
  - RF: 006.3
  - Pesos visibles; default iguales.
  - Hecho cuando: suma normalizada y editable.

- [ ] **T6 — Paso 5: consentimiento y resumen**
  - RF: 006.6, 006.7
  - Ficha + badges + faltantes.
  - Hecho cuando: sin consentimiento no guarda.

- [ ] **T7 — Persistencia y errores**
  - RF: 006.4, 006.5
  - Reintento, borrador, idempotencia.
  - Hecho cuando: API caída conserva datos.

- [ ] **T8 — Maestro**
  - RF: 006.8
  - `01-onboarding.yaml`.
  - Hecho cuando: verde en APK.

- [ ] **T9 — Accesibilidad**
  - RF: 006.1
  - Labels, 44 px, font scale.
  - Hecho cuando: checklist.

## Definición de terminado

- [ ] Onboarding 5 pasos.
- [ ] Unknowns y completitud.
- [ ] Ficha.
- [ ] Maestro verde.
