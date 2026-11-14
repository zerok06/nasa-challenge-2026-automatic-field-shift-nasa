# Plan 000 — Fundaciones, SDD y entorno

## Decisiones técnicas

| Decisión | Elección | Alternativa descartada | Motivo |
|---|---|---|---|
| Monorepo | pnpm workspace + carpetas `apps/`, `services/`, `packages/` | npm/yarn workspaces | pnpm es rápido y estricto con dependencias |
| Node | 22.13+ LTS | Node 20 | Expo 58 exige `^22.13 || ^24.3 || >=26` |
| Python | 3.12 | 3.13 | Wheels geoespaciales estables |
| Gestor Python | uv | pip/poetry | Lockfile rápido y reproducible |
| Env | `.env` raíz + script de sync | `.env` por paquete | Una sola fuente de verdad |
| Licencia | MIT | Apache-2.0 | Simple y compatible con el hackathon |
| Formato | ESLint + Prettier + ruff | Solo editor | CI consistente |

## Estructura

```text
automatic/
├── .env                  # gitignored
├── .env.example
├── .gitignore
├── .gitattributes
├── .editorconfig
├── AGENTS.md
├── MEMORY.md
├── LICENSE
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── scripts/
│   └── env/
│       ├── check.mjs
│       ├── sync.mjs
│       ├── check.test.mjs
│       └── sync.test.mjs
├── docs/
│   ├── constitution.md
│   ├── architecture/
│   ├── agricultural-assumptions/
│   ├── data-licenses.md
│   └── demo/
├── specs/
├── apps/mobile/
├── services/api/
├── contracts/
├── datasets/
└── tests/{contract,parity,smoke}/
```

## Env centralizado

Ver `docs/architecture/env.md`. Resumen:

- `.env` raíz: fuente de verdad, gitignored.
- `.env.example`: todas las variables, sin valores reales.
- `scripts/env/check.mjs`: obligatorias por entorno; no imprime valores; verifica que `.env` esté ignorado.
- `scripts/env/sync.mjs`: genera `apps/mobile/.env.local` solo con `EXPO_PUBLIC_API_URL` y `EXPO_PUBLIC_DEMO_MODE`.
- API: `pydantic-settings` con `env_file` raíz; en Docker, variables de compose.
- Mobile: Expo lee `.env.local`; el script corre en `prestart`/`prebuild`.

## Protección de secretos

1. `.gitignore` primero:
   ```gitignore
   .env
   .env.*
   !.env.example
   apps/mobile/.env.local
   .opencode/
   node_modules/
   .venv/
   __pycache__/
   .expo/
   dist/
   *.keystore
   ```
2. `git check-ignore -v .env` debe devolver una regla.
3. `git ls-files .env` debe estar vacío.
4. Hook local opcional con `gitleaks`; CI con `gitleaks` o check de índice.
5. Rotar `GROQ_API_KEY` si el archivo se compartió o se sincronizó.

## Scripts de validación

```json
{
  "scripts": {
    "env:check": "node scripts/env/check.mjs",
    "env:sync": "node scripts/env/sync.mjs",
    "check:tools": "node scripts/env/check-tools.mjs",
    "lint": "eslint . && prettier --check .",
    "test:scripts": "node --test scripts/env/*.test.mjs"
  }
}
```

`check.mjs`:

- Lee `.env` sin imprimir valores.
- Requiere: `APP_ENV`, `API_PORT`, `POSTGRES_*`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS`, `LLM_PROVIDER`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_DEMO_MODE`.
- Si `LLM_PROVIDER=groq`, requiere `GROQ_API_KEY` y `GROQ_MODEL`.
- Falla si una variable `EXPO_PUBLIC_*` parece secreta (`KEY`, `SECRET`, `PASSWORD`, `TOKEN`).
- Falla si `.env` no está ignorado.

## SDD

- `docs/constitution.md`: 8 principios.
- `specs/README.md`: catálogo y estado.
- Plantillas en `specs/_template/` (se copian al crear una spec).
- `AGENTS.md`: comandos y reglas.
- `MEMORY.md`: decisiones, estado y riesgos.

## Licencia y datos

- `LICENSE` MIT.
- `docs/data-licenses.md`: NASA POWER, GIBS/IMERG, FAO-56, anuario de Moquegua, librerías.
- Atribución visible en la app y en el README.
- La app es gratuita; no se venden datos; exportación/borrado en el roadmap.

## Cobertura RF → componentes

| RF | Componente |
|---|---|
| 000.1 | `README.md`, `package.json`, scripts |
| 000.2 | `scripts/env/check.mjs` |
| 000.3 | `scripts/env/sync.mjs`, `docs/architecture/env.md` |
| 000.4 | `.gitignore`, `.env.example`, check de índice |
| 000.5 | `docs/constitution.md`, `specs/`, `AGENTS.md`, `MEMORY.md` |
| 000.6 | `LICENSE`, `docs/data-licenses.md` |
| 000.7 | `.nvmrc`, `check-tools.mjs`, `pyproject.toml` |
| 000.8 | check local/CI |

## Estrategia de tests

- `node --test` para scripts (sin dependencias extra).
- Casos: falta variable, prefijo público sobre secreto, `.env` trackeado, sync con secretos, rutas con espacios.
- Manual: clone limpio en Windows y macOS.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Key real en `.env` sin `.gitignore` | T1 inmediata; rotar si se compartió |
| Scripts fallan en Windows por rutas | `path.resolve`, comillas, tests en Windows |
| Sync copia un secreto | allowlist de `EXPO_PUBLIC_*`; test |
| Burocracia SDD | specs de 1 página; WIP 3 |

## Comandos

```bash
pnpm install
pnpm env:check
pnpm env:sync
pnpm test:scripts
```
