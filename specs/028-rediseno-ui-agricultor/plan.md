# Plan 028 — Rediseño de UI para agricultores

## Enfoque

1. **Quitar mapas primero** para liberar navegación y simplificar el onboarding.
2. **Extender el design system** con tarjetas de acción, chips y métricas
   grandes; sin nuevas dependencias nativas.
3. **Reordenar la información**: una pantalla = una decisión.
4. **Reescribir copy** en español peruano simple y actualizar i18n.
5. **Cerrar con evidencia**: typecheck, lint, tests TS, pytest y Maestro
   actualizado (los flujos se ejecutan cuando el emulador/Expo Go esté activo).

## Fases

| Fase | Alcance | Evidencia |
|---|---|---|
| 0 | Spec 028 + ADR-0005 + env LAN | Docs + `curl` a `/api/v1/health` |
| 1 | Retiro de mapas (rutas, componentes, testIDs, Maestro, WebView, fuentes, agente) | `grep` sin referencias; typecheck |
| 2 | Design system: `ActionCard`, `HeroCard`, `Chip`, `MetricTile`, formato `es-PE` | typecheck + test de formato |
| 3 | Navegación e Inicio nuevos; `Mi parcela` | Maestro 01 actualizado |
| 4 | Comparar y Escenario simplificados | Maestro 03/04 |
| 5 | Onboarding 3 pasos, Preguntar, Fuentes, Ajustes | Maestro 01/05/06 |
| 6 | i18n (`en`, borradores qu/ay), docs, limpieza | `pnpm lint`, `pnpm test`, pytest |

## Riesgos

- **i18n por claves en español:** cambiar copy invalida claves de `qu/ay/en`.
  Se actualizan las tres y las nuevas caen a español si falta traducción.
- **Maestro sin emulador:** los flujos se actualizan, pero la ejecución E2E
  requiere el dispositivo del usuario.
- **Modo oscuro:** el conflicto de `Appearance` se corrige moviendo el provider
  dentro de `PreferencesProvider`.
- **API en LAN:** la IP puede cambiar; se resuelve con el host de Metro y se
  documenta en `.env.example`.

## Orden de merge

Un solo cambio coherente, con tests verdes. Si se parte: Fase 1 + 3 primero
(mapas + Inicio), luego Fase 4 + 5, luego i18n.
