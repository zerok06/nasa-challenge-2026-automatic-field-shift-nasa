# Plan — Spec 034

Estado: aprobado por la instrucción del usuario de implementar las mejoras.

1. Inspeccionar el contrato `/simulate`, la forma del catálogo y los flujos ya
   modificados para conservar cambios existentes.
2. Implementar selector de planes en Comparación y navegación al simulador con
   el plan seleccionado.
3. Mostrar el selector dentro del simulador; agregar controles directos para
   multiplicadores de agua y precio y presentar resultados del plan elegido.
4. Adaptar precios de referencia del JSON a tipos de aplicación y prellenar
   campos solo cuando exista una coincidencia, con fuente/ámbito/año/estado.
5. Completar edición de ubicación de parcela y acceso contextual a completar
   agua; ajustar la captura de suministro existente para que sus opciones sean
   visibles y comprensibles.
6. Habilitar la consulta del catálogo como herramienta del agente, incluyendo
   evidencia de procedencia en la respuesta.
7. Añadir traducciones de nuevas cadenas en inglés y comprobar el fallback de
   quechua/aimara según el estado `review_pending`.
8. Ejecutar lint y typecheck requeridos por `application/AGENTS.md`; inspeccionar
   cambios y registrar limitaciones/evidencia en MEMORY.md.
9. Extender la spec para las referencias de precio en API/bundle, portadas
   ilustrativas y el intro de primera apertura aprobado por el usuario.
10. Añadir imágenes locales para las portadas y tres slides, integrar la
    selección estable por parcela y un recorrido de introducción persistente.
11. Validar intro, portada y flujos principales con Maestro en Android; compilar
    y verificar el APK final.

## Corrección posterior: alternativas, datos y nomenclatura

1. Etiquetar la pestaña base según `kind` («Actual» o «Ejemplo») y mantener las
   alternativas como B/C en comparación, simulador y gráficas; no alterar el orden
   del motor. Implementado; falta E2E visual en APK.
2. Generar combinaciones desde el catálogo agronómico usando familia y duración,
   sin depender de «Mis precios». Implementado y cubierto por pruebas backend.
3. Ordenar con las prioridades disponibles de agua, ganancia y presupuesto;
   excluir datos ausentes del puntaje. Implementado en la selección y en el tool
   del agente; selección limitada a los tres criterios con datos soportados.
4. Mostrar el precio del JSON como estimado editable, pedir confirmación y
   preservar procedencia; no calcular margen sin precio, rendimiento y costos
   completos. Implementado y cubierto por pruebas backend.
5. Corregir la portada de «Mi parcela»: banner de alto fijo, degradado a pantalla
   completa y métricas debajo sobre fondo opaco. Implementado; falta inspección
   visual en el APK nuevo.
6. Ejecutar typecheck, lint, pruebas app/backend y compilar APK. Typecheck/lint y
   pruebas app 20/20 y backend 81/81 pasan. El bundle JS se genera, pero CMake/
   Ninja no termina sus tareas nativas; Maestro y APK actualizado pendientes.
