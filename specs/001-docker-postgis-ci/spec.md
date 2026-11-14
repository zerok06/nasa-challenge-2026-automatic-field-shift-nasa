# Spec 001 — Docker, PostGIS y CI

| Campo | Valor |
|---|---|
| ID | 001 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 000 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

Necesitamos un backend reproducible en la laptop del demo: PostgreSQL con PostGIS, FastAPI, migraciones y un pipeline que impida mergear código roto. Este spec crea el entorno Docker y el CI; no implementa dominio. Debe soportar 100 agricultores registrados y ~10 concurrentes en el piloto.

## Usuarios / actores

- Desarrolladores backend/mobile que necesitan una API local.
- QA que corre smoke tests.
- El demo, que depende de que `docker compose up` funcione.

## Historias de usuario

- H1: Como dev, quiero levantar API+DB con un comando para probar la app.
- H2: Como QA, quiero un `/ready` que me diga si la DB y las migraciones están bien.
- H3: Como mantenedor, quiero que CI corra tests y build sin secretos.

## Requisitos funcionales (EARS)

- **RF-001.1:** CUANDO se ejecuta `docker compose up --build`, EL SISTEMA levanta `db`, `api` y `migrate`, y `/api/v1/health` responde 200.
- **RF-001.2:** CUANDO se consulta `/api/v1/ready`, EL SISTEMA verifica DB, migraciones y snapshots requeridos; si falla, responde 503 sin filtrar secretos.
- **RF-001.3:** EL SISTEMA aplica migraciones una vez mediante un servicio `migrate`; el seed demo solo corre con `--profile demo`.
- **RF-001.4:** MIENTRAS el volumen `pgdata` exista, EL SISTEMA conserva los datos; `docker compose down -v` los elimina.
- **RF-001.5:** EL SISTEMA ejecuta la API como usuario no root, escucha `${PORT:-8000}` y no incluye `.env` ni secretos en la imagen.
- **RF-001.6:** CUANDO se abre un PR, EL SISTEMA ejecuta lint, unitarios, integración con Postgres, contrato, paridad y build de imagen.
- **RF-001.7:** CUANDO se ejecuta el smoke, EL SISTEMA verifica health, ready y una ruta de dominio placeholder en < 60 s.
- **RF-001.8:** EL SISTEMA soporta 100 usuarios registrados y 10 concurrentes con p95 < 500 ms en lecturas (prueba de carga local).

## Requisitos no funcionales

- Arranque en frío < 90 s en laptop.
- Imagen API < 500 MB (sin deps geoespaciales pesadas).
- Healthcheck de Docker y logs estructurados.
- Windows + Docker Desktop/WSL2; macOS/Linux.
- Sin secretos en capas de imagen.

## Casos límite

- DB aún no lista: `depends_on: condition: service_healthy`.
- Migración falla: API no arranca; `migrate` sale con código ≠0.
- Puerto 8000/5432 ocupado: mensaje claro y variables.
- Volumen con permisos incorrectos en Windows.
- `down -v` accidental: documentar que borra datos.
- Sin red: CI falla con mensaje, no cuelga.

## Fuera de alcance

- Cloud Run/Cloudflare (spec 027).
- Ingesta NASA (spec 009/010).
- Auth y dominio (spec 004+).
- Backups y alta disponibilidad.

## Criterios de finalización

- `docker compose up --build` deja `/health` y `/ready` verdes.
- `docker compose run --rm api pytest -q` pasa.
- CI verde en un PR de prueba.
- Smoke local pasa.
- Documentación en `docs/architecture/deploy-local.md`.

## Matriz de pruebas

| RF | Test | Evidencia |
|---|---|---|
| 001.1 | I: compose up + curl health | log |
| 001.2 | I: ready con DB caída | 503 |
| 001.3 | I: migraciones + seed | tablas/seed |
| 001.4 | I: persistencia/reset | filas |
| 001.5 | I: `whoami`, env, image | no secretos |
| 001.6 | CI | workflow verde |
| 001.7 | S: smoke | salida |
| 001.8 | Load: k6 10 VU | p95 |

## Valor para la demo

Sin esto no hay API ni datos; es el cimiento del recorrido.
