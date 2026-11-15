# Despliegue local y túnel

> Actualización 2026-11-14: el demo también corre en GCP (VM `e2-small` +
> PostGIS + Gemini 3.5 Flash). Ver `deploy-gcp.md`. Este documento queda como
> guía local y de respaldo.

## Decisión

Demo con **Docker Compose en la laptop** + **Cloudflare Tunnel** para que el teléfono llegue por HTTPS. Sin cloud en la primera semana. APK opcional para entrega/E2E.

## Componentes

```text
Laptop
├── docker compose: db (PostGIS) + api (FastAPI) + migrate + seed
├── cloudflared tunnel → https://<random>.trycloudflare.com → localhost:8000
├── Metro / Expo dev build → teléfono Android por LAN o túnel
└── Maestro → dev build/APK
```

## Pasos

```bash
# 1. Env (no sobrescribir un .env existente con la key real)
# Si no existe: cp .env.example .env
pnpm env:check

# 2. Backend
docker compose up --build -d
curl http://localhost:8000/api/v1/ready

# 3. Túnel (opción A: HTTPS para el teléfono)
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:8000

# 4. Apuntar la app al túnel
# editar EXPO_PUBLIC_API_URL en .env y ejecutar:
pnpm env:sync

# 5. Mobile (MVP: Paper + Expo Go)
cd application
pnpm install
pnpm start -- --localhost
# Abrir exp://127.0.0.1:8081 en Expo Go
```

### Opción B: USB (más estable)

```bash
adb reverse tcp:8000 tcp:8000
# EXPO_PUBLIC_API_URL=http://localhost:8000
```

### Opción C: LAN

- Teléfono y laptop en la misma Wi-Fi.
- `EXPO_PUBLIC_API_URL=http://<IP-LAN>:8000`.
- Abrir firewall en 8000 y 8081.
- Si Android bloquea HTTP, usar el túnel HTTPS.

## APK (pendiente)

El MVP corre en Expo Go con gluestack v5 + NativeWind 5. Para un APK:

```bash
cd application
npx expo prebuild --clean
npx expo run:android --variant release
```

- No hay mapas ni WebView desde Spec 028; no se requiere `GOOGLE_MAPS_API_KEY`.
- El APK apunta a `EXPO_PUBLIC_API_URL`; para un teléfono en la misma Wi-Fi debe
  ser `http://<ip-lan>:8000`, no `localhost`.
- En Expo Go, Metro debe arrancar en modo LAN (`pnpm start -- --lan`).
- Instalar en un dispositivo limpio antes del demo.
- No se generó ni validó un APK en esta entrega; no afirmarlo en el pitch.

## Maestro

```bash
# MVP: contra Expo Go abierto en exp://127.0.0.1:8081
cd application
maestro test .maestro/flows
```

## Checklist de demo

- [ ] Laptop enchufada; suspensión desactivada.
- [ ] `docker compose ps` sano; `/ready` 200.
- [ ] Túnel activo; URL actualizada en `.env` y `env:sync`.
- [ ] Teléfono cargado; Expo Go con el proyecto abierto (o APK si se genera).
- [ ] Datos seed; 3 planes; escenarios; LLM o `fake`.
- [ ] Modo avión probado (si 023).
- [ ] Video de respaldo descargado.
- [ ] Túnel apagado después del demo.

## Limitaciones

- El demo depende de la laptop y su red.
- El túnel es efímero; la URL cambia.
- Sin cloud no hay APK “siempre disponible” para jueces; se entrega video + APK + repo.
- Migrar a Cloud Run después es directo: la imagen ya escucha `$PORT`.

## Seguridad

- Exponer solo la API; nunca Postgres.
- Datos demo; rate limits; apagar el túnel.
- No usar la URL del túnel en capturas con datos reales.
