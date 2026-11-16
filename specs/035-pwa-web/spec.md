# Spec 035 — PWA web: instalación, offline y cierre de precios/economía

| Campo | Valor |
|---|---|
| ID | 035 |
| Estado | Borrador completo — listo para aprobación |
| Prioridad | P2 — app web (sale del backlog sin spec; ver specs/README) |
| Dependencias | 018, 019, 026, 028, 030, 031, 032, 033, 034 |
| Versión | 0.2 |
| Fecha | 2026-11-15 |
| Owner | Por asignar |

## Contexto y objetivo

El piloto (100 agricultores, Android) vive hoy en la app Expo. Parte del
recorrido — Inicio, Mi parcela, comparación de 3 planes, simulador y agente —
puede servirse como **PWA instalable** que reutiliza el mismo backend FastAPI y
los mismos motores deterministas, sin duplicar lógica agronómica. La PWA
también cierra dos deudas de código detectadas al preparar el port: el
catalogo de precios no cruza los 8 cultivos cuyo id en inglés (DB) no coincide
con el id en español (catálogo) y el motor económico ignora el
`marketable_share` que la app ya envía.

No se construye nada fuera del guion de demo (constitución 1): una parcela, una
comparación y dos escenarios, en web.

## Usuarios / actores

- Agricultor del piloto que también usa un navegador (teléfono o computadora).
- Jurado/revisor que abre la demo web sin instalar la app.
- Operador que despliega PWA y API bajo el mismo dominio.

## Historias de usuario

- H1: Como agricultor, quiero instalar Anden en mi pantalla de inicio y abrirlo
  sin conexión para revisar mi comparación y mi plan guardado.
- H2: Como agricultor, quiero capturar agua y precios sin señal y que se
  sincronicen cuando recupere la conexión.
- H3: Como agricultor, quiero ver el precio de referencia del cultivo con su
  fuente, año, ámbito y estado, y corregirlo antes de guardarlo, también en web.
- H4: Como agricultor, si mi cultivo tiene id en inglés en mi parcela, quiero
  que aparezca su precio de referencia del catálogo igualmente.
- H5: Como operador, quiero servir PWA y API bajo el mismo dominio con Caddy.

## Requisitos funcionales (EARS)

- **RF-035.1:** EL SISTEMA ofrece una PWA instalable (manifest + service
  worker) que arranca offline desde el shell y muestra el estado de conexión.
- **RF-035.2:** CUANDO no hay conexión, EL SISTEMA muestra una banda de estado
  "sin conexión" y los flujos de lectura (Inicio, Mi parcela, última
  comparación, plan guardado) usan el caché local; las escrituras entran a una
  cola de sincronización.
- **RF-035.3:** CUANDO recupera la conexión, EL SISTEMA envía la cola de
  escrituras en orden, con reintentos acotados e `Idempotency-Key`; muestra el
  resultado y no duplica.
- **RF-035.4:** El service worker **no** cachea respuestas de auth, del agente
  ni de comparaciones nuevas; solo el shell (HTML/JS/CSS), el manifiesto, el
  catálogo de cultivos/precios (GET) y los objetos estáticos.
- **RF-035.5:** CUANDO el catálogo de precios del backend no cruza un cultivo
  cuyo id en inglés no coincide con el id en español del catálogo (p.ej.
  `chili`↔`aji`, `potato`↔`papa`), EL SISTEMA resuelve el alias y devuelve la
  referencia correspondiente en `GET /api/v1/catalog/crops` y en el tool del
  agente; el mapeo se cubre con test.
- **RF-035.6:** CUANDO la app envía `marketable_share` (fracción 0–1) en el
  payload económico, EL SISTEMA lo usa para acotar la producción
  comercializable; si no se envía, se asume 1.0 (100 %) y la ganancia se
  mantiene coherente con la app.
- **RF-035.7:** CUANDO el agricultor edita el precio prellenado del catálogo,
  EL SISTEMA marca la referencia como modificada respecto al catálogo y lo
  guarda como supuesto económico editable, no como dato confirmado.
- **RF-035.8:** EL SISTEMA sirve PWA y API bajo el mismo dominio (Caddy)
  con `EXPO_PUBLIC_*` solo en el bundle; los secretos de API viven en el backend.
- **RF-035.9:** CUANDO un idioma queda marcado `review_pending` (quechua/
  aimara), EL SISTEMA usa fallback en español y lo deja marcado; no presenta la
  traducción como revisada.
- **RF-035.10:** EL SISTEMA registra CORS para los orígenes de dev (`:5173`) y
  build (`:4173`) además de los de Expo, y documenta el valor de producción
  mismo dominio.

## Requisitos no funcionales

- Rendimiento: el shell offline < 300 KB transferidos; el catálogo se cachea
  una vez. La PWA no bloquea el arranque por el agente (Gemini) ni por
  comparaciones.
- Accesibilidad: targets ≥ 48 dp, iconos con label, gráficos con tabla de datos
  y respeto a reduce motion (ver `docs/accessibility.md`), mismo estándar que la
  app.
- Idioma/unidades: UI en español, código en inglés; mm, m³/ha, kg/ha, PEN,
  fechas `America/Lima`. `null` ≠ 0.
- Despliegue: mismo dominio para PWA y API; el service worker expira el caché
  cuando cambia la versión de build.

## Casos límite

- Cola vacía vs cola con reintentos agotados: se marca el fallo y permite
  "reintentar" sin borrar los datos capturados.
- `marketable_share` nulo → 1.0; fuera de rango → se clava a [0,1].
- Precio del catálogo en otro ámbito (provincia ajena) → no se ofrece como
  local (límite ya cubierto en 034).
- Sin catálogo descargado y sin conexión → se muestra "sin datos", no 0.
- Un cultivo con id solo en inglés y sin referencia → "no hay referencia".

## Fuera de alcance

- iOS específico y empaquetado nativo de la web.
- Cálculo agronómico nuevo: la PWA reutiliza los motores del backend; no
  duplica `services/`.
- Chat de agente en streaming (hoy JSON + progreso, ver desviaciones).
- Mapas/tiles offline (backlog P2).
- Voz/transcripción (P2, spec 025/029).

## Criterios de finalización

- [ ] La PWA instala en Chrome/Edge y arranca offline mostrando Inicio y la
      última comparación.
- [ ] Capturar agua/precio sin conexión y se sincroniza al recuperar señal
      (test de integración con el outbox).
- [ ] Los 8 cultivos pendientes de `MEMORY.md` (corn, carrot, lettuce,
      beetroot, sweet_potato, green_pea, pickle_cucumber, cauliflower)
      muestran su referencia en web (test backend 035.5).
- [ ] `marketable_share` afecta la producción comercializable (test 035.6).
- [ ] CORS acepta `:5173`/`:4173` y producción mismo dominio.
- [ ] Service worker no cachea auth/agente (verificación manual + test).
- [ ] Typecheck/lint de `frontend/`, tests backend, y evidencia Maestro/Playwright.
- [ ] Registro en MEMORY.md y, si aplica, ADR para despliegue mismo dominio.

## Dudas abiertas

Resueltas el 2026-11-15 con el usuario:

- PWA apunta al **mismo backend GCP `sslip.io`** (Caddy proxy de `/api/v1` a
  la VM). No hay segunda instancia de Postgres; datos y sesión son los del
  piloto.
- Se sirve con **Caddy** (TLS automático y config mínima), coherente con el
  despliegue GCP existente (`deploy/gcp/`). Nginx descartado.
- **Dominio (resuelta):** se reutiliza el host actual `sslip.io` de la API.
  La PWA se sirve en `/` y la API en `/api/v1` del mismo origen; no se crea
  subdominio ni una segunda VM. Decisión registrada en ADR-0010.

## Matriz de pruebas

| RF | Test | Evidencia |
|---|---|---|
| 035.1 | I, M | PWA instalable + arranque offline |
| 035.2 | I, M | Banda de estado + lectura desde caché |
| 035.3 | I, P | Sincronización de cola con idempotencia |
| 035.4 | I, M | Auditoría del service worker |
| 035.5 | U, C | Test de alias inglés→catálogo |
| 035.6 | U | Test del motor con `marketable_share` |
| 035.7 | I | Edición de referencia marcada |
| 035.8 | M | Despliegue mismo dominio |
| 035.9 | U | Fallback y `review_pending` |
| 035.10 | I | CORS dev + producción |
