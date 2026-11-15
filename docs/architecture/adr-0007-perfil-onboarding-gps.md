# ADR-0007 — Perfil anónimo, onboarding con GPS y parcela guiada

- **Fecha:** 14-nov-2026
- **Estado:** aceptada
- **Relacionada:** ADR-0004 (i18n/accesibilidad), ADR-0005 (UI y mapas)
- **Alcance:** `application/`, `backend/app/models`, `backend/app/api/v1/auth.py`
- **Spec:** 030

## Contexto

El piloto pide que el agricultor cree un perfil al instalar la app, reciba un
saludo personalizado, no vea parcelas vacías y pueda registrar su primera
parcela sin depender de un chat abierto ni de un mapa. La conectividad es
intermitente y la alfabetización digital es baja.

Se evaluó usar Google Cloud Platform para geocodificación. No se adoptó en esta
fase: agrega una clave, un costo y una dependencia de red. El teléfono ya puede
obtener GPS y el geocodificador del sistema (Google Play Services) sin backend
adicional. El backend sí puede desplegarse en GCP (Spec 029); esta decisión solo
evita una API de geocodificación en la nube.

## Decisiones

### 1. Perfil anónimo en `users`

- `display_name`, `locale`, `profile_json`, `consent_version`, `consent_at`,
  `onboarding_completed_at`.
- No hay teléfono/email ni contraseña en el piloto.
- `profile_json` guarda audio, experiencia y ubicación base
  (`{lat, lon, district}`).
- Se descartó una tabla `farmer_profiles` separada para el MVP; se puede migrar
  cuando exista login real.

### 2. Onboarding de 5 pasos

1. Idioma.
2. Nombre, experiencia y audio.
3. Ubicación con GPS (o “Ahora no” / coordenadas).
4. Consentimiento.
5. Perfil listo.

- Una pregunta por pantalla, barra de progreso, targets grandes.
- El locale del dispositivo solo elige quechua/aimara; el predeterminado es
  `es-PE` para el piloto.
- El perfil se crea al final con `PATCH /auth/me`.

### 3. GPS, no GCP

- `expo-location` obtiene coordenadas.
- `Location.reverseGeocodeAsync` obtiene distrito/ciudad si el sistema lo permite.
- Si falla, se guardan coordenadas y el distrito queda nulo; no se inventa.
- No se muestra mapa.

### 4. Audio

- `expo-speech` (TTS) lee las preguntas en español con un botón “Escuchar”.
- No se implementa voz a texto en esta fase: requiere STT nativo/nube y no hay
  revisión para quechua/aimara.
- La preferencia de audio se guarda en el perfil y se puede cambiar en Ajustes.

### 5. Crear parcela: formulario guiado, no chat abierto

- Dos modos: guiado (4 pasos) y manual.
- Campos: nombre, ubicación, superficie opcional, distrito.
- El agente no crea la parcela ni inventa valores; el formulario es determinista.
- Las parcelas nuevas usan `is_simulated=false`. Los precios/costos de ejemplo se
  muestran como supuestos hasta que el agricultor los edite.

### 6. Inicio y varias parcelas

- Saludo “Hola, {nombre}”.
- Sin parcela: estado vacío con crear o probar demo.
- Con varias: selector de parcela; al cambiar, se recargan contexto e indicadores.
- Planes guardados: solo la parcela activa, máximo 5, con fecha.

## Consecuencias

**Positivas**

- El agricultor entra sin contraseña y llega a un Inicio personalizado.
- La ubicación prepara el clima sin mapa ni GCP.
- El onboarding se puede escuchar y repetir.
- La creación de parcela es clara y no depende del LLM.
- El perfil sobrevive sin red gracias a la caché local.

**Negativas / límites**

- El perfil vive en el teléfono; no hay recuperación multi-dispositivo.
- Crear el perfil requiere red la primera vez.
- El geocoder depende de Google Play Services; si falla, no hay distrito.
- El TTS no cubre quechua/aimara.
- Los costos/precios siguen siendo supuestos hasta tener edición.

## Evidencia

- `specs/030-perfil-onboarding-parcela/`.
- `backend/tests/integration/test_profile.py`.
- Prueba manual en emulador Android: onboarding, perfil, saludo, estado vacío,
  creación guiada.
- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pytest`.
