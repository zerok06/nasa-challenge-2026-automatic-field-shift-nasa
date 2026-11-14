# Spec 003 — App shell Expo + RNUI

| Campo | Valor |
|---|---|
| ID | 003 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 002 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

La app debe tener una base visual y técnica antes de construir pantallas de dominio. Usaremos **RNUI** (`react-native-ui-lib`) con Expo SDK 58 y **development build** porque `uilib-native` es un módulo nativo y Expo Go no lo soporta. Este spec valida el riesgo, define el tema, la navegación, el cliente API y el primer flujo Maestro. Android primero, para 100 agricultores.

## Usuarios / actores

- Agricultor del piloto (Android, español, conectividad intermitente).
- Dev mobile y QA.
- Agente que implementa pantallas.

## Historias de usuario

- H1: Como agricultor, quiero una app clara y legible en exteriores.
- H2: Como dev, quiero un shell con navegación y cliente API para construir features.
- H3: Como QA, quiero un build instalable y un flujo Maestro que abra la app.

## Requisitos funcionales (EARS)

- **RF-003.1:** CUANDO se ejecuta el development build en Android, EL SISTEMA arranca con RNUI y renderiza `Button`, `Card`, `Wizard` y `Timeline`.
- **RF-003.2:** EL SISTEMA carga tokens de color, tipografía y espaciado de Automatic en RNUI (`Colors`, `Typography`, `Spacings`).
- **RF-003.3:** EL SISTEMA ofrece tabs `Inicio`, `Mapa`, `Rotaciones`, `Agente` y stacks para onboarding, comparación, escenario y fuentes.
- **RF-003.4:** EL SISTEMA lee `EXPO_PUBLIC_API_URL` y envía `Authorization`/`X-Request-ID`; maneja el envelope de error.
- **RF-003.5:** EL SISTEMA muestra estados `loading`, `empty`, `error`, `offline` y `stale` sin pantallas en blanco.
- **RF-003.6:** EL SISTEMA solo usa variables `EXPO_PUBLIC_*`; no contiene secretos.
- **RF-003.7:** EL SISTEMA cumple accesibilidad: labels, roles, 44 px, dynamic type y contraste.
- **RF-003.8:** CUANDO se ejecuta `maestro test`, EL FLUJO `00-launch.yaml` abre la app y ve el dashboard placeholder.
- **RF-003.9:** EL SISTEMA registra errores/`request_id` en un logger local seguro, sin PII.

## Requisitos no funcionales

- Android primero; iOS después.
- Arranque < 3 s en dispositivo medio.
- Pantalla 5" sin solapamientos.
- Español; textos cortos; iconos con texto.
- 100 usuarios; sin dependencia de red para el shell.

## Casos límite

- RNUI 10 no compila con Expo 58 → fallback RNUI 9.1.3 (ADR).
- `uilib-native` falla en prebuild → revisar Reanimated/Babel/Gradle.
- API caída → estado error con reintento.
- `EXPO_PUBLIC_API_URL` vacía → mensaje de configuración, no crash.
- Sin red → banner offline; shell funciona.
- Pantalla pequeña / font scale grande → scroll y truncado.
- Android sin Google Maps key → el mapa (012) muestra fallback; el shell no falla.

## Fuera de alcance

- Pantallas de dominio y datos reales (004+).
- Mapa y capas (012).
- Auth completa (004).
- Offline cache (023).
- iOS build.

## Criterios de finalización

- Dev build Android instalado y arrancando.
- Tema RNUI aplicado.
- Navegación y cliente API funcionando.
- Maestro `00-launch` verde.
- ADR y docs actualizados.

## Matriz de pruebas

| RF | Test | Evidencia |
|---|---|---|
| 003.1 | M: build + componentes | captura |
| 003.2 | U: tokens | snapshot |
| 003.3 | U/E: navegación | Maestro |
| 003.4 | U: cliente API | tests |
| 003.5 | U: estados | tests |
| 003.6 | U: grep secretos + env | sin secretos |
| 003.7 | M: accesibilidad | checklist |
| 003.8 | E: Maestro | video/JUnit |
| 003.9 | U: logger | test |

## Valor para la demo

Es la cara de la app; si el shell se ve bien y es estable, el resto se construye encima.
