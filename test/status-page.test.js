import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync(new URL('../app/api/status/route.js', import.meta.url), 'utf8');
const page = readFileSync(new URL('../app/status/page.js', import.meta.url), 'utf8');
const client = readFileSync(new URL('../components/StatusDashboard.js', import.meta.url), 'utf8');
const landing = readFileSync(new URL('../components/landing/Landing.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');


test('public status API reads only shared retained events with strict bounded storage access', () => {
  assert.match(route, /export async function GET\(\)/);
  assert.match(route, /persistent/);
  assert.match(route, /listJSON\('spark', 500, \{ timeoutMs: 750, throwOnError: true \}\)/);
  assert.match(route, /aggregateStatus\(entries\)/);
  assert.match(route, /s-maxage=10, stale-while-revalidate=20/);
  assert.match(route, /status_unavailable/);
  assert.match(route, /no-store/);
  assert.doesNotMatch(route, /isAdmin|providerConfig|fetch\s*\(/, 'public route must not call providers or expose admin configuration');
  assert.doesNotMatch(route, /lastError|process\.env|CRON_SECRET|OPENROUTER|CLOUDFLARE/);
});

test('public status page links discovery and uses the expected first-party metadata', () => {
  assert.match(page, /StatusDashboard/);
  assert.match(page, /title: 'SYNTH Status/);
  assert.match(landing, /href="\/status">Service status/);
});

test('dashboard refreshes while visible, resumes on visibility, prevents duplicates and preserves stale snapshot on error', () => {
  assert.match(client, /const REFRESH_MS = 15_000/);
  assert.match(client, /document\.visibilityState === 'visible'/);
  assert.match(client, /window\.setInterval\(refreshIfVisible, REFRESH_MS\)/);
  assert.match(client, /addEventListener\('visibilitychange', refreshIfVisible\)/);
  assert.match(client, /removeEventListener\('visibilitychange', refreshIfVisible\)/);
  assert.match(client, /if \(requestInFlight\.current\) return/);
  assert.match(client, /setSnapshot\(next\)/);
  assert.match(client, /Showing the latest available snapshot/);
  assert.match(client, /onClick=\{refresh\}/);
  assert.match(client, /cache: 'no-store'/);
});

test('bars expose per-day details to assistive technology and explain unknown data honestly', () => {
  assert.match(client, /role="list" aria-label=\{`\$\{service\.label\} daily request outcomes/);
  assert.match(client, /tabIndex=\{0\}/);
  assert.match(client, /aria-label=\{barDescription\(bar\)\}/);
  assert.match(client, /no recorded requests; this is not an uptime check/);
  assert.match(client, /retains at most 500 recent records/);
  assert.match(client, /Observed routed outcomes/);
  assert.match(client, /not separately monitored here/);
  assert.match(styles, /prefers-reduced-motion:reduce\)\{\.status-page/);
  assert.match(styles, /\.status-history-viewport\{[^}]*overflow-x:auto/);
  assert.match(styles, /@media\(max-width:480px\)\{\.status-shell/);
});
