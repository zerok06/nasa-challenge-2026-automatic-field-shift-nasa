import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveApiUrl } from '../src/services/api/resolveApiUrl';

test('keeps an explicit LAN API URL', () => {
  assert.equal(
    resolveApiUrl('http://192.168.18.30:8000', '192.168.18.30:8081'),
    'http://192.168.18.30:8000',
  );
});

test('replaces localhost with the Metro host in Expo Go', () => {
  assert.equal(
    resolveApiUrl('http://localhost:8000', '192.168.18.30:8081'),
    'http://192.168.18.30:8000',
  );
});

test('handles an exp:// host and a custom API port', () => {
  assert.equal(
    resolveApiUrl('http://127.0.0.1:9000', 'exp://192.168.18.41:8081'),
    'http://192.168.18.41:9000',
  );
});

test('keeps localhost when there is no LAN Metro host', () => {
  assert.equal(resolveApiUrl('http://localhost:8000', 'localhost:8081'), 'http://localhost:8000');
  assert.equal(resolveApiUrl(undefined, undefined), 'http://localhost:8000');
});
