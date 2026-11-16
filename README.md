<div align="center">
  <img src="docs/assets/anden-cover.jpg" alt="Valle agrícola de Moquegua con cultivos irrigados y señales visuales de observación de la Tierra" width="100%" />
  <h1>Anden</h1>
  <p><strong>Decisiones agrícolas más resilientes, conectadas con datos de la Tierra y el conocimiento local.</strong></p>
  <p>
    <a href="https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/">NASA Space Apps Challenge 2026 · Field Shift</a>
    · Moquegua, Perú
  </p>
</div>

---

## El reto

Quienes cultivan deben tomar decisiones en condiciones que cambian: lluvias irregulares, temperaturas variables, disponibilidad limitada de agua y presión sobre la salud del suelo. Elegir qué sembrar después y cómo organizar una rotación requiere reunir información que suele estar dispersa entre observaciones del campo, experiencia local y fuentes técnicas.

El desafío **Field Shift: Adapting Farms with NASA Data** invita a crear herramientas de apoyo a la decisión que combinen observaciones de la Tierra de NASA con información local del suelo, características de los cultivos y prioridades de las personas agricultoras. El propósito es ayudar a explorar rotaciones que fortalezcan el suelo y permitan adaptarse a condiciones cambiantes; no reemplazar la experiencia agrícola.

## Nuestra propuesta

**Anden** es un copiloto de planificación agrícola geoespacial concebido para pequeños productores de Moquegua. Reúne contexto climático y territorial con los datos que aporta cada agricultor para comparar estrategias de rotación, examinar sus posibles efectos sobre agua y economía, y hacer visibles los supuestos y los datos que todavía faltan.

La propuesta prioriza decisiones comprensibles y revisables. Presenta alternativas como escenarios para explorar, diferencia la información observada de la estimada o simulada y reserva la decisión final a la persona agricultora. El foco está en un piloto de hasta **100 agricultores**, con una experiencia pensada para teléfonos Android, conectividad intermitente y uso en español. Quechua y aimara forman parte de la dirección del proyecto, pero sus traducciones requieren revisión de hablantes nativos antes de considerarse listas.

## Por qué Moquegua

El proyecto se sitúa en Moquegua, Perú, y toma como punto de partida una realidad agrícola donde el agua, el clima local, el suelo y las prioridades de cada productor importan al mismo tiempo. Una recomendación general no captura por sí sola las diferencias entre parcelas ni la experiencia de quienes las trabajan. Por eso Anden busca poner las fuentes y los supuestos a la vista y permitir que cada persona compare opciones en el contexto de su propia parcela.

## Qué aporta al desafío

- **Contexto de la Tierra:** incorpora información climática y de elevación asociada a la ubicación de una parcela, con fuente y fecha cuando están disponibles.
- **Contexto local:** considera cultivos, suelo, disponibilidad de agua, experiencia previa y prioridades declaradas por la persona agricultora.
- **Exploración de rotaciones:** facilita comparar una práctica registrada con alternativas y observar escenarios de cambio.
- **Transparencia:** distingue datos declarados, referencias, estimaciones y simulaciones; cuando falta información, la muestra como faltante en lugar de asumir un valor.
- **Decisión humana:** las alternativas sirven para conversar y planificar; no se presentan como prescripciones agronómicas validadas.
- **Acceso inclusivo:** la propuesta contempla conectividad intermitente, lenguaje sencillo y necesidades de accesibilidad.

## Datos y atribución

Anden combina fuentes abiertas y datos aportados por las personas usuarias. La cobertura y el nivel de detalle dependen de cada fuente y ubicación.

- **NASA POWER** aporta datos de observación y climatología de la Tierra para variables ambientales. [NASA POWER](https://power.larc.nasa.gov/)
- **Open-Meteo** aporta información meteorológica de pronóstico. El pronóstico es una salida de modelo y no sustituye avisos oficiales locales. [Open-Meteo](https://open-meteo.com/)
- **SRTM** aporta elevación de terreno para contexto geográfico. [NASA SRTM](https://www.earthdata.nasa.gov/data/instruments/srtm)
- **Datos declarados por el agricultor** aportan información sobre suelo, agua, cultivos, costos, precios y prioridades. Su exactitud depende de lo que se conoce y se registra.
- **Referencias agrícolas locales** pueden orientar la conversación, pero deben revisarse antes de usarse como valores confirmados para una parcela.

La parcela demostrativa usa datos sintéticos identificados como tales. Los resultados son exploratorios: no constituyen asesoría agronómica, pronóstico oficial ni garantía de rendimiento o rentabilidad. Los datos climáticos y de terreno no reemplazan un análisis de suelo ni una evaluación profesional en campo.

Consulta las condiciones y atribuciones de datos en [`docs/data-licenses.md`](docs/data-licenses.md).

## Principios del proyecto

1. **La experiencia local cuenta.** Los datos satelitales complementan el conocimiento de agricultores y especialistas locales.
2. **Sin dato no significa cero.** La falta de información debe permanecer visible.
3. **Las estimaciones se identifican.** Toda simulación depende de supuestos que deben poder reconocerse.
4. **La decisión permanece en manos de la persona agricultora.** Anden ayuda a comparar y conversar, no decide por ella.
5. **Accesibilidad y contexto importan.** La experiencia se diseña para teléfonos, conectividad limitada y diversidad lingüística.

## Equipo

| Integrante | Perfil | País |
|---|---|---|
| [Ernesto Montero Rivas](https://github.com/ardev) | Responsable del equipo | Perú |
| [Jose Enrique Paye Mamani](https://github.com/zerok06) | Integrante | Perú |
| [Michael Manrique](https://github.com/mike_ai) | Integrante | Perú |
| [Frank Ruiz Dávila](https://github.com/frank_rd) | Integrante | Perú |
| [Juan Oquendo Guzmán](https://github.com/juanoquendo) | Integrante | Perú |
| [Luis Antonio Acuña Asenjo](https://github.com/luisacunaasenjo) | Integrante | Perú |

## Reto y reconocimiento

Anden se presenta como proyecto participante del **NASA Space Apps Challenge 2026**, en el reto [Field Shift: Adapting Farms with NASA Data](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/). NASA y NASA Space Apps Challenge no patrocinan ni respaldan este proyecto. Las marcas y datos de terceros pertenecen a sus respectivos titulares.

## Licencia

El código de este repositorio se distribuye bajo la licencia [MIT](LICENSE). Las fuentes de datos mantienen sus propios términos de uso y atribución; consulta [`docs/data-licenses.md`](docs/data-licenses.md).
