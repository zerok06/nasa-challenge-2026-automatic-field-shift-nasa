import { describe, expect, it } from 'vitest';
import { catalogPriceFor, isPriceEdited } from './catalog';
import type { CatalogPriceReference } from './types';

function row(overrides: Partial<CatalogPriceReference>): CatalogPriceReference {
  return {
    cultivo_id: 'cebolla',
    nivel: 'distrito',
    departamento: 'Moquegua',
    provincia: 'Mariscal Nieto',
    distrito: 'Moquegua',
    periodo: 2025,
    precio_chacra: { valor: 1.2, unidad: 'PEN/kg' },
    fuente_id: 'DRA25',
    estado: 'transcrito',
    uso: 'supuesto_editable_demo',
    tipo_en_fuente: 'Cebolla',
    ...overrides,
  };
}

describe('catalogPriceFor', () => {
  const onion = { id: 'onion', catalog_id: 'cebolla' };

  it('prefers the parcel district', () => {
    const prices = [
      row({ distrito: 'Samegua', precio_chacra: { valor: 1.0, unidad: 'PEN/kg' } }),
      row({ distrito: 'Moquegua', precio_chacra: { valor: 1.2, unidad: 'PEN/kg' } }),
    ];
    expect(catalogPriceFor(onion, prices, 'Moquegua')?.precio_chacra.valor).toBe(1.2);
  });

  it('falls back to the province and then to the first row', () => {
    const prices = [
      row({ distrito: 'San Antonio', precio_chacra: { valor: 1.1, unidad: 'PEN/kg' } }),
      row({
        nivel: 'provincia',
        distrito: null,
        precio_chacra: { valor: 1.3, unidad: 'PEN/kg' },
      }),
    ];
    expect(catalogPriceFor(onion, prices, 'Ilo')?.precio_chacra.valor).toBe(1.3);
    expect(catalogPriceFor(onion, [prices[0]], 'Ilo')?.precio_chacra.valor).toBe(1.1);
  });

  it('returns null when the catalog has no reference', () => {
    expect(catalogPriceFor(onion, [row({ cultivo_id: 'papa' })], 'Moquegua')).toBeNull();
  });
});

describe('isPriceEdited', () => {
  it('marks a farmer override but not the catalog value', () => {
    const reference = row({});
    expect(isPriceEdited(1.2, reference)).toBe(false);
    expect(isPriceEdited(1.5, reference)).toBe(true);
    expect(isPriceEdited(null, reference)).toBe(false);
  });
});
