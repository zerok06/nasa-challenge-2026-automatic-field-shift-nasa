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
- Tests: **64 pytest**, **18 tests TS** (paridad, formato y URL LAN), `pnpm
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
  `152A28DC383D5845CB4E1B0B5D05AB8BC30457FAC7535C06474B4EAA25E6E335`.
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
**Decisión:** Vertex AI con `gemini-3.5-flash` (endpoint global), function
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
