# Guion de demo (3–5 min)

## Antes de empezar

- [ ] API `/ready` 200; túnel/LAN funcionando.
- [ ] Teléfono con Expo Go y el proyecto abierto; datos seed.
- [ ] `LLM_PROVIDER=groq` o `fake`; probar ambos.
- [ ] Video de respaldo descargado.
- [ ] Diapositiva “qué es real / qué es simulado”.

## Guion

1. **Problema (20–30 s).**  
   “Elegir qué sembrar después requiere unir agua, suelo, clima y mercado; hoy está disperso.”

2. **Inicio (30 s).**  
   Abrir parcela demo (sintética, etiquetada). Mostrar “Tu próxima decisión” y las tres tarjetas: comparar, probar un cambio y preguntar.  
   “Todo lo importante cabe en una pantalla; el detalle queda para después.”

3. **Mi parcela y datos (30 s).**  
   Abrir “Mi parcela”: datos para decidir, mis planes guardados y “Datos sin internet”.  
   “No mostramos mapas: el clima es una estimación de NASA para tu zona, no una medición de tu parcela.”

4. **Ficha de parcela (40–50 s).**  
   Abrir “Ficha de parcela”: agregar una campaña, decir “No sé” en agua y elegir
   prioridades. Mostrar el progreso y el resumen.  
   “Lo que no sabemos se muestra como faltante; no lo inventamos.”

5. **Comparación (45–60 s).**  
   Tres planes: actual + 2 alternativas.  
   Mostrar agua que falta, ganancia y “¿alcanza el agua?”. Si falta un dato, se muestra “No disponible”.

6. **Simulación (40–50 s).**  
   “Tengo 20 % menos agua”: cambia el agua que falta.  
   “El precio baja 15 %”: cambia la ganancia solo si hay insumos.  
   “Volver a mi plan”.

7. **Agente (45–60 s).**  
   “¿Por qué la opción B usa menos agua?”  
   Mostrar la respuesta corta y “Detalles técnicos” con las tools y fuentes.  
   “No inventa: las cifras vienen del motor.”

8. **Decisión humana (20–30 s).**  
   Guardar borrador → confirmación → estado `draft`.  
   “El agricultor decide; Automatic no prescribe.”

9. **Cierre (15 s).**  
   “Datos NASA + conocimiento local → alternativas comparables, con incertidumbre visible.”

## Qué decir si falla algo

- **Sin red/LLM:** “Modo guiado”; mismas tarjetas y cifras; el agente responde con los datos guardados.
- **Sin datos guardados:** “Descarga los datos desde Mi parcela y vuelve a intentar”.
- **Sin agua/precio:** mostrar `null`/“no calculable” y explicar qué falta.
- **Pregunta difícil:** “Ese dato no está en esta versión; lo validamos con un agrónomo.”

## Qué no decir

- “Predice el clima/precio.”
- “Recomienda el mejor cultivo.”
- “Mide la humedad de tu parcela.”
- “NASA valida nuestra recomendación.”

## Cierre para jueces

- Repo, README, specs, video y fuentes.
- 100 agricultores objetivo; app gratuita; código MIT.
- Próximo paso: validación local y campaña real.
