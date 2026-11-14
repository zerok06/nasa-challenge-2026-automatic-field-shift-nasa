# Spec 000 — Fundaciones, SDD y entorno

| Campo | Valor |
|---|---|
| ID | 000 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | Ninguna |
| Versión | 0.1 |
| Fecha | 2026-11-14 |
| Owner | Por asignar |

## Contexto y objetivo

El repositorio es nuevo y todavía no tiene convenciones, tooling ni una fuente única de configuración. Antes de escribir la API o la app, necesitamos que cualquier persona (o agente) clone el repo, valide el entorno y sepa dónde está cada cosa. Este spec establece el monorepo, el SDD, el `.env` centralizado y la protección de secretos. Es la base para los 100 agricultores del piloto y para publicar el código como software libre.

## Usuarios / actores

- Desarrolladores del equipo (mobile, backend, datos, IA).
- Agentes de código que retoman el repo.
- Mantenedores futuros.
- Agricultores del piloto (usuarios finales, indirectamente).

## Historias de usuario

- H1: Como dev, quiero clonar e instalar con comandos claros para empezar en menos de 15 minutos.
- H2: Como agente, quiero leer reglas y contratos para no inventar decisiones.
- H3: Como mantenedor, quiero que ningún secreto llegue al repositorio.
- H4: Como agricultor, quiero que la app sea gratuita y que mis datos se puedan borrar/exportar.

## Requisitos funcionales (EARS)

- **RF-000.1:** CUANDO un desarrollador clona el repo, EL SISTEMA ofrece comandos documentados para instalar dependencias y validar el entorno.
- **RF-000.2:** SI falta una variable obligatoria, ENTONCES el script `env:check` falla, nombra la variable y no permite arrancar.
- **RF-000.3:** EL SISTEMA mantiene un único `.env` raíz como fuente de verdad; la app solo recibe variables `EXPO_PUBLIC_*` mediante un script de sincronización.
- **RF-000.4:** EL SISTEMA impide versionar `.env` y secretos; `.env.example` documenta todas las variables con placeholders.
- **RF-000.5:** EL SISTEMA incluye constitución, plantillas SDD (`spec.md`, `plan.md`, `tasks.md`), `AGENTS.md` y `MEMORY.md`.
- **RF-000.6:** EL SISTEMA declara licencia MIT, atribuciones de datos y uso gratuito para agricultores.
- **RF-000.7:** EL SISTEMA fija Node 22.13+, pnpm, Python 3.12, uv y Docker, y verifica las versiones.
- **RF-000.8:** SI `.env` aparece en el índice de Git, ENTONCES el chequeo local/CI falla.

## Requisitos no funcionales

- Onboarding de un dev nuevo: < 15 minutos.
- Windows (PowerShell), macOS y Linux.
- No imprimir valores de secretos en logs ni en mensajes de error.
- Documentación en español; identificadores de código en inglés.
- Contexto de 100 agricultores: privacidad y consentimiento desde el inicio.

## Casos límite

- `.env` existente con solo `GROQ_API_KEY`: no borrarlo; agregar las demás variables.
- Repo sin `.gitignore`: crearlo antes de cualquier `git add`.
- Node/Python con versión incorrecta: mensaje claro.
- Rutas con espacios (`C:\Users\Jose Paye\...`): scripts con comillas.
- CRLF en Windows: `.gitattributes` para LF en scripts.
- `.env` ignorado por configuración global pero no por el repo: el check debe usar `git check-ignore` y el archivo del repo.

## Fuera de alcance

- Docker Compose, PostGIS y CI (spec 001).
- Esqueleto FastAPI (spec 002).
- App shell y RNUI (spec 003).
- Despliegue y túnel (spec 027).

## Criterios de finalización

- `pnpm install && pnpm env:check` funciona en Windows.
- `.env` está ignorado y `git ls-files .env` está vacío.
- `.env.example` cubre todas las variables.
- Plantillas SDD, constitución, AGENTS y MEMORY existen.
- `LICENSE` MIT y `docs/data-licenses.md` existen.
- Tests de scripts verdes.

## Dudas abiertas

Ninguna bloqueante. Licencia MIT por defecto; cambiarla requiere ADR.

## Matriz de pruebas

| RF | Test | Evidencia |
|---|---|---|
| 000.1 | U: `node --test scripts/env/*.test.mjs` | salida verde |
| 000.2 | U: caso falta `JWT_SECRET` | mensaje con nombre, sin valor |
| 000.3 | U: sync solo copia `EXPO_PUBLIC_*` | `.env.local` generado |
| 000.4 | U + manual: `git check-ignore .env`; `git ls-files .env` | vacío |
| 000.5 | M: revisión de archivos | checklist |
| 000.6 | M: LICENSE y data-licenses | archivos |
| 000.7 | U: `scripts/check-tools.mjs` | versiones |
| 000.8 | U/CI: check de índice | falla si trackeado |

## Valor para la demo

Habilita que el resto del equipo trabaje sin bloquearse y que la demo no filtre la key de Groq.
