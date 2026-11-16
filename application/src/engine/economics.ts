import { round } from './water';

export const ECON_VERSION = 'econ-v0.1';

export type EconomicsResult = {
  margin_pen: number | null;
  margin_pen_ha: number | null;
  break_even_price_pen_kg?: number | null;
  income_pen?: number | null;
  costs_pen?: number | null;
  production_kg?: number | null;
  confidence: string;
  price_assumption_type: string;
  missing_inputs: string[];
  method_version: string;
};

export function calculateEconomics(
  areaHa: number | null,
  yieldKgHa: number | null,
  pricePenKg: number | null,
  costsPen: number | null,
  priceType = 'farmer',
): EconomicsResult {
  const missing: string[] = [];
  const entries: [string, number | null][] = [
    ['area_ha', areaHa],
    ['yield_kg_ha', yieldKgHa],
    ['price_pen_kg', pricePenKg],
    ['costs_pen', costsPen],
  ];
  for (const [name, value] of entries) {
    if (value === null) missing.push(name);
  }
  if (areaHa === null || yieldKgHa === null || pricePenKg === null || costsPen === null) {
    return {
      margin_pen: null,
      margin_pen_ha: null,
      break_even_price_pen_kg: null,
      confidence: 'insufficient_inputs',
      price_assumption_type: priceType !== 'none' ? priceType : 'none',
      missing_inputs: missing,
      method_version: ECON_VERSION,
    };
  }
  const productionKg = yieldKgHa * areaHa;
  const income = productionKg * pricePenKg;
  const margin = income - costsPen;
  const breakEven = productionKg > 0 ? costsPen / productionKg : null;
  return {
    margin_pen: round(margin, 2),
    margin_pen_ha: areaHa > 0 ? round(margin / areaHa, 2) : null,
    break_even_price_pen_kg: breakEven !== null ? round(breakEven, 4) : null,
    income_pen: round(income, 2),
    costs_pen: round(costsPen, 2),
    production_kg: round(productionKg, 2),
    confidence: 'complete',
    price_assumption_type: priceType !== 'none' ? priceType : 'farmer',
    missing_inputs: [],
    method_version: ECON_VERSION,
  };
}
