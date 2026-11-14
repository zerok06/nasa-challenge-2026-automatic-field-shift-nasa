# Tasks 004 — Sesión anónima y autorización

- [ ] **T1 — Modelo `users` + migración**
  - RF: 004.1, 004.5
  - `id`, `is_anonymous`, `consent_version`, `consent_at`, timestamps.
  - Hecho cuando: migración corre y test de creación.

- [ ] **T2 — `POST /auth/anonymous`**
  - RF: 004.1, 004.8
  - Crea usuario, JWT, refresh; rate limit.
  - Hecho cuando: 201 con tokens; 429 al exceder.

- [ ] **T3 — `GET /me` + refresh**
  - RF: 004.2, 004.3
  - Perfil y rotación de token.
  - Hecho cuando: access vencido → refresh → 200.

- [ ] **T4 — Dependencia `get_current_user`**
  - RF: 004.6
  - Firma/exp/sub; 401.
  - Hecho cuando: token inválido → 401; body `user_id` ignorado.

- [ ] **T5 — Autorización por parcela**
  - RF: 004.4
  - `get_parcel_or_404`.
  - Hecho cuando: IDOR test → 404.

- [ ] **T6 — Mobile session**
  - RF: 004.7
  - SecureStore, refresh, logout.
  - Hecho cuando: reinicio conserva sesión; token no está en AsyncStorage.

- [ ] **T7 — Consentimiento**
  - RF: 004.5
  - UI/texto + envío; modo demo sin consentimiento.
  - Hecho cuando: sin consentimiento no guarda; con consentimiento guarda.

## Definición de terminado

- [ ] Flujo anonymous/me/refresh.
- [ ] IDOR y 429.
- [ ] Token seguro en mobile.
- [ ] Tests verdes.
