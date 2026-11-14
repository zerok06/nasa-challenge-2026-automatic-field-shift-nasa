# Spec 002 — Contratos y esqueleto API

| Campo | Valor |
|---|---|
| ID | 002 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 001 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

Antes de implementar dominio, la API necesita forma: versión, errores, `request_id`, settings, OpenAPI y tipos compartidos. Esto evita que mobile y backend se desincronicen y que los secretos se filtren. Es la base de los 100 agricultores y del agente.

## Usuarios / actores

- Dev backend, dev mobile, QA, agentes.
- Jueces que revisan el repo.

## Historias de usuario

- H1: Como dev mobile, quiero tipos generados para no adivinar payloads.
- H2: Como QA, quiero errores consistentes para testear.
- H3: Como mantenedor, quiero que el contrato no derive sin aviso.

## Requisitos funcionales (EARS)

- **RF-002.1:** EL SISTEMA expone `/api/v1/health` y `/api/v1/ready` con el envelope estándar.
- **RF-002.2:** SI ocurre un error, ENTONCES EL SISTEMA responde `{error:{code,message,details,request_id}}` con HTTP coherente.
- **RF-002.3:** CUANDO llega una petición, EL SISTEMA propaga o genera `X-Request-ID` y lo incluye en logs y errores.
- **RF-002.4:** EL SISTEMA carga settings desde el `.env` raíz; si falta una variable obligatoria, falla al iniciar sin imprimir valores.
- **RF-002.5:** EL SISTEMA publica OpenAPI en `/api/v1/openapi.json` y versiona `contracts/openapi.json`; CI falla si hay drift.
- **RF-002.6:** EL SISTEMA genera tipos TypeScript desde OpenAPI y el cliente mobile compila contra ellos.
- **RF-002.7:** EL SISTEMA configura CORS por entorno; en demo no usa `*`.
- **RF-002.8:** EL SISTEMA incluye una colección Postman con health y requests placeholder, y environments `local`/`tunnel`.
- **RF-002.9:** EL SISTEMA limita body a 1 MB y aplica rate limit base; responde 413/429 con el envelope.

## Requisitos no funcionales

- p95 health < 200 ms local.
- JSON UTF-8; fechas ISO-8601.
- `/api/v1`; cambios incompatibles → nueva versión.
- Logs estructurados sin secretos ni PII.
- Tipado estricto Pydantic/TypeScript.

## Casos límite

- JSON inválido → 422 con detalle.
- `Content-Type` no soportado → 415.
- `X-Request-ID` inválido → generar uno nuevo.
- CORS preflight → 204.
- Body > 1 MB → 413.
- OpenAPI cambia y no se regenera → CI rojo.
- `GROQ_API_KEY` ausente con `LLM_PROVIDER=groq` → falla al iniciar.

## Fuera de alcance

- Endpoints de dominio (004+).
- Auth completa (004).
- Modelos de DB de negocio.
- Streaming SSE.

## Criterios de finalización

- OpenAPI y tipos generados.
- Errores y `request_id` testeables.
- Postman corre contra local.
- CI detecta drift.
- Docs de contrato.

## Matriz de pruebas

| RF | Test | Evidencia |
|---|---|---|
| 002.1 | U/I: health/ready | 200/503 |
| 002.2 | U: cada código | envelope |
| 002.3 | U: header/log | request_id |
| 002.4 | U: falta variable | fallo seguro |
| 002.5 | C: drift | CI |
| 002.6 | C: `tsc` | compila |
| 002.7 | I: preflight | headers |
| 002.8 | S: Newman | salida |
| 002.9 | I: 413/429 | códigos |

## Valor para la demo

Permite construir la app y el agente sin retrabajo; los jueces ven contrato y tests.
