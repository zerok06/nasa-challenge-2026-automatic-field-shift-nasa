# Spec 026 — Campaña y precios (P2)

| Campo | Valor |
|---|---|
| ID | 026 |
| Estado | Borrador |
| Prioridad | P2 |
| Dependencias | 015, 019 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

Después de la campaña, el agricultor puede registrar qué pasó: cultivo, agua, cosecha, precio. Eso permite comparar estimado vs observado y mejorar la confianza. **No** se entrena un modelo automáticamente ni se predicen precios.

## Usuarios / actores

- Agricultor.
- Técnico/agrónomo.
- Equipo de datos.

## Historias de usuario

- H1: Como agricultor, quiero registrar mi cosecha y precio.
- H2: Como agricultor, quiero ver si la estimación se acercó.
- H3: Como equipo, quiero datos para calibrar con consentimiento.

## Requisitos funcionales (EARS)

- **RF-026.1:** EL SISTEMA permite registrar campaña real: cultivo, fechas, agua aplicada, cosecha y precio logrado.
- **RF-026.2:** EL SISTEMA compara estimado vs observado por campaña.
- **RF-026.3:** EL SISTEMA muestra el error y la incertidumbre, no una conclusión de precisión.
- **RF-026.4:** EL SISTEMA marca datos personales y requiere consentimiento para uso agregado.
- **RF-026.5:** EL SISTEMA no calibra ni reentrena automáticamente con datos no validados.
- **RF-026.6:** EL SISTEMA permite exportar/borrar los registros del agricultor.
- **RF-026.7:** EL SISTEMA etiqueta precios como `realized` vs `hypothetical`/`historical`.
- **RF-026.8:** EL SISTEMA prueba privacidad y comparación estimado/observado.

## Requisitos no funcionales

- Captura < 2 min.
- Datos sensibles; acceso por owner.
- Sin PII en logs.
- Exportación CSV/JSON.
- P2: no bloquea demo.

## Casos límite

- Campaña sin precio → null.
- Cosecha parcial → nota.
- Múltiples cosechas → suma/registro.
- Datos inconsistentes → validación.
- Borrado → soft/hard según consentimiento.
- Sin consentimiento → no agregado.

## Fuera de alcance

- Predicción de precios.
- Entrenamiento automático.
- Market data en vivo.

## Criterios de finalización

- Registro de campaña.
- Estimado vs observado.
- Privacidad/exportación.
- Tests.

## Matriz de pruebas

| RF | Test |
|---|---|
| 026.1 | I: registro |
| 026.2 | U: comparación |
| 026.3 | U: error |
| 026.4 | U: consentimiento |
| 026.5 | U: no auto |
| 026.6 | I: export/delete |
| 026.7 | U: etiquetas |
| 026.8 | M: privacidad |
