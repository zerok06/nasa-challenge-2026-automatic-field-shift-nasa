import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findCatalogPrice,
  localPriceReferences,
  mergePriceReferences,
} from '../src/data/priceReferences';

test('suggests the local catalog price for the app crop id', () => {
  const reference = findCatalogPrice('potato', 'Moquegua', localPriceReferences);

  assert.equal(reference?.crop_id, 'papa');
  assert.equal(reference?.nivel, 'distrito');
  assert.equal(reference?.precio_chacra.valor, 1.2);
});

test('uses the parcel province when the district has no row of its own', () => {
  // Ají has no district row for Moquegua; Moquegua belongs to Mariscal Nieto.
  const reference = findCatalogPrice('chili', 'Moquegua', localPriceReferences);

  assert.equal(reference?.crop_id, 'aji');
  assert.equal(reference?.nivel, 'provincia');
  assert.equal(reference?.provincia, 'Mariscal Nieto');
  assert.equal(reference?.precio_chacra.valor, 2);
});

test('never quotes a price from a foreign province as local', () => {
  // Ilo is a different province and has no ají reference.
  assert.equal(findCatalogPrice('chili', 'Ilo', localPriceReferences), null);
  assert.equal(findCatalogPrice('chili', 'El Algarrobal', localPriceReferences), null);
});

test('unknown districts do not fall back to the department price', () => {
  assert.equal(findCatalogPrice('chili', 'Lima', localPriceReferences), null);
});

test('without a district the broadest reference is used', () => {
  const reference = findCatalogPrice('chili', null, localPriceReferences);

  assert.equal(reference?.crop_id, 'aji');
  // The department row is the only ají row available without a district.
  assert.equal(reference?.precio_chacra.valor, 2);
});

test('accepts raw API crop ids and lets the farmer edit the proposed reference', () => {
  const apiReference = {
    cultivo_id: 'aji',
    nivel: 'distrito',
    departamento: 'Moquegua',
    provincia: 'Mariscal Nieto',
    distrito: 'Moquegua',
    periodo: 2025,
    precio_chacra: { valor: 4.25, unidad: 'PEN/kg' },
    fuente_id: 'DRA25',
    estado: 'transcrito_pendiente_cotejo_pdf',
    uso: 'supuesto_editable_demo',
    tipo_en_fuente: 'Ají',
  };
  const references = mergePriceReferences([apiReference], localPriceReferences);
  const suggested = findCatalogPrice('chili', 'Moquegua', references);

  assert.equal(suggested?.crop_id, 'aji');
  assert.equal(suggested?.nivel, 'distrito');
  assert.equal(suggested?.precio_chacra.valor, 4.25);
});
