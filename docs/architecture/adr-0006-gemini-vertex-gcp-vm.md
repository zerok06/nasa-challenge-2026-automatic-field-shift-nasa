# ADR-0006 — Gemini en Vertex AI y backend en una VM GCP

## Estado

Aceptada — 2026-11-14.

## Contexto

El agente del MVP era un router determinista por palabras clave. El piloto
necesita lenguaje natural, pero las cifras deben seguir viniendo de los motores
y no del modelo. Además, el backend solo corría en la laptop con Docker
Compose; jueces y teléfonos necesitan una URL HTTPS estable.

El proyecto `nasa-2026-automatic` tiene billing activo y créditos, con un
límite de recursos de ~1.7–2 GB de RAM y CPU compartida.

## Decisión

1. **Gemini vía Vertex AI**, modelo `gemini-3.5-flash`, endpoint global,
   autenticación con la service account de la VM (ADC). Sin API keys.
2. **Function calling** con cuatro tools (`get_parcel_context`,
   `compare_rotations`, `simulate_scenario`, `propose_save_plan`). La parcela y
   el usuario se ligan al servidor; el modelo nunca recibe IDs libres.
3. **Guard numérico**: toda cifra de la respuesta debe existir en la evidencia
   de las tools; si no, plantilla en español y `explanation_fallback`.
4. **Escrituras deterministas**: `propose_save_plan` se resuelve en el servidor
   cuando el mensaje pide guardar; el modelo no decide guardar.
5. **Infra**: una VM `e2-small` en `us-central1-a` con Docker Compose:
   Postgres 16 + PostGIS 3.4, FastAPI y Caddy. IP estática y TLS con
   `sslip.io`. Imagen en Artifact Registry construida por Cloud Build.
6. **Secretos** en Secret Manager; la VM usa una service account con roles
   mínimos.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Cloud Run + Cloud SQL | Cloud SQL no entra en free tier y suele estar bloqueado en sandbox; costo fijo mayor |
| Cloud Run + Postgres en el mismo contenedor | El filesystem es efímero; la DB se pierde |
| Cloud Run + Neon/Supabase | La base sale de GCP y añade una dependencia externa |
| Groq | Proveedor legado; el proyecto ya tiene acceso a Vertex AI |
| VM más grande | El límite del sandbox es ~1.7–2 GB; `e2-small` ya deja margen |

## Consecuencias

- Costo ≈ US$ 13/mes + tokens, cubierto por créditos.
- Un solo punto de falla; aceptable para demo/piloto.
- Sin historial multi-turno persistente; cada turno es stateless.
- El guard y el fallback `fake` mantienen la app usable si Vertex falla.
- El free trial vence a los 90 días; documentar el upgrade.
- La app se apunta al dominio con `EXPO_PUBLIC_API_URL`.

## Referencias

- `specs/029-gemini-vertex-gcp/`
- `docs/architecture/deploy-gcp.md`
- `docs/architecture/agent.md`
