# Spec 029 — Gemini en Vertex AI + despliegue GCP

| Campo | Valor |
|---|---|
| ID | 029 |
| Estado | Implementado (demo GCP) |
| Prioridad | P0 |
| Dependencias | 020, 021, 022, 028 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El agente actual es un router determinista por palabras clave: responde bien,
pero no interpreta lenguaje natural ni redacta. El piloto necesita que el
agricultor pregunte como habla y reciba una respuesta breve, con cifras que
vengan de los motores y nunca del modelo.

Además, el backend solo corre en la laptop con Docker Compose. Para el demo y
los jueces hace falta una URL HTTPS pública, estable y barata. El proyecto GCP
`project-59be27c2-c126-4ea7-b01` (nombre visible `nasa-2026-automatic`) tiene
billing activo y créditos.

Objetivo: integrar Gemini vía Vertex AI con function calling sobre los motores
existentes, y desplegar API + Postgres/PostGIS en una VM `e2-small` con HTTPS,
sin salir del presupuesto de créditos.

## Alcance

Incluye:

- Proveedor `gemini` en Vertex AI, endpoint global, modelo `gemini-3.5-flash`.
- Function calling con tools deterministas y parcela ligada al servidor.
- Guard numérico anti-alucinación y fallback al modo `fake`.
- Despliegue GCP: VM `e2-small`, Docker Compose, Caddy, Secret Manager,
  Cloud Build y Artifact Registry.
- Smoke tests y documentación de operación.

No incluye:

- Historial multi-turno persistente (tabla nueva).
- Cloud SQL, Cloud Run o GKE.
- APK/EAS, ingesta POWER real, quechua/aimara.
- Fine-tuning ni RAG.

## Actores

- Agricultor del piloto (Android, español, conectividad intermitente).
- Jurado que evalúa trazabilidad y honestidad de datos.
- Desarrollador que despliega y opera el backend.

## Historias de usuario

- H1: Como agricultor, quiero preguntar en mis palabras y recibir una respuesta
  corta con cifras de la comparación.
- H2: Como jurado, quiero ver que el modelo no inventa números y que cada cifra
  tiene evidencia.
- H3: Como desarrollador, quiero desplegar con un script y verificar `/ready`.
- H4: Como QA, quiero correr los tests sin red usando `LLM_PROVIDER=fake`.

## Requisitos funcionales (EARS)

- **RF-029.1:** CUANDO `LLM_PROVIDER=gemini`, EL SISTEMA usa Vertex AI con
  `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION=global` y
  `GEMINI_MODEL=gemini-3.5-flash`, autenticado con la service account de la VM
  (ADC). Ninguna API key viaja al cliente ni al repositorio.
- **RF-029.2:** EL SISTEMA expone las tools `get_parcel_context`,
  `compare_rotations`, `simulate_scenario` y `propose_save_plan`. La parcela y
  el usuario salen del JWT y del hilo, nunca de un parámetro de texto.
- **RF-029.3:** EL SERVIDOR ejecuta las tools y devuelve solo resultados
  seguros al modelo. Gemini clasifica y redacta; no calcula cifras, no ve SQL y
  no navega por URLs. Máximo 4 iteraciones de tools. Las escrituras
  (`propose_save_plan`) se resuelven de forma determinista: el modelo no decide
  guardar.
- **RF-029.4:** EL SISTEMA valida cada número de la respuesta contra la
  evidencia de las tools (tolerancia de redondeo). Si no coincide, usa una
  plantilla en español y agrega `explanation_fallback`.
- **RF-029.5:** EL SISTEMA aplica timeout de 20 s, un reintento, temperatura 0 y
  límite de tokens de salida. Si Gemini falla, responde con el modo `fake` y
  agrega `gemini_fallback`.
- **RF-029.6:** EL MODO `fake` sigue siendo el default en tests y CI; la prueba
  viva de Gemini es opt-in.
- **RF-029.7:** EL SISTEMA se despliega en una VM `e2-small` en `us-central1-a`
  con 20 GB de disco estándar, IP estática y firewall solo 80/443; SSH solo por
  IAP.
- **RF-029.8:** LA BASE DE DATOS es Postgres 16 + PostGIS 3.4 en Docker, con
  volumen persistente, límites de memoria y sin puerto público.
- **RF-029.9:** LOS SECRETOS (`DATABASE_URL`, `JWT_SECRET`) viven en Secret
  Manager; la service account de la VM tiene solo los roles necesarios.
- **RF-029.10:** EL SISTEMA construye la imagen en Cloud Build, la publica en
  Artifact Registry y la VM la descarga.
- **RF-029.11:** DESPUÉS del despliegue, `/api/v1/ready` responde `ready` y los
  smoke tests cubren auth anónimo, comparación y agente.
- **RF-029.12:** LA APP apunta `EXPO_PUBLIC_API_URL` al dominio HTTPS y funciona
  en Expo Go sobre LAN.
- **RF-029.13:** LA DECISIÓN queda documentada en
  `docs/architecture/deploy-gcp.md`, un ADR y `MEMORY.md`.

## Requisitos no funcionales

- RAM estable < 1.6 GB; swap de 2 GB; un worker de uvicorn.
- Respuesta del agente p95 < 8 s con Gemini y < 1 s con `fake`.
- Logs rotados, sin secretos ni PII; trazas con nombre, estado y latencia.
- Costo mensual de infraestructura ≈ US$ 13, cubierto por créditos.
- Sin cambios de accesibilidad, i18n ni testIDs móviles.

## Criterios de aceptación

1. `pytest backend/tests` verde con `LLM_PROVIDER=fake`.
2. Prueba viva: “compara rotaciones” devuelve `answer`, `tool_trace` y
   `open_comparison`; las cifras existen en la comparación.
3. Prueba del guard: una cifra inventada se reemplaza y aparece
   `explanation_fallback`.
4. `/api/v1/ready` responde `ready` en el dominio HTTPS.
5. El contenedor de la API corre con `LLM_PROVIDER=gemini` y sin API key.
6. La app móvil apunta al dominio y completa el flujo de comparación.
