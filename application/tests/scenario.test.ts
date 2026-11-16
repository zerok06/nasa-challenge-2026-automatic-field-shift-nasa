import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { applyScenarioValues, type ScenarioInput } from '../src/engine/scenario';

type Case = { name: string; input: ScenarioInput; expected: Record<string, unknown> };

const cases = JSON.parse(
  readFileSync(new URL('../../tests/parity/scenario_cases.json', import.meta.url), 'utf8'),
) as Case[];

for (const item of cases) {
  test(`parity fixture: ${item.name}`, () => {
    assert.deepEqual(applyScenarioValues(item.input), item.expected);
  });
}
