/** Catalog price helpers — the farmer always sees where a price came from. */
import type { CatalogPriceReference, Crop } from './types';

/**
 * Best reference for a crop: district first, then province, then the first
 * available row. Never guesses a value that is not in the catalog.
 */
export function catalogPriceFor(
  crop: Pick<Crop, 'id' | 'catalog_id'>,
  prices: CatalogPriceReference[],
  district: string | null,
): CatalogPriceReference | null {
  const key = crop.catalog_id ?? crop.id;
  const matches = prices.filter((row) => (row.crop_id ?? row.cultivo_id) === key);
  if (matches.length === 0) return null;
  const local = matches.find((row) => row.distrito && row.distrito === district);
  const provincial = matches.find((row) => row.nivel === 'provincia');
  return local ?? provincial ?? matches[0];
}

/** True when the farmer's price differs from the catalog reference. */
export function isPriceEdited(
  price: number | null,
  reference: CatalogPriceReference | null,
): boolean {
  if (price === null || reference === null) return false;
  return price !== reference.precio_chacra.valor;
}
