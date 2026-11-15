# Spec 032 — Riego semanal y terreno real

| Campo | Valor |
|---|---|
| Estado | Implementado |
| Prioridad | P0 |
| Autor | Anden |
| Fecha | 2026-11-14 |
| Aprobación | Continuación de pendientes solicitada por el usuario |

## Problema

La ficha ya reúne historial, agua, suelo y economía, pero el agricultor no ve
qué demanda tiene su parcela en los próximos días ni si el terreno tiene una
pendiente que afecte el riego. El clima histórico viene de NASA POWER; el
pronóstico y la elevación siguen pendientes.

## Resultado esperado

Una pantalla **Riego de la semana** con:

- pronóstico real de 7 días: lluvia, ETo de referencia y temperaturas;
- demanda hídrica semanal calculada (ETo − lluvia efectiva);
- agua declarada y una comparación explícita, sin inventar disponibilidad;
- elevación y pendiente del terreno desde SRTM;
- fuente, fecha y límites visibles.

## Requisitos funcionales

- **RF-032.1:** El backend consulta Open-Meteo para el punto de la parcela y
  devuelve 7 días de `precipitation_sum`, `et0_fao_evapotranspiration`,
  `temperature_2m_max` y `temperature_2m_min`.
- **RF-032.2:** Si Open-Meteo no responde, la API devuelve
  `503 forecast_unavailable`; no usa un pronóstico inventado.
- **RF-032.3:** El backend consulta SRTM 90 m en OpenTopoData para el centro y
  8 puntos vecinos, calcula elevación y pendiente, y guarda el resultado en la
  parcela. Si SRTM falla, prueba Open-Meteo Elevation (Copernicus GLO-90) y
  etiqueta la fuente real; si ambas fallan, el pronóstico sigue disponible con
  `terrain: null`.
- **RF-032.4:** La lluvia efectiva usa un factor declarado de 0.8; la ETo es de
  referencia (no ajustada por cultivo) y así se muestra.
- **RF-032.5:** El agua disponible sale de la última declaración del agricultor
  (`available_mm`). Si falta, se muestra `null`, nunca 0.
- **RF-032.6:** La app muestra una tabla diaria accesible y un resumen semanal;
  no depende solo del color.
- **RF-032.7:** La pantalla indica que el pronóstico es una estimación y no
  reemplaza una recomendación agronómica.
- **RF-032.8:** Las fuentes SRTM, Open-Meteo y Copernicus se reflejan en
  `GET /geo/discover` con su estado real.

## Fuera de alcance

- Riego por cultivo con coeficientes Kc por etapa (siguiente iteración).
- Sensores de humedad de suelo.
- Garantizar disponibilidad de agua: solo se compara la demanda semanal con lo
  declarado.
- Mapas.

## Criterios de aceptación

- [ ] Parcela nueva devuelve 7 días y terreno real en el APK.
- [ ] Sin Open-Meteo, error explícito; sin SRTM, fallback etiquetado.
- [ ] Tests backend del cálculo, caché y errores.
- [ ] Maestro `10-riego` verde.
- [ ] Revisión 1.3×/2.0× sin truncamiento crítico.
