# Tasks 000 — Fundaciones, SDD y entorno

> Orden de dependencia. Cada tarea ≤ 60 min. Marcar solo si “Hecho cuando” se cumple.

- [ ] **T1 — Proteger `.env` (CRÍTICO, primero)**
  - RF: 000.4, 000.8
  - Crear `.gitignore` con `.env`, `.env.*`, `!.env.example`, `.opencode/`, `node_modules/`, `.venv/`, `__pycache__/`, `.expo/`, `apps/mobile/.env.local`, `*.keystore`.
  - Verificar `git check-ignore -v .env` y `git ls-files .env`.
  - Si el workspace se compartió, rotar `GROQ_API_KEY` en Groq y actualizar `.env`.
  - Hecho cuando: `.env` aparece ignorado y no trackeado; key rotada o decisión registrada.

- [ ] **T2 — `.env.example` completo**
  - RF: 000.3, 000.4
  - Incluir todas las variables de `docs/architecture/env.md`, con placeholders y comentarios.
  - No incluir valores reales.
  - Hecho cuando: `diff` de nombres entre `.env` y `.env.example` no tiene faltantes.

- [ ] **T3 — `scripts/env/check.mjs` + tests**
  - RF: 000.2, 000.3
  - Validar obligatorias por `APP_ENV` y `LLM_PROVIDER`.
  - No imprimir valores; nombrar la variable faltante.
  - Verificar `.env` ignorado y que `EXPO_PUBLIC_*` no parezca secreto.
  - Hecho cuando: `node --test scripts/env/check.test.mjs` verde, incluido el caso de secreto con prefijo público.

- [ ] **T4 — `scripts/env/sync.mjs` + tests**
  - RF: 000.3
  - Generar `apps/mobile/.env.local` solo con `EXPO_PUBLIC_API_URL` y `EXPO_PUBLIC_DEMO_MODE`.
  - Cabecera “GENERATED — DO NOT EDIT”.
  - Hecho cuando: el archivo generado no contiene `GROQ`, `DATABASE`, `JWT` ni `EARTHDATA`.

- [ ] **T5 — Workspace y versiones**
  - RF: 000.1, 000.7
  - `package.json`, `pnpm-workspace.yaml`, `.nvmrc`, `pyproject.toml`, `scripts/env/check-tools.mjs`.
  - Verificar Node 22.13+, pnpm, Python 3.12, uv, Docker.
  - Hecho cuando: `pnpm check:tools` pasa en Windows y falla con versión incorrecta.

- [ ] **T6 — Lint y formato**
  - RF: 000.1
  - ESLint + Prettier + ruff + `.editorconfig` + `.gitattributes`.
  - Hecho cuando: `pnpm lint` pasa en un archivo de prueba y falla con un error inducido.

- [ ] **T7 — SDD**
  - RF: 000.5
  - `docs/constitution.md`, `AGENTS.md`, `MEMORY.md`, `specs/README.md`, `specs/_template/`.
  - Hecho cuando: una spec nueva se puede crear copiando la plantilla sin campos faltantes.

- [ ] **T8 — Licencia, datos y README**
  - RF: 000.6
  - `LICENSE` MIT, `docs/data-licenses.md`, README con quickstart, stack, enlaces y atribución.
  - Hecho cuando: README permite instalar y correr `env:check`; licencias listadas.

- [ ] **T9 — Chequeo de secretos**
  - RF: 000.8
  - Script local y paso de CI que falla si `.env` está trackeado o si hay patrones de key.
  - Hecho cuando: un archivo de prueba con `GROQ_API_KEY=...` hace fallar el check (sin imprimir el valor).

- [ ] **T10 — Verificación en Windows**
  - RF: 000.1, 000.2
  - Probar clone en carpeta con espacios, PowerShell, CRLF.
  - Hecho cuando: `pnpm install`, `env:check`, `env:sync`, `test:scripts` pasan; documentado en README.

## Definición de terminado

- [ ] Todos los RF con evidencia.
- [ ] `.env` ignorado y no trackeado.
- [ ] Scripts con tests verdes.
- [ ] Documentos SDD y licencia.
- [ ] `MEMORY.md` actualizado con la decisión de rotación (si aplica).
