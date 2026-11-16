import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyScenarioValues, type ScenarioInput } from './scenario';

/**
 * Parity with services/scenario.py: the PWA must produce exactly the same
 * offline estimate as the Python engine for the shared fixtures.
 */
type Case = { name: string; input: ScenarioInput; expected: Record<string, unknown> };

const casesPath = resolve(process.cwd(), '../tests/parity/scenario_cases.json');
const cases = JSON.parse(readFileSync(casesPath, 'utf-8')) as Case[];

describe('applyScenarioValues', () => {
  it.each(cases.map((item) => [item.name, item] as const))(
    'matches the shared fixture: %s',
    (_name, item) => {
      expect(applyScenarioValues(item.input)).toEqual(item.expected);
    },
  );
});
