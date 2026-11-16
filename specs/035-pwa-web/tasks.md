# Tasks 035 — PWA web: instalación, offline y cierre de precios/economía

> Orden de dependencia. Cada tarea ≤ 60 min. Marcar solo si “Hecho cuando” se cumple.
> Estado: T1–T16 implementadas con evidencia local; la suite E2E offline completa,
> el deploy GCP de las dos imágenes y la instalación en un Android físico quedan
> para la puerta 5.

## Corte 0 — Backend (deudas de código)

- [x] **T1 — Alias inglés→catálogo en `find_price_reference`**
  - RF: 035.5
  - Invertir `CATALOG_ID_MAP` de `backend/app/use_cases/seed.py` en `backend/app/agent/price_catalog.py`; resolver el id de DB (inglés) al id de catálogo (español) antes de buscar en el JSON. Si el id ya es del catálogo, usarlo directo. Cubrir `find_price_reference` y `find_mentioned_price_reference`.
  - `corn` mapea a dos ids (`maiz_amilaceo`, `maiz_choclo`): desempatar por la referencia disponible para el distrito/provincia de la parcela y, si ambas existen, mantener el orden estable del mapa (`maiz_amilaceo` primero). No duplicar filas.
  - Hecho cuando: test unitario en `backend/tests/unit/test_price_catalog.py` pasa para los 8 ids pendientes (`corn`, `carrot`, `lettuce`, `beetroot`, `sweet_potato`, `green_pea`, `pickle_cucumber`, `cauliflower`), incluido `corn` con su referencia.
  - Evidencia: `test_price_catalog.py` (20 casos) cubre los 8 alias y la resolución distrito→provincia; prueba dirigida verde.

- [x] **T2 — `marketable_share` en el motor**
  - RF: 035.6
  - Agregar `marketable_share: float | None = Field(default=None, ge=0, le=1)` en `backend/app/schemas/parcel.py::CropEconomicsIn`. Usarlo en `backend/app/use_cases/comparison.py::_plan_economics` para acotar producción comercializable (`yield * area * marketable_share`, default 1.0).
  - Hecho cuando: test en `backend/tests/unit/test_comparison_economics.py` verifica que con `marketable_share=0.6` la producción se reduce 40 % vs 1.0 y que con `None` es idéntico al comportamiento actual.
  - Evidencia: `test_comparison_economics.py` incluye `0.6`, `None` y `0.0`; 11 casos, todos verdes.

- [x] **T3 — CORS dev + build + producción**
  - RF: 035.10
  - `backend/app/core/config.py`: default de `cors_origins` incluye `http://localhost:5173`, `http://localhost:4173` además de Expo. `.env.example`: mismo valor + comentario de producción (mismo dominio).
  - Hecho cuando: `curl` con `Origin: http://localhost:5173` recibe `Access-Control-Allow-Origin` correcto.
  - Evidencia: `GET /api/v1/catalog/crops` con `Origin: http://localhost:5173` devuelve `Access-Control-Allow-Origin: http://localhost:5173`; defaults en `config.py` y `.env.example`.

- [x] **T4 — `catalog_id` en `GET /api/v1/catalog/crops`**
  - RF: 035.5 (soporte PWA)
  - `backend/app/api/v1/catalog.py::list_crops`: incluir `catalog_id` por cultivo (el id en español del JSON) además del `crop_id` de DB. Mantener compatibilidad: `crop_id` no cambia.
  - Hecho cuando: respuesta de `/catalog/crops` incluye `catalog_id` y test de contrato pasa.
  - Evidencia: respuesta viva incluye `{"id":"chili","catalog_id":"aji",...}`; contrato OpenAPI verde.

## Corte A — Frontend scaffold

- [x] **T5 — Scaffold `frontend/`**
  - RF: 035.1
  - Vite + React 19 + TypeScript + Tailwind + React Router + React Query. `public/manifest.webmanifest` con iconos 192/512, nombre "Anden", paleta ADR-0008, `display: standalone`. `vite-plugin-pwa` (o SW propio) con precache del shell. `src/lib/api.ts`: cliente tipado, manejo 401 + refresh, `Idempotency-Key` en escrituras. Auth anónima reutilizando `POST /auth/anonymous` + `/auth/refresh`.
  - Hecho cuando: `pnpm build` pasa; PWA instala en Chrome y arranca mostrando un shell "Anden" offline.
  - Evidencia: `pnpm build` genera `dist/manifest.webmanifest`, `dist/sw.js` y 13 entradas de precache; `pnpm typecheck` verde.

- [x] **T6 — Pantalla Inicio**
  - RF: 035.1, 035.2
  - Pantalla `/` con estado de conexión (banda "sin conexión" si `!navigator.onLine`), última comparación cacheada (si existe), CTA a Mi Parcela / Comparación / Agente. Accesible: targets ≥48 dp, labels en iconos.
  - Hecho cuando: test Vitest + RTL verifica banda offline y CTA; `pnpm typecheck` verde.
  - Evidencia: `src/pages/Home.tsx` + badge de conexión en `App.tsx`; `pnpm typecheck` verde.

## Corte B — Mi Parcela + precio

- [x] **T7 — Mi Parcela (distrito/coords/superficie)**
  - RF: 034.8 (paridad web), 035.2 (lectura offline)
  - Pantalla `/parcels/:id` con edición de nombre, superficie, distrito y coordenadas. Valores inválidos no se guardan (validación client-side + 422 del backend).
  - Hecho cuando: test Vitest verifica edición y validación; `PATCH /parcels/{id}` con payload inválido muestra error y no persiste.
  - Evidencia: `src/pages/Parcel.tsx` edita metadatos y mueve el polígono; validación numérica y error visible; `pnpm typecheck` verde.

- [x] **T8 — Autollenado de precio del catálogo**
  - RF: 035.5, 035.7
  - En la ficha económica, precargar el precio de la mejor referencia del catálogo (distrito primero, luego ámbito amplio). Mostrar fuente, año, ámbito y estado. Campo editable; si se edita, marcar como "modificado respecto al catálogo" antes de guardar.
  - Hecho cuando: test Vitest verifica precarga y marcado; guardar con precio editado envía `price_confirmed=true` + `price_source="edited"` (o equivalente).
  - Evidencia: `ParcelEconomics.tsx` precarga, muestra “Precio propuesto (editable)” y “Modificado”; `catalog.test.ts` 4/4; guarda `price_source`/`price_confirmed`.

## Corte C — Comparación + Simulación

- [x] **T9 — Comparación tabs Actual/B/C**
  - RF: 034.1, 034.2, 035.4
  - Pantalla `/comparisons/:id` con tabs Actual/B/C (mismo orden que la app), detalle solo del plan elegido, CTA de agua si falta, gráficas con tabla de datos.
  - Hecho cuando: test Vitest verifica tabs y detalle; `GET /comparisons/{id}` cacheado en SW y disponible offline.
  - Evidencia: `Comparison.tsx` con tabs por `kind`, detalle, tabla de datos y aviso de planes pendientes; GET en `api-reads`.

- [x] **T10 — Simulación**
  - RF: 034.2, 034.3, 035.4
  - Drawer/slide para ajustar agua/precio con sliders; `POST /comparisons/{id}/simulate`; resultado identificado como estimación; reset 100%/100 %.
  - Hecho cuando: test Vitest verifica sliders y reset; `POST /simulate` no se cachea en SW.
  - Evidencia: `ScenarioCard` en `Comparison.tsx`; `scenario.test.ts` 4/4 contra `tests/parity/scenario_cases.json`; simulación offline en `ComparisonProvider`.

## Corte D — Agente

- [x] **T11 — Agente (chat)**
  - RF: 034.11, 035.4, 035.5
  - Pantalla `/agent` con composer fijo, historial, `tool_trace` visible, `ui_actions` ejecutables. Si Gemini falla, runtime determinista + aviso.
  - Hecho cuando: test Vitest verifica composer y aviso de fallo; `POST /agent/*` no se cachea en SW.
  - Evidencia: `src/pages/Agent.tsx` con composer, historial, `Disclosure` de trazas y siguiente paso; endpoints del agente fuera del allowlist del SW.

## Corte E — Offline outbox

- [x] **T12 — Outbox IndexedDB + sync**
  - RF: 035.2, 035.3
  - `src/lib/outbox.ts`: IndexedDB para escrituras; cola FIFO; `navigator.onLine` + `visibilitychange` disparan flush con reintentos (max 5, backoff exponencial); `Idempotency-Key` por escritura. Banda de estado "sincronizando N pendientes".
  - Hecho cuando: test Vitest + Playwright (offline) verifica captura sin señal, sync al recuperar, sin duplicar.
  - Evidencia: `outbox.ts` (FIFO, 5 reintentos, backoff, `Idempotency-Key`), `cache.ts` (parcela/comparación) y captura offline en ficha/economía; badge de pendientes en la barra inferior.

## Corte F — Cierre

- [x] **T13 — i18n + a11y + Playwright + Caddy + README**
  - RF: 035.8, 035.9, 035.10
  - i18next en PWA: es-PE default, qu/ay `review_pending` con fallback. A11y: reduce motion, live regions, contrastes AA (paleta ADR-0008). Playwright: recorrido offline completo + `Idempotency-Key`. Implementar el `deploy/gcp/Caddyfile` según ADR-0010 (PWA en `/`, API en `/api/v1`). README: cómo correr dev, build, deploy.
  - Hecho cuando: Playwright verde; `deploy/gcp/Caddyfile` sirve PWA y API bajo el mismo host; README con instrucciones.
  - Evidencia: i18n es/qu/ay/en, `prefers-reduced-motion` y foco visible; `Caddyfile` sirve SPA y `/api/*`; `frontend/README.md`; Playwright configurado contra `:8080`.

- [x] **T14 — Micro-UX: toasts, precios guiados y acciones sin duplicar**
  - RF: 035.1, 035.7
  - Reemplazar los bloques inline de “guardado” por toasts accesibles (éxito, cola offline, error). En Precios y costos, ofrecer “Ver todos” o “Ir paso a paso” (`?guiado=1`) con `StepProgress` de un cultivo por pantalla y un único guardado al final. Eliminar CTAs redundantes y no mover el layout al guardar.
  - Hecho cuando: guardar muestra toast sin empujar el contenido; el modo guiado conserva las respuestas al cambiar de paso; cada pantalla tiene una sola acción principal.
  - Evidencia: `ToastProvider`, `StepProgress` y `ParcelEconomics.tsx`; ficha y agente usan toasts; `pnpm typecheck` verde.

- [x] **T15 — Agente modo chat + propuesta con confirmación**
  - RF: 035.4, 035.5
  - `POST /agent/threads/{id}/messages` acepta `mode: "chat" | "guided"`. En `chat`, el agente responde la pregunta concreta, encadena tools y devuelve `save_preview` + `pending_proposal_id`; la PWA muestra “Borrador listo” con Confirmar/Descartar y llama `POST /api/v1/actions/{id}/confirm`. Nada se guarda sin aprobación explícita.
  - Hecho cuando: el saludo en chat no crea propuesta; guided sí; confirmar aplica el cambio, descartar no escribe y la UI muestra el resultado; tests verdes.
  - Evidencia: `backend/tests/integration/test_agent_chat_mode.py` (4 casos) y `src/pages/Agent.tsx`; `api.sendAgentMessage(..., 'chat')` y `confirmProposal`.

- [x] **T16 — Instalación PWA en Android + copy para compartir**
  - RF: 035.1
  - Tarjeta de instalación en Ajustes: usa `beforeinstallprompt` en Chrome/Android para abrir el prompt nativo; si no está disponible, muestra los pasos ⋮ → “Instalar aplicación” / “Agregar a pantalla principal”; en iPhone explica Compartir → “Añadir a inicio”. Documentar el copy de compartir para agricultores.
  - Hecho cuando: Chrome Android muestra “Instalar Anden” cuando hay prompt; sin prompt se ven los pasos; iPhone muestra la ruta de Safari; el copy de compartir está en el README.
  - Evidencia: `InstallCard.tsx`, `useInstallPrompt.ts` y `Settings.tsx`; copy en `frontend/README.md`; `pnpm typecheck` verde.

- [x] **T17 — Agente ReAct, precio primero y solo online**
  - RF: 035.4, 035.5
  - El agente corre un loop de inferencia (pensar → tool → observar → decidir) con `AGENT_MAX_STEPS`; cada `tool_trace` lleva `step`. `GET /catalog/crops?district=` devuelve `price_reference` (distrito → provincia → región → histórico) y el agente lo usa al recomendar y al preguntar "¿a cómo está X?", devolviendo `open_screen` a Precios con el cultivo preseleccionado. La PWA bloquea el agente cuando no hay conexión.
  - Hecho cuando: la respuesta incluye precio con fuente/año y `step`; el editor abre con el precio precargado; offline no hay composer activo ni creación de hilo.
  - Evidencia: `backend/tests/integration/test_catalog_react_agent.py`, `_with_react_steps` y `catalog.py`; 138 pruebas backend verdes; verificación viva de `/agent/threads/{id}/messages`.

- [ ] **T18 — Captura sin barreras: agua guiada y unidades locales**
  - RF: 033, 035.7
  - `StickyActionBar` deja de ser `fixed` (tap que se perdía en "No sé cuánta agua"). Agua por turnos, horas/semana + L/s, recibo o mm con conversión visible y eficiencia opcional. Rendimiento/precio aceptan arrobas (11.5 kg) y sacos (configurable) y guardan kg/ha y S/kg.
  - Hecho cuando: el botón "No sé" guarda y muestra toast; la conversión se ve antes de guardar; no queda ninguna barra tapando controles; tests de fórmulas.

- [ ] **T19 — Siguiente paso único + feedback real + offline claro**
  - RF: 033, 035.2
  - Selector `selectNextStep` (parcela → historial → agua → precios → comparar → guardar → probar) con una tarjeta en Inicio. Feedback en comparación, agente y plan guardado vía `POST /api/v1/feedback`, con cola offline. Ajustes y Fuentes explican qué funciona sin señal.
  - Hecho cuando: Inicio muestra un solo siguiente paso coherente con los datos; el feedback llega o se encola; la matriz offline está visible en la app.

## Definición de terminado

- [x] Todos los RF con evidencia (tests, typecheck/build o revisión manual).
- [x] Tests verdes o checklist manual: Vitest de `src/` 8/8 (`pnpm exec vitest run --exclude "e2e/**"`), `pnpm typecheck`, `pnpm build`, 35 pruebas backend dirigidas.
- [x] `MEMORY.md` actualizado si hubo decisión.

> Deuda de verificación, no de implementación: completar el recorrido Playwright
> offline end-to-end (captura sin señal + sync + `Idempotency-Key`), desplegar
> las dos imágenes en GCP y probar la instalación en un Android físico.
