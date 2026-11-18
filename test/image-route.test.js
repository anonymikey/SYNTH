import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../app/api/image/route.js', import.meta.url), 'utf8');

test('image timeouts are logged and returned as gateway timeout, not generic bad gateway', () => {
  assert.match(route, /const timedOut = e\?\.name === 'TimeoutError' \|\| e\?\.name === 'AbortError'/);
  assert.match(route, /const failureStatus = timedOut \? 504 : 502/);
  assert.match(route, /logRun\(id, started, 'Failed', e\.message, failureStatus\)/);
  assert.match(route, /status: failureStatus/);
  assert.match(route, /Image generation timed out while the service was responding/);
});

test('image provider diagnostics redact credential-like text before persistence or logging', () => {
  assert.match(route, /function safeError\(value\)/);
  assert.match(route, /Bearer \[redacted\]/);
  assert.match(route, /\[redacted key\]/);
  assert.match(route, /safeError\(error\)/);
  assert.match(route, /safeError\(e\.message\)/);
});
