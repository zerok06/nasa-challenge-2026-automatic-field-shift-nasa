# Spec 004 — Sesión anónima y autorización

| Campo | Valor |
|---|---|
| ID | 004 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 003 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El piloto tiene ~100 agricultores y no queremos credenciales compartidas ni fricción de registro. Cada instalación obtiene una identidad única y un JWT; los datos quedan aislados por usuario y parcela. El login con email queda para P2.

## Usuarios / actores

- Agricultor del piloto.
- Admin/demo que crea datos sintéticos.
- Agente y tools que actúan en nombre del usuario.

## Historias de usuario

- H1: Como agricultor, quiero entrar sin crear contraseña.
- H2: Como agricultor, quiero que otro no vea mi parcela.
- H3: Como dev, quiero un `user_id` confiable para filtrar.

## Requisitos funcionales (EARS)

- **RF-004.1:** CUANDO la app se abre por primera vez, EL SISTEMA crea un usuario anónimo y devuelve un JWT con `sub`.
- **RF-004.2:** EL SISTEMA expone `GET /me` con perfil, consentimiento y parcela activa.
- **RF-004.3:** CUANDO el token expira, EL SISTEMA permite refresh sin perder la sesión.
- **RF-004.4:** SI un usuario solicita una parcela ajena, ENTONCES EL SISTEMA responde 404.
- **RF-004.5:** EL SISTEMA registra `consent_version` y `consent_at` antes de guardar datos personales.
- **RF-004.6:** EL SISTEMA ignora cualquier `user_id` del body y usa solo el `sub` del JWT.
- **RF-004.7:** EL SISTEMA guarda el token en `expo-secure-store`, no en AsyncStorage plano.
- **RF-004.8:** EL SISTEMA limita `/auth/anonymous` a 5/min por IP y registra el evento sin PII.

## Requisitos no funcionales

- 100 usuarios, 10 concurrentes.
- Token de acceso 7 días; refresh 30 días.
- Sin contraseñas en MVP.
- Logs con IDs, no nombres.
- Compatible con reinstalación (nuevo usuario; datos previos no accesibles).

## Casos límite

- Token ausente/vencido → 401 con envelope.
- Token manipulado → 401, sin detalle.
- Usuario borrado → 401.
- Reinstalación → nuevo `sub`; no recupera parcela (documentado).
- Consentimiento rechazado → puede explorar demo, no guardar.
- Reloj desfasado → tolerancia 60 s.

## Fuera de alcance

- Email/password, OAuth, SMS.
- Recuperación de cuenta.
- Roles admin (P2).

## Criterios de finalización

- Flujo anonymous → JWT → `/me` probado.
- IDOR tests verdes.
- Token en SecureStore.
- Rate limit.

## Matriz de pruebas

| RF | Test |
|---|---|
| 004.1 | U/I: anonymous |
| 004.2 | U: /me |
| 004.3 | U: refresh |
| 004.4 | U/I: IDOR |
| 004.5 | U: consentimiento |
| 004.6 | U: body user_id ignorado |
| 004.7 | M: SecureStore |
| 004.8 | I: 429 |
