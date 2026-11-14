# Spec 027 — Release y entrega

| Campo | Valor |
|---|---|
| ID | 027 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | todos P0 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El demo debe correr de punta a punta en la laptop y en un teléfono Android, con datos etiquetados, sin secretos y con video de respaldo. Este spec cierra la entrega: Docker local, túnel, APK, Maestro, README y guion.

## Usuarios / actores

- Equipo.
- Jueces.
- Agricultores del piloto.

## Historias de usuario

- H1: Como jurado, quiero ver el recorrido completo sin instalar nada.
- H2: Como equipo, quiero un demo reproducible.
- H3: Como agricultor, quiero una app gratuita y clara.

## Requisitos funcionales (EARS)

- **RF-027.1:** CUANDO se ejecuta el runbook, EL SISTEMA levanta Docker, seed y API en < 5 min.
- **RF-027.2:** EL SISTEMA completa el smoke `parcela → comparación → escenario → agente` en < 3 min.
- **RF-027.3:** EL SISTEMA genera un APK Android instalable o un dev build equivalente.
- **RF-027.4:** EL SISTEMA expone la API por Cloudflare Tunnel o `adb reverse` con HTTPS/localhost.
- **RF-027.5:** EL SISTEMA pasa los 5 flujos Maestro contra el APK/dev build.
- **RF-027.6:** EL SISTEMA incluye video de 3–5 min, README, specs, fuentes y licencias.
- **RF-027.7:** EL SISTEMA muestra etiquetas `SIMULADO`/`historical`/`needs_review` y no afirma validación inexistente.
- **RF-027.8:** EL SISTEMA no contiene secretos y `.env` está ignorado.

## Requisitos no funcionales

- Demo reproducible en Windows.
- API local estable; sin cloud.
- APK < 100 MB.
- Video < 100 MB.
- 100 usuarios; load test documentado.
- Accesibilidad revisada.

## Casos límite

- Túnel cae → `adb reverse`/LAN/video.
- Groq falla → fake/guiado.
- Supabase no aplica (local).
- Laptop duerme → energía.
- Puerto ocupado → documentar.
- APK no instala → dev build/Expo dev client.
- Juez pide URL → video/repo/APK.

## Fuera de alcance

- Publicación en Play Store.
- Cloud Run/Supabase (futuro).
- iOS.

## Criterios de finalización

- Runbook probado.
- Smoke/Maestro verdes.
- APK + video + README.
- Sin secretos.
- Demo ensayado.

## Matriz de pruebas

| RF | Test |
|---|---|
| 027.1 | S: runbook |
| 027.2 | S: smoke |
| 027.3 | M: APK |
| 027.4 | S: tunnel/adb |
| 027.5 | E: Maestro |
| 027.6 | M: assets |
| 027.7 | M: labels |
| 027.8 | S: secrets |
