# Tasks 014 — Motor hídrico

- [ ] **T1 — Contratos**
  - RF: 014.4, 014.6
  - `WaterInput/Result`, `method_version`.
  - Hecho cuando: schemas y validación.

- [ ] **T2 — ETc**
  - RF: 014.1
  - Kc/ETo, prorrateo.
  - Hecho cuando: fixture 01.

- [ ] **T3 — Lluvia efectiva**
  - RF: 014.2
  - Método documentado.
  - Hecho cuando: test numérico + supuesto.

- [ ] **T4 — Balance**
  - RF: 014.3, 014.5, 014.8
  - Neto/bruto/déficit/factibilidad.
  - Hecho cuando: fixtures 02–05.

- [ ] **T5 — Paridad**
  - RF: 014.7
  - Misma lógica TS; tolerancia.
  - Hecho cuando: pytest+Jest verdes.

- [ ] **T6 — Integración**
  - RF: 014.1–014.8
  - `evaluate_plan` + assumptions.
  - Hecho cuando: comparación usa el motor.

## Definición de terminado

- [ ] Fórmulas.
- [ ] Nulls.
- [ ] Fixtures.
- [ ] Integración.
