# Spec 020 — Tools del agente

| Campo | Valor |
|---|---|
| ID | 020 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 017, 018, 019 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El agente solo puede actuar mediante herramientas tipadas. Cada tool lee datos autorizados, aplica el motor y devuelve evidencia; ninguna ejecuta SQL/URLs libres. Esto separa el LLM de las cifras y permite testear el agente sin red.

## Usuarios / actores

- Agente.
- Agricultor.
- QA/seguridad.

## Historias de usuario

- H1: Como agente, quiero tools con esquemas claros.
- H2: Como agricultor, quiero que solo vean mi parcela.
- H3: Como QA, quiero probar tools con datos fake.

## Requisitos funcionales (EARS)

- **RF-020.1:** EL SISTEMA registra tools en una allowlist con nombre, esquema y timeout.
- **RF-020.2:** EL SISTEMA valida entrada/salida con Pydantic y rechaza campos extra.
- **RF-020.3:** EL SISTEMA verifica `user_id`/`parcel_id` dentro de cada tool.
- **RF-020.4:** SI una tool excede timeout o falla, ENTONCES EL SISTEMA devuelve error tipado, no excepción cruda.
- **RF-020.5:** EL SISTEMA prohíbe parámetros de SQL, URL arbitraria o código.
- **RF-020.6:** EL SISTEMA ofrece resultados fake deterministas para tests.
- **RF-020.7:** EL SISTEMA expone un `tool_trace` seguro (nombre, estado, resumen).
- **RF-020.8:** EL SISTEMA mapea errores a `upstream_unavailable`/`insufficient_data`/`not_found`.

## Requisitos no funcionales

- Tool < 2 s salvo comparación (< 5 s).
- Sin secretos en argumentos.
- Logs sin PII.
- 100 usuarios; rate limit.
- Testeable sin LLM.

## Casos límite

- Parcela ajena → 404.
- Timeout → error tipado + warning.
- Tool desconocida → rechazo.
- Payload extra → 422.
- NASA/LLM caído → fallback.
- Doble llamada → idempotencia de lectura.

## Fuera de alcance

- Tools de escritura directa.
- SQL libre.
- Navegador/HTTP arbitrary.

## Criterios de finalización

- 6 tools.
- Esquemas y auth.
- Fake.
- Tests.

## Matriz de pruebas

| RF | Test |
|---|---|
| 020.1 | U: registry |
| 020.2 | U: schemas |
| 020.3 | U: IDOR |
| 020.4 | U: timeout |
| 020.5 | U: allowlist |
| 020.6 | U: fake |
| 020.7 | U: trace |
| 020.8 | U: errores |
