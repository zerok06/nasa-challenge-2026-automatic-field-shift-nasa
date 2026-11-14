# Spec 024 — Multi-parcela (P2)

| Campo | Valor |
|---|---|
| ID | 024 |
| Estado | Borrador |
| Prioridad | P2 |
| Dependencias | 005 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

Un agricultor puede tener varias parcelas. El MVP usa una; este spec habilita lista, cambio y aislamiento sin rehacer la app. Es P2: no entra en la primera semana.

## Usuarios / actores

- Agricultor con 2+ parcelas.
- Técnico.

## Historias de usuario

- H1: Como agricultor, quiero cambiar de parcela sin perder contexto.
- H2: Como agricultor, quiero que cada parcela tenga sus datos.

## Requisitos funcionales (EARS)

- **RF-024.1:** EL SISTEMA lista parcelas propias con nombre, área y estado.
- **RF-024.2:** EL SISTEMA permite elegir una parcela activa y persistirla.
- **RF-024.3:** EL SISTEMA aísla historial, agua, suelo y comparaciones por parcela.
- **RF-024.4:** EL SISTEMA permite crear una segunda parcela.
- **RF-024.5:** EL SISTEMA no mezcla cache/offline entre parcelas.
- **RF-024.6:** EL SISTEMA muestra la parcela activa en todas las pestañas.
- **RF-024.7:** EL SISTEMA permite archivar (soft delete) una parcela.
- **RF-024.8:** EL SISTEMA prueba cambio de parcela con Maestro.

## Requisitos no funcionales

- Cambio < 1 s.
- Sin fugas de datos entre parcelas.
- 100 usuarios; listas paginadas.
- Accesibilidad.

## Casos límite

- 0 parcelas → onboarding.
- 1 parcela → sin selector.
- Parcela archivada → oculta.
- Cambio con escenario abierto → cerrar/avisar.
- Cache por parcela.

## Fuera de alcance

- Colaboración multiusuario.
- Roles.

## Criterios de finalización

- Lista/selector.
- Aislamiento.
- Maestro.

## Matriz de pruebas

| RF | Test |
|---|---|
| 024.1 | I: lista |
| 024.2 | E: cambio |
| 024.3 | I: aislamiento |
| 024.4 | E: crear |
| 024.5 | U: cache |
| 024.6 | E: header |
| 024.7 | I: archivar |
| 024.8 | E: Maestro |
