# Constitución — Automatic

Principios innegociables. Toda spec, plan y tarea debe cumplirlos.

1. **Recorrido vertical primero**: una parcela, una comparación y dos escenarios. Nada se construye si no aparece en el guion de demo.
2. **La spec manda**: sin spec activa no hay código. Si falta una decisión, se para y se pregunta; el cambio se escribe primero en la spec.
3. **Números deterministas**: todo cálculo agronómico/económico vive en funciones puras versionadas. El LLM no calcula ni inventa cifras.
4. **Sin datos ≠ cero**: usar `null`, `unknown`, `not_measured`, `not_applicable`. La UI distingue medido / estimado / supuesto / simulado.
5. **Contratos primero**: OpenAPI, Pydantic y Zod. `/api/v1`; cambios incompatibles requieren spec, migración y versión.
6. **Autorización por parcela y secreto por defecto**: cada consulta y tool se filtra por el usuario autenticado. Secretos solo en el `.env` raíz o en el servidor; nunca en `EXPO_PUBLIC_*`. Datos de los 100 agricultores con consentimiento, minimización y borrado/exportación.
7. **Tests como puerta**: unitarios (pytest/Jest/RNTL), integración, contrato/paridad y E2E Maestro del recorrido demo. Rojo no se mergea; lo que no se automatiza tiene checklist manual.
8. **Idioma, unidades y licencia**: código y DB en inglés; UI y docs en español. mm, m³/ha, kg/ha, PEN, WGS84, fechas `America/Lima`. Código MIT; datos con atribución y licencia; uso gratuito para agricultores.
