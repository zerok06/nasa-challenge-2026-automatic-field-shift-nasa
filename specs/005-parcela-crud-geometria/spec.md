# Spec 005 — Parcela: CRUD y geometría

| Campo | Valor |
|---|---|
| ID | 005 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 004 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

La parcela es la entidad central: sin ella no hay mapa, clima ni comparación. Debe aceptar un punto aproximado o un polígono, permitir área desconocida y no inventar precisión. El demo usa una parcela sintética; cualquier agricultor puede crear la suya gratis.

## Usuarios / actores

- Agricultor.
- Técnico/agrónomo que revisa.
- Agente que lee contexto.

## Historias de usuario

- H1: Como agricultor, quiero registrar mi parcela con un punto si no tengo polígono.
- H2: Como agricultor, quiero editar nombre, ubicación y superficie.
- H3: Como dev, quiero área calculada o null, nunca un cero falso.

## Requisitos funcionales (EARS)

- **RF-005.1:** CUANDO el usuario crea una parcela, EL SISTEMA acepta `Point` o `Polygon` en WGS84 y valida lat/lon.
- **RF-005.2:** SI hay polígono y no hay área declarada, ENTONCES EL SISTEMA calcula `area_ha` con geografía; si es punto, `area_ha=null`.
- **RF-005.3:** EL SISTEMA permite listar, ver, editar y borrar (soft delete) solo parcelas propias.
- **RF-005.4:** SI el polígono no está cerrado o tiene <3 vértices, ENTONCES EL SISTEMA responde 422.
- **RF-005.5:** EL SISTEMA guarda preferencias (agua/suelo/margen/restricciones) como JSON validado.
- **RF-005.6:** EL SISTEMA marca `is_simulated=true` en la parcela demo y lo expone en la UI.
- **RF-005.7:** EL SISTEMA pagina listas (20 default, 100 max) y devuelve 404 en parcela ajena.
- **RF-005.8:** EL SISTEMA permite área desconocida y bloquea los análisis que dependen de ella con `missing_inputs`.

## Requisitos no funcionales

- 100 usuarios; listas paginadas.
- Validación estricta; sin geometrías inválidas.
- Soft delete; datos recuperables 30 días (P1).
- Errores claros en español.

## Casos límite

- Punto en el océano o fuera de Perú → advertencia, no bloqueo (demo global).
- Polígono autointersectado → 422.
- Área declarada vs calculada → discrepancia >20 % → advertencia.
- Nombre vacío → “Mi parcela”.
- Preferencias con pesos negativos → 422.
- Parcela ajena → 404.
- Borrar con análisis → soft delete; análisis quedan históricos.

## Fuera de alcance

- Edición visual de vértices (P2).
- Multiparcela (024).
- Importar GeoJSON/KML (P2).

## Criterios de finalización

- CRUD y validaciones.
- Área PostGIS correcta.
- IDOR y paginación.
- La UI de creación se implementa en 006.

## Matriz de pruebas

| RF | Test |
|---|---|
| 005.1 | U/I: point/polygon |
| 005.2 | U: área vs geografía |
| 005.3 | I: CRUD |
| 005.4 | U: geometría inválida |
| 005.5 | U: preferences |
| 005.6 | I: demo flag |
| 005.7 | I: paginación/404 |
| 005.8 | U: missing_inputs |
