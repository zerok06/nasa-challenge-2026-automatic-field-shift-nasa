# Validación agronómica y con agricultores

## Principio

El MVP no afirma que una rotación sea “la mejor”. Muestra alternativas comparables, evidencia y vacíos. La validación es explícita y trazable.

## Niveles

| Nivel | Qué valida | Evidencia | Si no se puede |
|---|---|---|---|
| 1. Literatura | Kc, ciclos, ventanas, familias, FAO-56 | Fuente y fecha por fila del catálogo | Marcar `needs_review` |
| 2. Revisión experta | Catálogo, supuestos de agua/economía, riesgos | Nombre/fecha del revisor; cambios aceptados | No presentar como validado |
| 3. Pruebas con agricultores | Comprensión, utilidad, etiquetas | 3–5 sesiones; tareas observadas; notas | Reportar como hipótesis |
| 4. Campo | Rendimiento, agua real, precio logrado | Registro de campaña (P2) | Fuera del MVP |

## Protocolo mínimo (1 semana)

1. **Revisión experta (1–2 h):** un agrónomo local revisa:
   - 3 cultivos: cebolla, zapallo, ají.
   - Familia, ciclo, ventana, Kc por etapa.
   - Riesgos de repetición de familia y suelo desnudo.
   - Supuestos de ETo, lluvia efectiva y eficiencia de riego.
   - Salida: `catalog_review.md` con `approved`/`needs_review` por fila.
2. **Pruebas de usabilidad (3–5 agricultores):**
   - Tarea 1: registrar parcela sin saber la superficie.
   - Tarea 2: comparar la rotación actual con dos alternativas.
   - Tarea 3: reducir agua 20 % y explicar qué cambió.
   - Tarea 4: decir qué dato falta y qué haría después.
   - Observar sin ayudar; registrar tiempo, bloqueos y frases.
3. **Cierre:** informe de 1 página con hallazgos; ajustes a la UI o a los textos, no a los números sin revisión.

## Etiquetas obligatorias

- `measured` / `reported` / `estimated` / `simulated`.
- `needs_review` en el catálogo hasta la firma experta.
- `not_measured` en fertilidad si no hay análisis.
- `historical` en precios de anuario; nunca “precio actual”.
- `hypothesis` en secuencias no revisadas.

## Prohibiciones

- No asignar dosis de fertilizante o agroquímicos.
- No diagnosticar enfermedades desde NDVI.
- No afirmar “suelo saludable” con solo vegetación.
- No garantizar rentabilidad ni rendimiento.
- No ocultar que la resolución IMERG (~11 km) es mayor que la parcela.

## Textos de demo

- “Datos de demostración; parcela sintética.”
- “Estimación satelital, no medición de campo.”
- “Hipótesis agronómica pendiente de revisión local.”
- “El agricultor decide; Automatic no prescribe.”
