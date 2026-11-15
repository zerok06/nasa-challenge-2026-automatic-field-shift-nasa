# Spec 030 — Perfil, onboarding con ubicación y creación de parcela

| Campo | Valor |
|---|---|
| ID | 030 |
| Estado | Implementado (E2E pendiente en dispositivo) |
| Prioridad | P0 |
| Dependencias | 004, 005, 028 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

La app ya tiene el rediseño de Inicio, comparación, escenario y agente. Falta
cerrar la entrada del agricultor: un perfil real, un onboarding de una pregunta
por paso, preferencias iniciales ayudadas por la ubicación y una creación de
parcela guiada que no dependa de un chat abierto ni de un mapa.

El objetivo es que un agricultor nuevo pueda, sin contraseña:

1. Elegir idioma.
2. Decir su nombre y experiencia.
3. Usar su ubicación (o escribir coordenadas) para preparar el clima.
4. Aceptar el uso de datos.
5. Llegar a un Inicio personalizado.
6. Crear su primera parcela con un formulario guiado o manual.

## Usuarios / actores

- Agricultor nuevo (Android, baja familiaridad digital).
- Agricultor recurrente con una o más parcelas.
- Agrónomo/jurado que revisa el perfil y la trazabilidad.

## Historias de usuario

- H1: Como agricultor nuevo, quiero crear mi perfil sin contraseña.
- H2: Como agricultor, quiero que la app use mi ubicación para preparar el clima
  de mi zona, sin mostrarme un mapa.
- H3: Como agricultor, quiero escuchar las preguntas si me cuesta leer.
- H4: Como agricultor, quiero crear mi parcela paso a paso o con un formulario.
- H5: Como agricultor recurrente, quiero ver “Hola, Juan” y elegir entre mis
  parcelas.
- H6: Como jurado, quiero que el perfil y la parcela queden en la base de datos
  con consentimiento y fuente.

## Requisitos funcionales (EARS)

- **RF-030.1:** EL SISTEMA crea una sesión anónima y un perfil con `display_name`,
  `locale`, `profile_json`, `consent_version` y `onboarding_completed_at`.
- **RF-030.2:** EL SISTEMA muestra 5 pasos: idioma, nombre/experiencia/audio,
  ubicación, consentimiento y listo.
- **RF-030.3:** EL SISTEMA usa el locale del dispositivo solo para elegir
  quechua/aimara; el predeterminado del piloto es `es-PE`.
- **RF-030.4:** EL SISTEMA usa GPS y el geocodificador del dispositivo para
  prellenar distrito/coordenadas; no muestra mapas.
- **RF-030.5:** SI el GPS falla o se niega, ENTONCES EL SISTEMA permite continuar
  sin ubicación o escribir coordenadas manuales.
- **RF-030.6:** EL SISTEMA ofrece “Escuchar” con TTS en español en onboarding y
  creación de parcela; no hay voz a texto en esta fase.
- **RF-030.7:** EL SISTEMA muestra “Hola, {nombre}” en Inicio y un estado vacío
  con “Crear mi parcela” y “Probar con datos de ejemplo” cuando no hay parcela.
- **RF-030.8:** EL SISTEMA permite elegir entre varias parcelas desde Inicio.
- **RF-030.9:** EL SISTEMA permite crear una parcela en modo guiado (4 pasos) o
  manual, con nombre, ubicación, superficie opcional y distrito.
- **RF-030.10:** LAS parcelas creadas por el agricultor se guardan con
  `is_simulated=false`; los precios/costos de ejemplo se muestran como supuestos.
- **RF-030.11:** EL SISTEMA cachea el perfil en SecureStore y conserva la sesión
  guardada cuando la API no responde por falta de red.
- **RF-030.12:** EL SISTEMA limita “Mis planes guardados” a la parcela activa y a
  los 5 más recientes, mostrando fecha.
- **RF-030.13:** EL SISTEMA permite editar nombre y preferencia de audio desde
  Ajustes.

## Requisitos no funcionales

- Android primero; targets ≥48 dp; texto mínimo 14/16.
- Funciona con una sola mano y sin gestos ocultos.
- Sin nuevas dependencias nativas fuera de Expo Go (`expo-speech`).
- i18n: `es-PE` fuente; qu/ay en borrador; `en` actualizado.
- Sin secretos ni contraseñas de Wi-Fi en el repo.

## Fuera de alcance

- Login con teléfono/email y recuperación multi-dispositivo.
- Voz a texto y audios grabados con voz humana.
- Google Cloud Platform / geocodificación en la nube.
- Edición avanzada de costos, precios y análisis de suelo.
- Mapas.

## Criterios de finalización

- Perfil creado y visible en `/auth/me`.
- Inicio saluda por nombre y muestra estado vacío.
- Parcela creada en modo guiado y manual.
- `is_simulated=false` en parcelas nuevas.
- Tests backend, typecheck, lint y Maestro actualizados.

## Matriz de pruebas

| RF | Test / evidencia |
|---|---|
| 030.1 | `test_profile.py` |
| 030.2 | Prueba manual onboarding 5 pasos |
| 030.3 | `PreferencesProvider` + prueba manual |
| 030.4 | Prueba manual GPS / geocoder |
| 030.5 | Prueba manual “Ahora no” y coordenadas |
| 030.6 | `SpeakerButton` + prueba manual |
| 030.7 | Maestro `01` y `load-demo` |
| 030.8 | Prueba con 2 parcelas |
| 030.9 | Prueba manual guiado/manual |
| 030.10 | Revisión API + nota en Mi parcela |
| 030.11 | Prueba sin red con sesión guardada |
| 030.12 | Maestro `07-parcel` |
| 030.13 | Prueba manual Ajustes |
