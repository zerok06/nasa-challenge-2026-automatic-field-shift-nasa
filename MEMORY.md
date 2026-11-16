# MEMORY — Anden (ex Automatic)

## Estado actual

- Specs redactadas: **000–032** (33 specs × 3 archivos) en `specs/`.
- Documentos de arquitectura: `docs/architecture/` (env, testing, data-model, api-surface, water-economics, map-layers, agent, security, deploy-local, ADRs).
- `.env` raíz contiene `GROQ_API_KEY`; `.gitignore` creado y verificado: `.env` está ignorado y no trackeado.
- `.env.example` creado con placeholders; pendiente completar variables y rotar la key si el workspace se compartió.

## Estado de implementación (14-nov-2026)

- Backend FastAPI + PostGIS en Docker; `/health`, `/ready`, `/api/v1/ready` responden.
- Endpoints demo: auth anónima, parcelas, contexto, catálogo, indicadores, comparación, escenario, agente y guardado.
- Mobile **Anden** con Expo Go: gluestack v5 + NativeWind 5; cuatro pestañas
  **Inicio / Comparar / Preguntar / Mi parcela**; onboarding GPS sin mapas;
  comparador, simulador, agente, fuentes y ajustes. Los mapas IMERG/NDVI se
  retiraron en Spec 028.
- i18n: `es-PE` default, `qu-PE`/`ay-PE` en borrador (`review_pending`), `en`; selector persistido en SecureStore.
- Gráficos: barras livianas con `View` + resumen accesible; se retiró
  `react-native-gifted-charts` en Spec 028.
- Branding: paleta **verde/marrón** + crema, wordmark ANDEN, icono/splash de
  terrazas y hoja. Sin azul ni naranja (ADR-0008).
- Tests: **65 pytest**, **18 tests TS** (paridad, formato y URL LAN), `pnpm
  typecheck` y `pnpm lint` verdes.
- Perfil anónimo en DB, onboarding de 5 pasos con GPS/geocoder y TTS,
  Inicio personalizado y creación de parcela guiada/manual (Spec 030).
- Ficha de parcela implementada (Spec 031): historial de cultivos, agua, suelo,
  prioridades/restricciones, progreso, guardado por paso e ilustraciones SVG.
- Datos reales: las parcelas nuevas descargan NASA POWER 2025 bajo demanda y
  guardan snapshot por parcela; no hay ETo/lluvia por defecto. La comparación
  devuelve `climate_unavailable` si NASA falla. La economía es declarada por el
  agricultor (pantalla Precios y costos); no se envían precios demo en parcelas
  nuevas. La comparación se actualiza sola al cambiar la ficha/economía.
- Flujo: creación de parcela en 2 pasos; ficha con campañas relativas; ayuda de
  agua con el agente; agente en hoja modal sin salir de la pantalla; inglés
  cubierto para las pantallas nuevas.
- Riego semanal (Spec 032): pronóstico real de Open-Meteo (7 días, ETo FAO y
  lluvia), elevación/pendiente SRTM 90 m vía OpenTopoData con fallback
  Copernicus GLO-90 etiquetado, y comparación con el agua declarada. Los datos
  de terreno se cachean en `parcels.terrain_json`. La pantalla muestra tabla
  accesible, fuentes y límites; nunca inventa agua ni elevación.
- Despliegue GCP: el resolver de la VM devolvía un edge de Open-Meteo no
  ruteable; el servicio `api` usa DNS 8.8.8.8/1.1.1.1. OpenTopoData sí resuelve
  por el resolver de la VM. Documentado en `deploy/gcp/docker-compose.yml`.
- Maestro: `00`, `01`, `03`, `04`, `05-agent-save`, `06`, `07`,
  `09-ficha-parcela` y `10-riego` verdes sobre el APK `com.anden.app`.
  Las acciones comunes del agente usan la ruta determinista (0.8 s); Gemini
  queda para preguntas abiertas. `02`/`02b` retirados. Los flujos apuntan al
  APK, no a Expo Go.
- APK de prueba: `dist/anden-0.1.0-universal.apk` (arm64 + x86_64, 63.8 MB,
  paquete `com.anden.app`, firma debug, API GCP). Instalado y probado en
  emulador; no es un APK de Play Store. SHA-256:
  `D4CE6F2C07F52C4C421049F2543283DCAB61D218B81BFC05015316B1FE60B77D`.
- Revisión 15-nov (agente Gemini, backend): orquestación por Gemini con 10 tools
  (snapshot, tendencia POWER, pronóstico, terreno, estimate_water, convert_units);
  memoria conversacional en `agent_messages`; lecturas por Gemini y escrituras
  deterministas con confirmación; modelo `gemini-3.5-flash-lite` verificado en
  endpoint global; DNS de la VM con 169.254.169.254 primero (metadata/ADC) y
  8.8.8.8 después (Open-Meteo). GCP `gcp-20261115-102633` verificado en vivo:
  lluvia semanal, tendencia 5 años, cálculo 3h×2L/s×20sem=432m³ y memoria entre
  turnos, 2–3 s sin fallback.
- Revisión 15-nov (autonomía del agente, backend, sin tocar app): el agente
  decide libremente qué tool usar y encadenarlas; se eliminó el router de
  keywords que mandaba escrituras al path determinista. Nuevas tools:
  `get_next_questions`, `propose_capture` (agua/suelo/economía/historial),
  `rank_plans` (usa `priorities` reales), `audit_parcel`, `explain_plan`,
  `get_saved_plans`; se reutiliza `get_catalog_price_reference` distrital
  existente (se eliminó duplicada). `ActionProposal` ahora acepta
  `capture_*` y `POST /actions/{id}/confirm` los aplica; "sí"/"no"
  conversacional confirma o rechaza sin LLM. Estado de sesión en
  `agent_threads.state_json`. `AgentMessageOut` suma `pending_proposal_id`
  y acción `capture_draft`/`open_screen`. Tests: 75 verdes (4 nuevos en
  `test_agent_autonomy.py`). Pendiente: deploy GCP y spec 035.
- Revisión 15-nov (captura sin barreras, Spec 033): "No sé"/"No tengo" persistentes
  en agua y suelo; parseo es-PE con eco; costo total etiquetado como total;
  economía parcial sin 500; superficie/nombre editables; feedback con cola
  offline; auto-descarga de paquete tras comparar; agente con rechazo de
  borrador y escenarios que cargan sin sacar del chat; guardrails sin falsos
  positivos ("salud", "política"). GCP `gcp-20261115-075715` verificado.
- Revisión 15-nov: se retiró la parcela demo del flujo real, se añadió un
  sistema de ilustraciones SVG en Inicio/onboarding/ficha/cards/estados, Home
  compacto con grid 2x2 y precios, caché de parcelas para arranque offline,
  feedback post-comparación y tarjeta "Tu campaña" con el plan guardado.
  Botones: `rounded-full` en todo `AppButton`; jerarquía primary (una acción
  principal) / secondary tonal / outline terciario / ghost navegación /
  destructive solo borrados; water/earth/success/warning como tonos suaves.
- Pendiente crítico: precios de referencia SISAP/MIDAGRI (hoy solo ingreso del
  agricultor), resultado real de campaña (rendimiento/precio), alertas y
  notificaciones de retorno, Kc por cultivo, validación agronómica y revisión
  nativa de quechua/aimara.
- Siguiente producto: cerrar el ciclo de campaña (decisión → seguimiento →
  resultado) y habilitar un feed de precios de referencia validado.
- Build APK: se resolvió compilando desde una copia sin espacios (`C:\anden-app`), con
  `CMAKE_OBJECT_PATH_MAX=250` y universal arm64/x86_64; el repo mantiene el
  `applicationId com.anden.app` y el label Anden. Procedimiento:
  `docs/architecture/apk-build.md`.

## Decisiones (append-only)

### 2026-11-14 — Riego semanal y terreno real (Spec 032)

**Contexto:** la ficha tenía agua declarada y clima histórico, pero no demanda
semanal ni pendiente del terreno. Open-Meteo y SRTM estaban en la lista de
pendientes.  
**Decisión:** Open-Meteo para pronóstico diario (ETo FAO, lluvia, temperatura);
SRTM 90 m de OpenTopoData para 9 muestras y pendiente; fallback Copernicus
GLO-90 etiquetado. El agua declarada se compara con la demanda semanal, nunca se
rellena. El terreno se cachea 180 días en `parcels.terrain_json`.  
**Consecuencias:** el pronóstico es una estimación, no SENAMHI; OpenTopoData
tiene límite público y la app lo declara; la ETo no incluye Kc del cultivo. La
VM usa DNS 8.8.8.8 para alcanzar Open-Meteo.  
**Docs:** `specs/032-riego-terreno/`, `deploy/gcp/docker-compose.yml`.

### 2026-11-14 — Ficha de parcela y paleta verde/marrón (Spec 031, ADR-0008)

**Contexto:** el motor necesitaba historial, agua, suelo y prioridades, pero la
app solo pedía nombre/ubicación/superficie. Además, la identidad seguía usando
azul y naranja.  
**Decisión:** ficha de 5 pasos (historial, agua, suelo, prioridades, resumen)
con “No sé” y guardado por paso; `priorities` en `preferences_json` con merge
para no borrar economía; paleta verde/marrón + crema, ilustraciones SVG propias
y estados con icono + texto.  
**Consecuencias:** la ficha requiere red para guardar; editar agua/suelo crea
una observación nueva; el motor todavía no usa las prioridades para ordenar
candidatos (siguiente spec); falta QA de contraste y micro-interacciones.  
**Docs:** `docs/architecture/adr-0008-paleta-ilustraciones-motion.md`,
`specs/031-ficha-parcela/`.  
**Spec:** `031`.

### 2026-11-14 — Perfil anónimo, onboarding con GPS y parcela guiada (Spec 030)

**Contexto:** faltaba la entrada del agricultor: perfil, saludo, estado vacío y
creación de parcela sin mapa ni chat abierto.  
**Decisión:** perfil anónimo en `users` (`profile_json`,
`onboarding_completed_at`); onboarding de 5 pasos con TTS; GPS + geocoder del
dispositivo (sin GCP); creación de parcela guiada/manual; parcelas nuevas
`is_simulated=false`; planes guardados por parcela y fecha; caché de perfil en
SecureStore y sesión conservada sin red.  
**Consecuencias:** no hay recuperación multi-dispositivo; crear perfil requiere
red; TTS solo en español; costos/precios siguen como supuestos.  
**Docs:** `docs/architecture/adr-0007-perfil-onboarding-gps.md`,
`specs/030-perfil-onboarding-parcela/`.  
**Spec:** `030`.

### 2026-11-14 — UI para agricultores y retiro de mapas (Spec 028)

**Contexto:** el piloto son agricultores con baja familiaridad digital; la app
se leía como tablero para el jurado, con jerga, texto pequeño y un mapa que solo
aportaba contexto regional.  
**Decisión:** cuatro pestañas (Inicio/Comparar/Preguntar/Mi parcela); una pantalla
= una decisión; copy en español peruano simple; mapas fuera de la UI y del
agente; patrones de claridad de Uber Eats sin copiar su marca; formato `es-PE`;
API resuelta por el host de Metro en Expo Go físico.  
**Consecuencias:** se pierde el contorno dibujado de la parcela; i18n requiere
una pasada completa; los flujos Maestro cambian.  
**Docs:** `docs/architecture/adr-0005-ui-agricultor-mapas.md`,
`specs/028-rediseno-ui-agricultor/`.  
**Spec:** `028`; `012`/`013` quedan superseded.

### 2026-11-14 — Anden: gluestack v5, i18n, gráficos y accesibilidad

**Contexto:** el MVP Paper no tenía la identidad ni la preparación de producto para el piloto; se migró a gluestack v5 + NativeWind 5 y se cerró una pasada de producto.  
**Decisión:** marca **Anden** con blanco/verde; `react-native-gifted-charts` con tablas accesibles; `i18next` + `expo-localization` con es-PE default, qu-PE/ay-PE en borrador y en; onboarding de accesibilidad + Ajustes (idioma, tema, reduce motion); WCAG 2.2 AA como objetivo. Paper se elimina.  
**Consecuencias:** 8 flujos Maestro verdes; quechua/aimara requieren revisión nativa; no hay APK; el modo oscuro necesita QA visual.  
**Docs:** `docs/architecture/adr-0004-anden-brand-i18n-charts-a11y.md`, `docs/accessibility.md`.  
**Spec:** `003`, `027`.

### 2026-11-14 - Fallback de RNUI a React Native Paper

**Contexto:** el spike de RNUI 10 + `uilib-native` falló en Windows (ProGuard/AGP 9, `wix-react-native-text-size` incompatible con RN 0.88 y rutas CMake > MAX_PATH).  
**Decisión:** usar React Native Paper (JS puro) y Expo Go para el MVP; documentar en `docs/architecture/adr-0002-paper-fallback.md`.  
**Consecuencias:** se cumple el recorrido P0 y Maestro 00-05/02b; no se cumple literalmente "RNUI + dev build"; APK queda pendiente.  
**Spec:** `003`, `027`.


### 2026-11-14 — RNUI + Expo con development build

**Contexto:** se evaluó React Native Paper para usar Expo Go, pero el equipo prefiere RNUI.  
**Decisión:** usar `react-native-ui-lib` v10 + `uilib-native` con Expo SDK 58 y development build local (Android Studio). Expo Go no es compatible con `uilib-native`.  
**Alternativas:** RNUI 9.1.3; React Native Paper; componentes RN puros.  
**Consecuencias:** build nativo desde el día 0; Maestro corre contra el dev build/APK; el spike de 003 es puerta dura.  
**Spec:** `003-app-shell-rnui`.

### 2026-11-14 — Env centralizado en la raíz

**Decisión:** un único `.env` raíz; `.env.example` versionado; la app recibe solo `EXPO_PUBLIC_*` mediante `scripts/env/sync.mjs`; la API usa `pydantic-settings`; Docker Compose usa `env_file`.  
**Consecuencias:** `GROQ_API_KEY` nunca sale del backend; `.env` debe estar en `.gitignore`; rotar la key si se compartió.  
**Spec:** `000-fundaciones`, `docs/architecture/env.md`.

### 2026-11-14 — Deploy local + túnel

**Decisión:** Docker Compose en la laptop + Cloudflare Tunnel; APK opcional para entrega y Maestro. Sin cloud en la primera semana.  
**Consecuencias:** el demo depende de la laptop y su red; documentar `adb reverse`, LAN y túnel; el código queda listo para Cloud Run después.  
**Spec:** `001`, `027`.

### 2026-11-14 — Agente Groq + fallback fake

**Decisión:** LangGraph con `LLM_PROVIDER=groq`; `fake` determinista para tests y fallback. El LLM no produce cifras.  
**Spec:** `021`.

### 2026-11-14 — Testing: unitarios + Maestro E2E

**Decisión:** pirámide con pytest, Jest/RNTL, contrato/paridad y **Maestro** contra development build/APK (no Expo Go). Flujos `00`–`06`; CI unit/contrato en PR; E2E local/pre-release.  
**Consecuencias:** `testID` estables, reset de datos, APK release para E2E; no bloquear el demo por un emulador.  
**Spec:** `003`, `027`, `docs/architecture/testing.md`.

### 2026-11-14 — Parcela sintética, código abierto y uso gratuito

**Decisión:** demo con parcela sintética etiquetada; cualquier agricultor puede crear la suya gratis; código MIT; datos con atribución.  
**Spec:** `000`, `005`, `027`.

### 2026-11-14 — Validación agronómica

**Decisión:** revisión por agrónomo local + 3–5 pruebas de usabilidad; sin revisor, el catálogo queda `needs_review` y no se presenta como recomendación validada.  
**Spec:** `008`, `027`.

### 2026-11-14 — Gemini en Vertex AI + despliegue GCP (Spec 029)

**Contexto:** el agente era determinista y el backend solo corría en la laptop;
el piloto necesita lenguaje natural y una URL HTTPS pública sin salir de los
créditos de GCP.
**Decisión:** Vertex AI con `gemini-3.5-flash-lite` (endpoint global), function
calling con tools ligadas a la parcela, guard numérico y escrituras
deterministas; VM `e2-small` con Postgres/PostGIS en Docker, Caddy + `sslip.io`,
Cloud Build/Artifact Registry y Secret Manager. Fallback `fake` si Gemini falla.
**Consecuencias:** backend en `https://34-55-141-32.sslip.io`; costo ≈ US$13/mes
+ tokens; sin historial multi-turno; el free trial vence a los 90 días; la app
apunta al dominio. Deploy de cambios: `scripts/gcp/deploy.ps1` (tests, build,
pull, Caddy y smoke); rollback con `-Tag`.
**Docs:** `docs/architecture/deploy-gcp.md`,
`docs/architecture/adr-0006-gemini-vertex-gcp-vm.md`.
**Spec:** `029`.

## Riesgos abiertos

| Riesgo | Estado | Mitigación |
|---|---|---|
| `.env` real sin `.gitignore` | **resuelto** | `.gitignore` + verificación; rotar key si se compartió |
| RNUI 10 (3 días de publicado) + Expo 58 | alto | spike de 4 h en 003; fallback RNUI 9.1.3 con ADR |
| `uilib-native` en build Android | alto | build temprano con Android Studio; documentar |
| Google Maps key para APK | medio | GCP offer; fallback de mapa |
| Maestro necesita APK | resuelto para pruebas | APK universal de debug en `dist/` e instalado en emulador |
| Groq rate limits | medio | `fake`/guided; reintentos acotados |
| IMERG requiere Earthdata | medio | snapshot pre-descargado; GIBS+POWER |
| 100 usuarios en laptop | bajo | 10 concurrentes, pool, índices, load test |


### 2026-11-15 - Planes interactivos y precios del catalogo (Spec 034)

**Decision:** el comparador muestra Plan A/B/C como pestanas y solo expande el
plan seleccionado. El simulador comparte esa seleccion y permite ajustar agua
/disponibilidad y precio como porcentajes editables de la base; 100% conserva el
dato actual y reset no muta la comparacion.

**Catalogo:** la ficha economica precarga el precio 2025 mas cercano disponible
por cultivo y distrito, con ano, fuente, ambito y estado de cotejo visibles. Es
una referencia editable, no un precio confirmado ni una prediccion. El agente
consulta el JSON y cita el origen; el Dockerfile incluye el catalogo.

**Captura:** Mi parcela edita distrito y coordenadas (mantiene el poligono al
moverlo); el plan sin dato de agua enlaza directamente al paso de agua; guardar
?No se? confirma el resultado. El acceso al pronostico semanal queda desactivado
sin conexion y la hoja del agente respeta el area segura y el teclado.

**Idioma:** quechua/aimara siguen `review_pending`; se mantiene el fallback
espanol y el aviso de borrador hasta revision por hablantes nativos.

**Evidencia local:** `pnpm typecheck`, `pnpm lint` y `python -m compileall` pasan.
No se ejecutaron suites de pruebas en esta tarea.
**Spec:** `specs/034-planes-interactivos/`.


### 2026-11-15 - Intro, portadas y entrega Android (Spec 034)

**UX:** primera apertura muestra tres slides breves antes del onboarding; la
preferencia queda guardada localmente. Cada parcela recibe de forma estable una
portada ilustrativa offline entre tres fotos generadas; la interfaz indica que
la imagen es ilustrativa y no representa una foto real del terreno. Icono,
splash y marca usan la guía visual ANDEN entregada por el usuario.

**Evidencia final:** `pnpm typecheck`, `pnpm lint`; 3 pruebas backend dirigidas
para catálogo/bundle/contrato; APK Android release construida, instalada por ADB
y Maestro con 11/11 flujos aprobados (JUnit en
`artifacts/maestro-final-2026-11-15/junit.xml`). APK universal en
`dist/anden-0.1.0-universal.apk`, también copiada al Escritorio; tamaño
66,768,911 bytes; SHA-256
`DA7C117EAA4376813DC07275FB00954B0FFA224AD6382279D8BBA8E9C16FB918`.

**Alcance de entrega:** firma debug para pruebas; backend y Dockerfile tienen
cambios locales sin commit ni despliegue remoto. La app conserva referencias
locales de precio para uso sin conectividad.
**Spec:** `specs/034-planes-interactivos/`.


### 2026-11-15 - Precio propuesto, riego y revisión de introducción

**Precio:** se confirmó que la app sí llamaba `GET /api/v1/catalog/crops`, pero
el servicio desplegado aún devuelve `catalog_version=v0.1` sin
`prices_chacra_2025`. El catálogo usa ids españoles (`papa`, `aji`, `cebolla`)
y la tabla de cultivos usa ids ingleses (`potato`, `chili`, `onion`); la ficha
no encontraba coincidencias. Se agregó normalización de ids, combinación de
referencias de API/bundle/JSON local y mapeo backend `crop_id` para API/bundle.
El precio histórico aparece dentro del input como valor editable, con
fuente/año/ámbito y aviso de cotejo. Los costos de producción siguen siendo
captura propia porque el catálogo no tiene costos confiables.

**Riego:** el endpoint protegido de parcela existe en OpenAPI. El riego semanal
usa Open-Meteo (no NASA POWER, que es histórico); la consulta directa a
Open-Meteo respondió con siete días. Se mejoró el parseo de errores FastAPI
`detail`, el mensaje visible y el reintento. Maestro `10-riego` pasó.

**Introducción:** el fondo/degradado cubre el viewport y las slides 2/3 tienen
flecha outline para volver; comprobado con screenshot y Maestro `00-intro`.

**Verificación:** app typecheck/lint pasan; `pnpm test` 20/20; 3 pruebas
backend dirigidas pasan; Maestro `12-precios` pasó con precio `0.9`, referencia
`DRA25 · 2025 · Moquegua`; build Android `assembleRelease` e instalación ADB
exitosos. Evidencia: `artifacts/final-ui-review/intro-fullscreen.png` y
`artifacts/final-ui-review/prices-prefilled.png`. APK final en `dist/` y
Escritorio; 111,423,607 bytes; SHA-256
`42B4DF312D673CADDF669AC18CA3445453552A252CF11BEA8211E07E42D62D49`.

**Límites:** la actualización local del endpoint de precios aún no está
desplegada; la app usa el JSON local mientras tanto. La auditoría estática de
feedback recomienda definir si simulación recalcula métricas o regenera planes;
confirmó que la lista económica no colapsa y que no se puede cambiar la
portada ni ver coordenadas usadas por Riego. También identificó una posible
falta de comparación base al abrir simulación desde el agente. Estos puntos
quedan como siguientes mejoras, no incluidos en este APK.

### 2026-11-15 - Coherencia Actual/Ejemplo y auditoría de alternativas

**Corrección aplicada:** `PlanSelector` ya no presenta Plan A/B/C por posición;
usa `kind` para mostrar Actual, Ejemplo o la etiqueta de Alternativa B/C. La
pantalla de comparación corrige el título de las filas/gráfica cuando el primer
registro es un ejemplo, y el simulador nombra el baseline como actual/ejemplo.
El orden de planes se conserva porque backend/agente consumen índices/ids
estables. Se actualizó spec 034, ADR-0009 y Maestro `03-compare`.

**Hallazgos adicionales:** `services/rotations.py` construye candidatos de forma
independiente de `preferences.economics`, por tanto no filtra hoy por precios
cargados; sin embargo, las alternativas están fijas a dos secuencias y tres
cultivos. `rank_plans` asigna 0.5 a margen cuando no es calculable y solo tiene
prioridades agua/margen/suelo (no presupuesto), lo que puede sugerir una
comparación económica sin evidencia. El formulario precarga el precio del JSON,
pero al guardar marca globalmente `price_assumption_type=historical` sin una
confirmación explícita por cultivo. `_plan_economics` deja margen nulo si falta
precio, rendimiento o costo, pero debe verificarse la política de costos parciales.
Estos cambios quedaron como RF-034.21/22 y fases de corrección en `plan.md`.

**Verificación:** `pnpm typecheck`, `pnpm lint` y `pnpm test` (20/20) pasan.
APK actualizado pendiente: Gradle llegó a empaquetar JS, pero el build nativo
falló en `react-native-screens` y `react-native-worklets` porque Ninja informa
`build.ninja still dirty after 100 tries` durante regeneración repetida. El APK
en `dist/` es la versión previa, no contiene esta corrección. Maestro no se
corrió contra este cambio; el flujo se actualizó y requiere build exitoso.

**Build update:** el JDK 21 y Maestro 2.12.1 existen localmente. También falló
`gradlew clean`: las tareas nativas `react-native-worklets` (regeneración de
CMake sin encontrar `fbjni`) y `react-native-screens` (manifiesto Ninja dirty)
impiden la limpieza oficial. Por eso se conservó el APK previo y no se ejecutó
Maestro contra una versión con esta corrección.

### 2026-11-15 - Alternativas, confirmación económica y portada de parcela

**Implementación:** `build_plan_drafts` ahora deriva secuencias de dos cultivos
familia/duración compatibles desde todo el catálogo, sin consultar precios.
Comparación conserva el baseline y selecciona B/C con las prioridades soportadas
(agua, margen y presupuesto). Las métricas faltantes quedan `None`; el tool del
agente devuelve `sin datos` y no inventa un puntaje económico. Se agregó el eje
presupuesto a la ficha de prioridades. El margen sigue nulo si falta precio,
rendimiento o costo.

El precio del JSON aparece como estimado editable y requiere tocar «Confirmar
este precio estimado». Cambiar monto o unidad revoca esa confirmación; solo un
precio aceptado se guarda como referencia histórica. La API guarda por cultivo
fuente/confirmación/procedencia y el motor ignora una referencia no confirmada.
En «Mi parcela», el banner de foto tiene altura fija y degradado absoluto a toda
la portada; las métricas aparecen debajo en una superficie opaca.

**Verificación:** app typecheck/lint, 20/20 pruebas; backend 81/81 pruebas.
Maestro no se ejecutó porque no se pudo generar una APK nueva. Gradle genera el
bundle JS, pero la tarea nativa falla: CMake produce rutas de objeto de más de
250 caracteres y Ninja no puede crear el directorio `CMakeFiles/.../C_/Users/...`.
El build desde unidad `W:` también resolvió la ruta física larga. El APK en `dist/`
no se reemplazó y corresponde al hash previo:
`42B4DF312D673CADDF669AC18CA3445453552A252CF11BEA8211E07E42D62D49`.

### 2026-11-15 - Correcci�n visual de la ficha de parcela

La portada de `SectionCard` fuerza ahora ancho completo; el contenido inferior usa el color opaco de superficie del tema claro/oscuro, y el bloque interno llena el ancho. Esto atiende la captura donde la foto se extend�a visualmente detr�s de Superficie/Distrito/Ubicaci�n y el encabezado no ocupaba todo el banner. Verificaci�n de c�digo: `pnpm typecheck`, `pnpm lint` y `git diff --check` pasaron. No se pudo verificar con una APK nueva: el build Android contin�a bloqueado por las rutas largas de CMake/Ninja indicadas arriba.

**APK build completion:** se gener� correctamente Release desde la copia temporal `C:\b` con `-PreactNativeArchitectures=arm64-v8a` y CMake staging en `C:\y`. APK arm64 de Anden 0.1.0 copiada a `C:\Users\Jose Paye\Desktop\anden-0.1.0-arm64-v8a.apk`; 39,926,803 bytes; SHA-256 `69D4BB246313CFB0834C9FE39173D46D8C57328CE0230CA8EFD1DFCBC1A9D36B`. `aapt dump badging` confirma `com.anden.app` y ABI `arm64-v8a`; la copia de Escritorio coincide con el hash de salida.

### 2026-11-15 - Auditoría P0: margen, planes pendientes y precios por provincia

**Implementación:** el margen de un plan ahora exige ingreso y costos completos.
Si falta precio (o no está confirmado), rendimiento, costo o superficie, el margen
queda nulo; solo se conserva el presupuesto declarado cuando está completo. La
selección conserva el baseline y reserva al menos una alternativa con margen
conocido cuando existe; el resto se expone en `pending_plans` y la comparación
deduplica por conjunto de cultivos. Los precios de referencia resuelven
distrito→provincia con el territorio del catálogo y nunca usan una provincia ajena
ni el departamento cuando el distrito es conocido (backend y app). El seed del
catálogo deduplica ids que colapsan al mismo cultivo (maíz amiláceo/choclo) y
normaliza duraciones en meses/semanas a días; tolera celdas KC nulas.

**Migración:** `init_db` agrega `crops.catalog_id`, `crop_type`,
`duration_min_days`, `duration_max_days` y su índice de forma idempotente.

**Tests recreados:** `test_comparison_economics.py` (8), `test_price_catalog.py`
(7), `test_ranking.py` (8), `test_rotations.py` (7), `test_seed_catalog.py` (5) y
`priceReferences.test.ts` (6). **Verificación:** backend 106/106; app 24/24;
`pnpm typecheck`, `pnpm lint` y `git diff --check` sin errores.

**Maestro:** se alinearon `03-compare.yaml` (pestañas B/C condicionales y aviso de
alternativas pendientes) y `12-precios.yaml` (scroll a cebolla entre los 25
cultivos del catálogo, confirmación del precio estimado y nota de margen
pendiente). Ambos se ejecutaron en el emulador x86_64 con la APK release y
pasaron (`MAESTRO_EXIT=0`). `parcel-create.yaml` marca `hideKeyboard` como
opcional para evitar fallos intermitentes del teclado. La suite completa
(`maestro test application/.maestro/flows`) ejecutó los 12 flujos numerados y
todos pasaron, incluido `12-precios` (5m 27s). El comando termina con código 1
porque el directorio también contiene cinco subflujos (`intro-skip`,
`onboarding-profile`, `parcel-create`, `load-demo`, `navigate-back`) que solo
tienen sentido dentro de `setup.yaml` vía `runFlow`; ejecutados sueltos fallan
por estado, no por regresión de la app.

**APK arm64 con fixes P0 (15-nov 17:35):** reconstruida desde `C:\b\android` tras
verificar que `src`, `assets`, configs y `.env.local` están sincronizados con el
repo; `gradlew.bat assembleRelease -PreactNativeArchitectures=arm64-v8a` con
`CMAKE_OBJECT_PATH_MAX=128` y staging `C:/y`. Exportada a
`C:\Users\Jose Paye\Desktop\anden-0.1.0-arm64-v8a.apk`; 39.944.731 bytes;
SHA-256 `9C8672A8D79888E8646B2BD145A7CB5D05C9ABE5D660D4721A918B4DDF6895D3`.
`aapt` confirma `com.anden.app`, versión `0.1.0` y ABI `arm64-v8a`; el bundle
incluye el copy P0 (`Precio confirmado`, `Referencia del catálogo`).

**Backend en GCP actualizado (15-nov 18:01):** se desplegó la imagen
`gcp-20261115-175854` (Cloud Build SUCCESS). La nube respondía solo 8 cultivos y
0 precios; tras el redeploy `GET /api/v1/catalog/crops` devuelve 24 cultivos y
270 precios. El smoke pasó: `health=ok ready=ready compare=155 chars
save=save_plan_draft`. Se ajustó `smoke.ps1` para aceptar `save_plan_draft` en
cualquier posición de `ui_actions` (Gemini puede emitir también
`open_comparison` en el mismo turno) y `deploy.ps1` para silenciar el warning de
gcloud que PowerShell trataba como error.

**Paridad APK/emulador:** el APK exportado y la app instalada en el emulador
comparten el mismo bundle JS (SHA-256
`76F3CF5811B6ABFF87BE782D31E56D264FDF1D687C81DD7A5989631F290355DF`), verificado
extrayendo `assets/index.android.bundle` de ambos APK. El APK apunta a
`https://34-55-141-32.sslip.io` vía `EXPO_PUBLIC_API_URL` en `.env.local`.

**Pendiente de precios:** 8 cultivos con id en inglés no cruzan con los ids
españoles del catálogo de precios (`corn`, `carrot`, `lettuce`, `beetroot`,
`sweet_potato`, `green_pea`, `pickle_cucumber`, `cauliflower`); no muestran
sugerencia aunque el dato exista. El mapeo propuesto está verificado contra el
JSON local (los 8 tienen referencia para Moquegua) pero requiere rebuild.

### 2026-11-15 - Plan guardado con alternativa y revisión (P0)

**Implementación:** la app ya puede cerrar el ciclo comparar → elegir → guardar →
revisar. `POST /api/v1/saved-plans` acepta `comparison_id`, `preferred_plan_id` y
`fallback_plan_id`; valida que la comparación y ambos planes pertenezcan a la
parcela del usuario y que preferido ≠ alternativa. La tabla `saved_decisions`
guarda una foto (`snapshot_json`) del plan preferido, la alternativa, el periodo
y los umbrales de agua/margen. `GET /api/v1/saved-plans/{id}/review` recalcula con
los motores actuales y devuelve alertas por caída de agua, déficit nuevo, caída
de margen, cambio de estado o plan ya no disponible; no usa el LLM. La migración
es idempotente en `init_db` (el proyecto aún no usa Alembic).

**App:** nuevas rutas `plan-save` y `plan-review`; el comparador ofrece «Elegir y
guardar mi plan», Inicio y Mi parcela enlazan «Revisar plan», y la revisión
distingue un plan legacy sin snapshot. Los planes guardados por el agente siguen
funcionando como borradores.

**Verificación:** backend 112/112; `pnpm test` 24/24; `pnpm typecheck`, `pnpm lint`
y `git diff --check` pasan. Maestro no se ejecutó por indicación del usuario.

**APK:** build release universal (`arm64-v8a`, `x86_64`) desde `C:\b` el
2026-11-15; `dist/anden-0.2.0-universal.apk` (63.1 MiB, 66.201.603 bytes,
SHA-256 `BCD00AFDADBF8461AB3CAAD3463C410C02E13D5CB47E90CBF2E6F268BAD730D1`),
copia en Escritorio `anden-0.2.0.apk`. Paquete `com.anden.app`, versionName
0.2.0, versionCode 2, firma debug. `aapt`, `zipalign` y `apksigner verify` pasan.

### 2026-11-15 - Spec 035 PWA web: documentación cerrada (sin código)

**Decisión:** la PWA se documenta como spec 035 (P2, app web) sobre el mismo
backend y host `sslip.io`, con Caddy sirviendo `/` (build web) y `/api/v1`
(proxy al backend). Precio del catálogo prellenado y editable; offline de
lectura + captura + cola de sincronización; quechua/aimara como borrador con
`review_pending`. ADR-0010 registra el despliegue.

**Artefactos:** `specs/035-pwa-web/{spec,plan,tasks}.md` (v0.2, completos y
listos para aprobación), `docs/architecture/adr-0010-pwa-mismo-dominio-caddy.md`
y `specs/README.md` actualizado.

**Verificado para el plan:** `CATALOG_ID_MAP` de
`backend/app/use_cases/seed.py` ya cubre los 8 cultivos pendientes; `corn` mapea
a `maiz_amilaceo` y `maiz_choclo` (ambos con precios), así que el alias debe
desempatar por la referencia disponible. El backend aún no expone `catalog_id`,
no usa `marketable_share` y CORS no incluye `:5173`/`:4173`; `frontend/` no
existe.

**Estado:** no se escribió código. Las puertas 1–3 (spec, plan, tasks) quedan
pendientes de aprobación del usuario para iniciar T1.

### 2026-11-15 - Spec 035 PWA: paridad web, micro-UX y agente chat

**Contexto:** la app Android ya cubría el recorrido del piloto, pero faltaba una
PWA instalable para el jurado y para agricultores con navegador. Se optó por un
port que reutiliza el mismo backend y los mismos motores, sin duplicar lógica
agronómica ni mantener dos instancias.

**Paridad de diseño:** `frontend/` es un port del sistema nativo. Usa los mismos
tokens (`frontend/src/design/tokens.ts` es espejo de
`application/src/design-system/tokens.ts`), la misma paleta verde/marrón/crema
(ADR-0008), los mismos iconos Lucide, las mismas ilustraciones SVG y las mismas
cuatro pestañas (Inicio, Comparar, Preguntar, Mi parcela) más la intro de tres
diapositivas. Los textos en español son las claves de i18n, igual que en la app:
es-PE es la fuente y quechua/aimara siguen `review_pending` con fallback.

**Datos y micro-UX:** la parcela demo usa precios sintéticos confirmados
(`price_confirmed=true`, `price_source=demo`) para que el margen se calcule en
la demo; siguen siendo editables y no se presentan como precio de mercado. El
catálogo prellena el precio editable y Precios y costos ofrece “Ver todos” o
“Ir paso a paso” (`?guiado=1`) con un cultivo por pantalla y un solo guardado al
final. Los guardados usan toasts accesibles en vez de bloques que empujan el
layout; se retiraron CTAs duplicados. La barra inferior muestra
En línea/Sin conexión y pendientes de envío, en lugar de la banda de
sincronización.

**Agente:** `POST /agent/threads/{id}/messages` acepta `mode: "chat"` (web) o
`"guided"` (Android). En chat el agente responde la pregunta concreta, puede
encadenar tools y devuelve `save_preview` y `pending_proposal_id`. La PWA muestra
“Borrador listo” con Confirmar/Descartar; solo `POST /api/v1/actions/{id}/confirm`
escribe. Sin internet el agente se desactiva con un aviso y las sugerencias
siguen visibles.

**Offline y despliegue:** Workbox precachea el shell, iconos y portadas;
`NetworkFirst` cubre GET de catálogo, parcelas, comparaciones, planes guardados
y `auth/me`, y el riego se cachea 10 minutos. Las escrituras de ficha y precios
van a un outbox IndexedDB FIFO (5 reintentos, backoff exponencial,
`Idempotency-Key`); parcela y última comparación viven en localStorage; el
escenario se estima en el navegador con paridad con `services/scenario.py`.
Docker tiene `frontend` (Vite dev en :5173 con HMR) y `web` (build de
`deploy/gcp/Dockerfile.web` + Caddy en :8080, proxy `/api` y `/ready`, `sw.js` y
manifest sin caché). Producción usa el mismo dominio (ADR-0010); `_VITE_API_URL`
vacío evita CORS. Ajustes incluye una tarjeta de instalación con
`beforeinstallprompt` en Android y pasos Compartir → Añadir a inicio en iPhone.

**Evidencia:** `pnpm typecheck`, Vitest de `src/` (8/8, excluyendo `e2e/`) y
`pnpm build` con service worker pasan; 35 pruebas backend dirigidas (catálogo,
economía, chat) verdes;
respuesta viva de `/api/v1/catalog/crops` incluye `catalog_id` y CORS acepta
`:5173`. `frontend/e2e` tiene la configuración de Playwright contra :8080. El
deploy GCP de las dos imágenes y la instalación en un Android físico quedan
pendientes de la puerta 5.

**Docs:** `frontend/README.md`, `deploy/gcp/README.md`,
`specs/035-pwa-web/` y `docs/architecture/adr-0010-pwa-mismo-dominio-caddy.md`.
**Spec:** `035`.

---

## 2026-11-15 — Auditoría de lógica, ReAct y captura sin barreras

**ReAct:** el agente corre un loop de inferencia explícito (pensar → usar una
tool → observar → decidir) con presupuesto `AGENT_MAX_STEPS=5`. Cada
`tool_trace` lleva `step` (1-based) y el prompt prohíbe exponer el razonamiento
interno; la UI muestra "Cómo llegué a esto" con el resumen de cada paso. Gemini
usa function calling; el runtime determinista ejecuta el mismo patrón (observa
la parcela, luego compara/consulta precio/simula).

**Precio primero:** `GET /catalog/crops?district=` devuelve `price_reference`
por cultivo (distrito → provincia → región → histórico), con año, ámbito,
fuente e `is_local`. El agente responde "¿a cómo está el ají?" desde el catálogo
y devuelve `open_screen` a `/parcela/economia?crop=<db_id>&guiado=1`; las
recomendaciones incluyen el precio editable del cultivo principal. Si la
referencia no es local se etiqueta como regional; nunca se inventa.

**Solo online:** el agente se deshabilita por completo sin conexión (sin crear
hilo, sin sugerencias accionables, composer bloqueado) con un aviso explícito.
Riego de la semana también exige señal.

**Captura:** se corrigió la barra fija que interceptaba clics (causa del botón
"No sé cuánta agua" muerto): `StickyActionBar` es `sticky` en flujo. El agua se
captura por turnos, horas/semana + L/s, recibo o mm, con conversión visible
(1 mm = 10 m³/ha) y eficiencia opcional. Rendimiento y precio aceptan
arrobas/sacos (arroba 11.5 kg, saco 50 kg configurable) y guardan kg/ha y S/kg.

**Guía y feedback:** un selector de siguiente paso (parcela → historial → agua →
precios → comparar → guardar → probar) alimenta una tarjeta única en Inicio.
Se agrega feedback real en comparación, agente y plan guardado con
`POST /api/v1/feedback` (rating + comentario + contexto), encolado offline.

**Deploy:** DuckDNS opcional con `deploy.ps1 -Domain anden.duckdns.org`;
`-LegacyDomain` agrega 301 al dominio viejo. El `Caddyfile` se monta desde la VM
(cambiar dominio/redirect no exige reconstruir la imagen web); HTTP→HTTPS y
fallback SPA son automáticos. `deploy.ps1` construye `api` y `web`, corre tests
del PWA y el smoke verifica `/`, manifest, `sw.js` y deep link.

**Evidencia:** 138 pruebas backend verdes; respuesta viva del agente con `step`
y `open_screen`; `pnpm typecheck` limpio.

**Spec:** `035`.
