export type ScenarioInput = {
  water_multiplier: number;
  price_multiplier: number;
  available_mm: number | null;
  gross_irrigation_mm: number | null;
  deficit_mm: number | null;
  feasibility: string;
  margin_pen: number | null;
  margin_pen_ha: number | null;
  income_pen: number | null;
  costs_pen: number | null;
  status: string;
};

export type ScenarioResult = {
  available_mm: number | null;
  deficit_mm: number | null;
  feasibility: string;
  margin_pen: number | null;
  margin_pen_ha: number | null;
  status: string;
};

export function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

/**
 * Mirrors services/scenario.py. Used only for an offline estimate; it never
 * recomputes ETc, rainfall or crop coefficients.
 */
export function applyScenarioValues(input: ScenarioInput): ScenarioResult {
  let available = input.available_mm;
  let deficit = input.deficit_mm;
  let feasibility = input.feasibility;
  if (available !== null) {
    available = round(available * input.water_multiplier, 3);
    if (input.gross_irrigation_mm !== null) {
      deficit = round(Math.max(0, input.gross_irrigation_mm - available), 3);
      feasibility = deficit <= 0 ? 'sufficient' : 'deficit';
    }
  }

  let margin = input.margin_pen;
  let marginHa = input.margin_pen_ha;
  if (input.income_pen !== null && input.costs_pen !== null) {
    margin = round(input.income_pen * input.price_multiplier - input.costs_pen, 2);
    marginHa = null;
  } else if (input.margin_pen !== null) {
    margin = round(input.margin_pen * input.price_multiplier, 2);
  }

  return {
    available_mm: available,
    deficit_mm: deficit,
    feasibility,
    margin_pen: margin,
    margin_pen_ha: marginHa,
    status: feasibility === 'deficit' ? 'invalid' : input.status,
  };
}
