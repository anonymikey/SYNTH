import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../app/api/admin/providers/route.js', import.meta.url), 'utf8');
const admin = readFileSync(new URL('../components/Admin.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

test('provider-health snapshot is admin-only, uncached and based on shared real task diagnostics', () => {
  assert.ok(route.indexOf('if (!isAdmin())') < route.indexOf("listJSON('spark', 500"));
  assert.match(route, /listJSON\('spark', 500, \{ timeoutMs: 750, throwOnError: true \}\)/);
  assert.match(route, /dynamic\s*=\s*'force-dynamic'/);
  assert.match(route, /no-store/);
  assert.match(route, /providerHealth\(providerConfig\(\), entries, refreshedAt\)/);
  assert.match(route, /refreshedAt/);
  assert.doesNotMatch(route, /fetch\s*\(/, 'health snapshot must not send billable provider probes');
});

test('Learning Studio refreshes health while visible and provides an explicit manual refresh', () => {
  assert.match(admin, /const PROVIDER_REFRESH_MS = 15_000/);
  assert.match(admin, /setInterval\(refreshIfVisible, PROVIDER_REFRESH_MS\)/);
  assert.match(admin, /document\.visibilityState === 'visible'/);
  assert.match(admin, /addEventListener\('visibilitychange', refreshIfVisible\)/);
  assert.match(admin, /removeEventListener\('visibilitychange', refreshIfVisible\)/);
  assert.match(admin, /fetch\('\/api\/admin\/providers', \{ cache: 'no-store' \}\)/);
  assert.match(admin, /onClick=\{\(\) => loadProviderHealth\(false\)\}/);
  assert.match(admin, /Real-time Providers Health/);
  assert.match(admin, /No test prompts are sent or provider quota consumed/);
});

test('health panel uses SYNTH-safe aliases and remains responsive on narrow screens', () => {
  assert.match(admin, /providerLabel\('openrouter'\)/);
  assert.match(admin, /providerLabel\('apinex'\)/);
  assert.match(admin, /safeFrontendText\(provider\.lastError\)/);
  assert.match(styles, /\.admin-provider-grid\{display:grid;grid-template-columns:repeat\(auto-fit,minmax\(178px,1fr\)\)/);
  assert.match(styles, /@media\(max-width:480px\)\{[\s\S]*?\.admin-provider-grid\{grid-template-columns:1fr\}/);
});
