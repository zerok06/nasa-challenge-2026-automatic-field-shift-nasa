# Seguridad y privacidad

## Contexto

100 agricultores, datos de parcela y producción, demo local expuesta por túnel. El riesgo principal no es un atacante sofisticado: es una key filtrada, un IDOR o una recomendación que parezca más precisa de lo que es.

## Autenticación

- Sesión anónima por instalación: `POST /auth/anonymous` → JWT con `sub` único.
- Sin credenciales compartidas; cada dispositivo es un usuario.
- `JWT_SECRET` ≥32 caracteres; expiración 7 días; refresh.
- `user_id` sale del token, nunca del body.
- Upgrade a cuenta (email) P2.

## Autorización

- Cada query de dominio filtra por `owner_user_id`.
- Parcela ajena → 404 (no filtrar existencia).
- Tools del agente reciben `user_id` y verifican dentro.
- Tests IDOR obligatorios.

## Secretos

- `.env` raíz gitignored; `.env.example` sin valores.
- `GROQ_API_KEY`, `DATABASE_URL`, `JWT_SECRET`, `EARTHDATA_*` solo en backend/ingest.
- `EXPO_PUBLIC_*` es público; nunca poner secretos.
- No imprimir valores en logs/errores.
- Rotar la key de Groq si el workspace se compartió.
- CI: `git ls-files .env` vacío; gitleaks o check de patrones.
- Imágenes Docker sin `.env`; variables en runtime.

## Prompt injection

- Nombres de parcela, notas, precios y metadatos NASA son **datos**, no instrucciones.
- Delimitar en el prompt; el LLM no tiene tools de SQL/HTTP libres.
- Allowlist de tools y enum de UI actions.
- Validar salida estructurada; rechazar campos extra.
- Test: nombre de parcela con “ignora las instrucciones...”.

## Rate limits y abuso

- Login/anonymous: 5/min por IP.
- Agente: 20/min por usuario.
- Comparaciones: 10/min por usuario.
- Body max 1 MB; query max 500 caracteres.
- Timeouts de tools y LLM.

## Túnel y demo

- Cloudflare Tunnel solo expone la API (no Postgres).
- URL aleatoria, vida corta; apagar al terminar.
- Datos demo sintéticos; sin PII real.
- Rate limits activos; logs sin cuerpos completos.
- CORS explícito; no `*` si se comparte la URL.

## Privacidad

- Minimización: ubicación aproximada opcional; no pedir GPS exacto si no se necesita.
- Consentimiento versionado; finalidad clara.
- Exportación/borrado (P1).
- Logs: IDs, códigos, latencias; no consultas completas ni nombres.
- Retención: 90 días para logs; borrar demo al cerrar.

## Dependencias y build

- Lockfiles; `pnpm audit`/`pip-audit` en CI (no bloqueante al inicio).
- No ejecutar scripts remotos.
- APK firmado; keystore fuera del repo.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Key de Groq filtrada | `.gitignore`, rotación, check CI |
| IDOR | filtro por owner + tests |
| Prompt injection | datos delimitados + tools allowlist |
| Túnel público | rate limit, demo data, apagar |
| PII en logs | logging estructurado sin cuerpos |
| Recomendación sobreconfiada | etiquetas, `needs_review`, disclaimers |
