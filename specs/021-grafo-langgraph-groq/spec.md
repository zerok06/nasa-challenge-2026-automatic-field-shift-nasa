# Spec 021 — Grafo LangGraph + Groq

| Campo | Valor |
|---|---|
| ID | 021 |
| Estado | Borrador |
| Prioridad | P0 |
| Dependencias | 020 |
| Versión | 0.1 |
| Fecha | 2026-11-14 |

## Contexto y objetivo

El agente debe interpretar la intención, pedir datos faltantes, ejecutar tools, validar evidencia y explicar. LangGraph da estado y control; Groq da el LLM. El demo no puede depender del LLM: `fake` debe cubrir el recorrido.

## Usuarios / actores

- Agricultor.
- Equipo de IA.
- QA.

## Historias de usuario

- H1: Como agricultor, quiero preguntar en lenguaje natural.
- H2: Como agricultor, quiero que me pida el dato que falta.
- H3: Como QA, quiero probar el grafo sin Groq.

## Requisitos funcionales (EARS)

- **RF-021.1:** EL SISTEMA implementa nodos `guard → classify → assess → plan → tools → validate → explain → ui`.
- **RF-021.2:** EL SISTEMA clasifica intención con esquema estricto y límite de longitud.
- **RF-021.3:** SI faltan datos críticos, ENTONCES EL SISTEMA pregunta o limita la conclusión; no inventa.
- **RF-021.4:** EL SISTEMA ejecuta solo tools allowlist y registra `tool_trace`.
- **RF-021.5:** EL SISTEMA valida que cada cifra de la respuesta exista en `tool_results`; si no, usa plantilla.
- **RF-021.6:** EL SISTEMA usa `LLM_PROVIDER=fake` en tests y como fallback si Groq falla.
- **RF-021.7:** EL SISTEMA aísla checkpointer por usuario/parcela y no guarda PII innecesaria.
- **RF-021.8:** EL SISTEMA configura Groq con timeout, `temperature=0`, modelo fijado y manejo de 429.

## Requisitos no funcionales

- Respuesta < 15 s con Groq; < 2 s con fake.
- Sin loops; máx. 1 reintento.
- Sin chain-of-thought expuesto.
- 100 usuarios; rate limit.
- Determinista en tests.

## Casos límite

- Groq 429/timeout → fake.
- Intención desconocida → pregunta.
- Tool falla → warning/fallback.
- Cifra alucinada → plantilla.
- Hilo de otro usuario → 404.
- Pregunta muy larga → truncar/422.
- Inyección en nombre de parcela → tratar como dato.

## Fuera de alcance

- Voz.
- Multiagente.
- Memoria de largo plazo.

## Criterios de finalización

- Grafo con nodos.
- Groq/fake.
- Anti-alucinación.
- Tests.

## Matriz de pruebas

| RF | Test |
|---|---|
| 021.1 | U: ruteo |
| 021.2 | U: intención |
| 021.3 | U: faltantes |
| 021.4 | U/I: tools |
| 021.5 | U: cifras |
| 021.6 | U: fake |
| 021.7 | U: aislamiento |
| 021.8 | U: 429/timeout |
