# Tasks 012 — Mapa y capa GIBS

- [ ] **T1 — Mapa base + parcela**
  - RF: 012.1
  - `MapView`, marker/polygon, encuadre.
  - Hecho cuando: se ve la parcela demo.

- [ ] **T2 — Capa IMERG**
  - RF: 012.2, 012.8
  - `UrlTile`, maxZ 6, fecha.
  - Hecho cuando: tile 200 en z6; z7 no se pide.

- [ ] **T3 — Leyenda y fuentes**
  - RF: 012.3
  - Unidad/fecha/resolución/fuente.
  - Hecho cuando: visible y accesible.

- [ ] **T4 — Fallback**
  - RF: 012.4
  - Tile error/offline.
  - Hecho cuando: tarjeta sin imagen falsa.

- [ ] **T5 — `map_context`**
  - RF: 012.5
  - Contexto tipado para el agente.
  - Hecho cuando: test de contrato.

- [ ] **T6 — Google Maps key**
  - RF: 012.6
  - Key restringida; build.
  - Hecho cuando: mapa Android renderiza.

- [ ] **T7 — Maestro**
  - RF: 012.7
  - `02-map.yaml`.
  - Hecho cuando: verde.

- [ ] **T8 — Endpoint de capas**
  - RF: 012.2
  - `GET /parcels/{id}/layers` con metadatos GIBS; fallback local.
  - Hecho cuando: contrato y test.

## Definición de terminado

- [ ] Mapa + parcela.
- [ ] IMERG + leyenda.
- [ ] Fallback.
- [ ] Maestro.
