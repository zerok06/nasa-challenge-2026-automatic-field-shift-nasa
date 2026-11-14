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

2. **Parcela (30 s).**  
   Abrir parcela demo (sintética, etiquetada). Mostrar historial, agua, suelo “por verificar”, prioridad “ahorrar agua”.

3. **Mapa (30–45 s).**  
   Activar IMERG; mostrar leyenda, fecha, resolución y fuente.  
   “Es contexto regional de ~11 km; no mide la parcela.”

4. **Comparación (45–60 s).**  
   Tres planes: actual + 2 alternativas.  
   Mostrar agua, suelo, margen `null` si faltan datos, y `needs_review`.

5. **Simulación (40–50 s).**  
   Agua −20 %: cambia el déficit.  
   Precio −15 %: cambia el margen solo si hay insumos.  
   Restablecer.

6. **Agente (45–60 s).**  
   “¿Por qué la alternativa B usa menos agua?”  
   Mostrar tools consultadas, fuentes y una cifra del motor.  
   “No inventa: las cifras vienen del motor.”

7. **Decisión humana (20–30 s).**  
   Guardar borrador → confirmación → estado `draft`.  
   “El agricultor decide; Automatic no prescribe.”

8. **Cierre (15 s).**  
   “Datos NASA + conocimiento local → alternativas comparables, con incertidumbre visible.”

## Qué decir si falla algo

- **Sin red/LLM:** “Modo guiado”; mismas tarjetas y cifras; el agente responde plantilla.
- **Sin tiles:** tarjeta de respaldo con indicador y fuente; no fingir imagen.
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
