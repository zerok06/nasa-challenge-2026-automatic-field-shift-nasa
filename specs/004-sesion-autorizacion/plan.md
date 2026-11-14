# Plan 004 — Sesión anónima y autorización

## Decisiones

| Tema | Elección | Alternativa | Motivo |
|---|---|---|---|
| Identidad | anónima por instalación | email/password | sin fricción para 100 agricultores |
| Token | JWT HS256 | sesión en DB | simple, stateless |
| Librería | PyJWT | python-jose | mantenida y simple |
| Storage | expo-secure-store | AsyncStorage | token protegido |
| Refresh | rotación simple | refresh family | suficiente MVP |

## Backend

- `POST /api/v1/auth/anonymous`:
  - Crea `users(is_anonymous=true, consent_version=...)`.
  - Devuelve `access_token`, `refresh_token`, `expires_in`, `user`.
- `POST /api/v1/auth/refresh`: valida refresh, emite nuevo access.
- `GET /api/v1/me`: perfil + consentimiento + parcela activa.
- Dependencia `get_current_user`:
  - Lee `Authorization: Bearer`.
  - Valida firma/exp/iss.
  - Carga usuario; 401 si no existe.
- `JWT_SECRET` ≥32; `JWT_EXPIRE_MINUTES=10080`; refresh 30 días.
- Rate limit 5/min por IP en anonymous.

## Autorización

- Repositorios reciben `user_id`; nunca consultan sin filtro.
- `get_parcel_or_404(parcel_id, user_id)`.
- Tools del agente reciben `user_id` explícito.
- Test IDOR: usuario A pide parcela de B → 404.

## Mobile

- `src/auth/session.ts`: lee/crea token, refresh, logout.
- `expo-secure-store`; no AsyncStorage.
- Interceptor 401 → refresh → reintenta una vez.
- Si refresh falla → crea sesión nueva (demo) o pide reintentar.

## Consentimiento

- Texto corto: finalidad, datos, borrado.
- `consent_version` se envía al crear sesión; se guarda.
- Sin consentimiento: modo demo de solo lectura.

## Cobertura RF

| RF | Archivo |
|---|---|
| 004.1 | `api/v1/auth.py`, `services/auth.py` |
| 004.2 | `api/v1/me.py` |
| 004.3 | `services/auth.py` refresh |
| 004.4 | `repositories/parcels.py`, tests |
| 004.5 | `models/user.py` |
| 004.6 | `deps.py` |
| 004.7 | `src/auth/session.ts` |
| 004.8 | limiter |

## Tests

- Unit: firma, exp, sub, body user_id.
- Integration: anonymous → me → refresh; IDOR; 429.
- E2E: primer arranque crea sesión; no muestra datos de otro.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Token en logs | no loguear Authorization |
| Reinstalación pierde datos | documentar; upgrade P2 |
| Fuerza bruta | rate limit + tokens aleatorios |
| Reloj | tolerancia 60 s |
