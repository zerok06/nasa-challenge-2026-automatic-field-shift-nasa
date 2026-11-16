# ADR-0009 — Planes seleccionables y precios de referencia

- **Estado:** aceptada para el piloto
- **Fecha:** 2026-11-15
- **Relacionada:** ADR-0004 (i18n y accesibilidad), ADR-0005 (UI agricultor),
  specs 018, 019, 026, 033 y 034

## Contexto

La comparación en tres tarjetas largas hace difícil revisar alternativas desde
un teléfono. El agricultor también puede no conocer el precio de venta al
registrar costos, aunque el catálogo local tenga una referencia histórica.

## Decisión

1. Comparación y simulador comparten pestañas accesibles. La primera es
   «Actual» si hay historial y «Ejemplo» si no existe; las siguientes son
   «Alternativa B» y «Alternativa C». El selector usa el tipo del plan y no
   cambia el orden estable que consume el agente y el motor.
2. Los cambios de agua y precio se expresan como porcentaje de los valores base
   y se envían al motor existente de simulación. El resultado se identifica
   como estimación y el baseline no se modifica.
3. La ficha económica puede precargar una referencia catalogada por cultivo,
   priorizando distrito y usando un ámbito más amplio solo si el catálogo lo
   ofrece. Se muestran año, ámbito, fuente y estado; el agricultor puede editar
   el valor antes de guardarlo.
4. El agente consulta el mismo catálogo para responder sobre un precio. Ninguna
   referencia se llama precio futuro ni precio confirmado.
5. Quechua y aimara siguen como borradores hasta revisión nativa. La app usa
   fallback en español y lo explica al agricultor.

## Consecuencias

- Menos desplazamiento para revisar planes en pantalla pequeña.
- Las simulaciones adhoc actuales ajustan multiplicadores; introducir valores
  absolutos en PEN/kg o unidades físicas requiere ampliar el contrato `/simulate`
  en otra spec.
- Las filas 2025 pendientes de cotejo permanecen etiquetadas y editables.
- Una traducción completa a quechua necesita revisión de hablantes nativos.

## Evidencia

- Spec: `specs/034-planes-interactivos/`
- Precio móvil: `application/src/data/price-references.json`
- Consulta del agente: `backend/app/agent/price_catalog.py`
