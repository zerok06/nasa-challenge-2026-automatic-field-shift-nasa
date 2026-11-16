import catalogPrices from './price-references.json';

export type CatalogPriceReference = {
  crop_id?: string;
  cultivo_id?: string;
  nivel: 'distrito' | 'provincia' | 'departamento' | string;
  departamento: string;
  provincia: string | null;
  distrito: string | null;
  periodo: number;
  precio_chacra: { valor: number; unidad: string };
  fuente_id: string;
  estado: string;
  uso: string;
  tipo_en_fuente: string;
};

const PRICE_CROP_IDS: Record<string, string> = {
  chili: 'aji',
  potato: 'papa',
  tomato: 'tomate',
  onion: 'cebolla',
  pumpkin: 'zapallo',
  haba: 'haba_seca',
};

function canonicalPriceCropId(cropId: string) {
  return PRICE_CROP_IDS[cropId] ?? cropId;
}

export function normalizePriceReferences(
  references: CatalogPriceReference[] | null | undefined,
): CatalogPriceReference[] {
  return (references ?? []).flatMap((reference) => {
    const cropId = reference.crop_id ?? reference.cultivo_id;
    if (!cropId || !reference.precio_chacra || !Number.isFinite(reference.precio_chacra.valor)) {
      return [];
    }
    return [{ ...reference, crop_id: canonicalPriceCropId(cropId) }];
  });
}

const rows = normalizePriceReferences(catalogPrices.rows as CatalogPriceReference[]);
export const localPriceReferences = rows;

export function mergePriceReferences(
  ...sources: (CatalogPriceReference[] | null | undefined)[]
): CatalogPriceReference[] {
  const merged = normalizePriceReferences(sources.flatMap((source) => source ?? []));
  const seen = new Set<string>();
  return merged.filter((row) => {
    const key = [
      row.crop_id,
      row.nivel,
      row.distrito ?? '',
      row.provincia ?? '',
      row.periodo,
      row.precio_chacra.valor,
      row.fuente_id,
    ].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function samePlace(left: string | null | undefined, right: string | null | undefined) {
  return Boolean(left && right && left.trim().toLocaleLowerCase() === right.trim().toLocaleLowerCase());
}

function provinceForDistrict(
  district: string | null | undefined,
  references: CatalogPriceReference[],
): string | null {
  if (!district) return null;
  const row = references.find(
    (item) => item.nivel === 'distrito' && samePlace(item.distrito, district) && item.provincia,
  );
  return row?.provincia ?? null;
}

export function findCatalogPrice(
  cropId: string,
  district: string | null | undefined,
  references: CatalogPriceReference[] = rows,
) {
  const canonicalId = canonicalPriceCropId(cropId);
  const normalized = normalizePriceReferences(references);
  const matching = normalized.filter((row) => row.crop_id === canonicalId);
  if (matching.length === 0) return null;
  const exact = matching.filter(
    (row) => row.nivel === 'distrito' && samePlace(row.distrito, district),
  );
  const candidates = exact.length
    ? exact
    : (() => {
        if (district) {
          // Quote the parcel's own province. Falling back to the department or
          // to a different province would present a distant market as local.
          const province = provinceForDistrict(district, normalized);
          if (!province) return [];
          return matching.filter(
            (row) => row.nivel === 'provincia' && samePlace(row.provincia, province),
          );
        }
        return matching.filter(
          (row) => row.nivel === 'provincia' || row.nivel === 'departamento',
        );
      })();
  if (!candidates.length) return null;
  if (candidates.length === 0) return null;
  const priority = (row: CatalogPriceReference) =>
    (row.nivel === 'provincia' ? 2 : row.nivel === 'departamento' ? 1 : 3) +
    (row.estado.includes('cotejado') ? 0.1 : 0);
  return [...candidates].sort((a, b) => priority(b) - priority(a))[0] ?? null;
}

export function priceReferencePlace(reference: CatalogPriceReference) {
  if (reference.nivel === 'distrito') return reference.distrito ?? reference.departamento;
  if (reference.nivel === 'provincia') return reference.provincia ?? reference.departamento;
  return reference.departamento;
}
