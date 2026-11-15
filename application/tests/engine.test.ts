import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { calculateEconomics } from '../src/engine/economics';
import {
  availableMm,
  effectiveRain,
  etcFromStages,
  etoHargreaves,
  waterBalance,
} from '../src/engine/water';

type WaterCase = {
  name: string;
  op: string;
  input: any;
  expected: unknown;
};

const waterCases = JSON.parse(
  readFileSync(new URL('../../tests/parity/water_cases.json', import.meta.url), 'utf8'),
) as WaterCase[];

for (const item of waterCases) {
  test(`water parity: ${item.name}`, () => {
    let actual: unknown;
    switch (item.op) {
      case 'effective_rain':
        actual = effectiveRain(item.input);
        break;
      case 'etc_from_stages':
        actual = etcFromStages(item.input.stages, item.input.eto);
        break;
      case 'available_mm':
        actual = availableMm(item.input.area_ha, item.input.volume_m3, item.input.mm);
        break;
      case 'water_balance':
        actual = waterBalance(
          item.input.etc_mm,
          item.input.rain_effective_mm,
          item.input.available,
          item.input.efficiency,
          item.input.area_ha,
          item.input.volume_m3,
        );
        break;
      case 'eto_hargreaves':
        actual = etoHargreaves(
          item.input.tmax_c,
          item.input.tmin_c,
          item.input.lat,
          item.input.day,
        );
        break;
      default:
        throw new Error(`Unknown water op: ${item.op}`);
    }
    assert.deepEqual(actual, item.expected);
  });
}

type EconomicsCase = {
  name: string;
  input: {
    area_ha: number;
    yield_kg_ha: number;
    price_pen_kg: number;
    costs_pen: number;
  };
  expected: Record<string, unknown>;
};

const economicsCase = JSON.parse(
  readFileSync(new URL('../../tests/parity/economics_cases.json', import.meta.url), 'utf8'),
) as EconomicsCase;

test(`economics parity: ${economicsCase.name}`, () => {
  const { area_ha, yield_kg_ha, price_pen_kg, costs_pen } = economicsCase.input;
  assert.deepEqual(
    calculateEconomics(area_ha, yield_kg_ha, price_pen_kg, costs_pen),
    economicsCase.expected,
  );
});
