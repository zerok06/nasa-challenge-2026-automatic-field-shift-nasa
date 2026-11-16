# Tareas — Spec 034

Estado: aprobado por la instrucción del usuario de implementar las mejoras.

- [x] T1 Comparador: pestañas accesibles y detalle único; etiquetado actual
  frente a alternativas pendiente de esta corrección de coherencia.
- [x] T2 Simulador: selector de plan, controles de parámetros, comparación
  baseline/resultado y reset.
- [x] T3 Catálogo: encontrar referencias locales por cultivo/distrito y
  prellenar precio editable con procedencia y estado.
- [x] T4 Parcela: edición de distrito y coordenadas con validación.
- [x] T5 Agua: ruta directa para completar el faltante y captura por modalidad
  de suministro con confirmación del guardado.
- [x] T6 Agente: consulta de precio de referencia con procedencia visible.
- [x] T7 i18n: nuevas cadenas en inglés y fallback sin controles invisibles.
- [x] T8 Verificación: `pnpm typecheck`, `pnpm lint` y 3 pruebas backend
  dirigidas de contrato/bundle; 11/11 flujos principales y Maestro final para
  intro, riego y precio propuesto pasaron en emulador.
- [x] T9 Portadas: tres imágenes locales ilustrativas, asignación estable por
  parcela, etiqueta accesible y flujo Maestro `11-cover`.
- [x] T10 Intro: tres slides de primera apertura, marca, saltar/continuar,
  persistencia local y flujo Maestro `00-intro`.
- [x] T11 Entrega: compilación Android release universal; 11/11 flujos
  principales y 3 flujos de revisión pasaron; APK copiada a `dist/` y Escritorio,
  instalación ADB confirmada y SHA-256 registrado en `dist/README-APK.md`.
- [x] T12 Coherencia de planes: sustituir Plan A/B/C por Actual/Ejemplo y
  Alternativas B/C según `kind`, mantener el orden del motor, corregir la gráfica
  y el título de escenario. Maestro visual pendiente de APK nuevo.
- [x] T13 Alternativas/prioridades: generar combinaciones de cultivos del
  catálogo, independientes de «Mis precios»; ordenar por agua/ganancia/presupuesto
  y excluir mediciones faltantes del puntaje.
- [x] T14 Confirmación económica: el agricultor acepta el estimado del JSON; el
  backend ignora referencias no confirmadas, mantiene `null` y no calcula margen
  sin precio, rendimiento o costos completos.
- [ ] T15 Maestro y build APK. `pnpm typecheck/lint/test` y backend 81/81 pasan;
  el build JS completa, pero CMake/Ninja queda en regeneración `build.ninja` y
  no produjo un APK actualizado.
