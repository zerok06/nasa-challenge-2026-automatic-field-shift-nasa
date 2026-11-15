import assert from 'node:assert/strict';
import test from 'node:test';

import { formatMoney, formatNumber, formatPercent } from '../src/lib/format';

test('formatNumber uses the es-PE decimal format', () => {
  assert.equal(formatNumber(12.34, 'mm'), '12.34 mm');
  assert.equal(formatNumber(null, 'mm'), 'No disponible');
});

test('formatMoney uses S/ with thousands and two decimals', () => {
  assert.equal(formatMoney(1234.5), 'S/ 1,234.50');
  assert.equal(formatMoney(null), 'No calculable');
});

test('formatPercent renders a percentage', () => {
  assert.equal(formatPercent(0.2), '20%');
  assert.equal(formatPercent(null), '—');
});
