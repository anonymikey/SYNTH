import { isAdmin } from '../../../../lib/auth';
import { keyProblem, providerConfig } from '../../../../lib/env';
import { providerHealth } from '../../../../lib/health';
import { recent, lessons, getMeta, persistent, listJSON } from '../../../../lib/db';
import { summary } from '../../../../lib/core';
export const dynamic = 'force-dynamic';

function sparkMetrics(e) {
  const served = e.filter((x) => x.status !== 'Failed');
  return {
    total: e.length,
    success: e.filter((x) => x.status === 'Success').length,
    fallback: e.filter((x) => x.status === 'Fallback').length,
    failed: e.filter((x) => x.status === 'Failed').length,
    avgMs: served.length ? Math.round(served.reduce((a, x) => a + (x.ms || 0), 0) / served.length) : 0,
  };
}

export async function GET() {
  if (!isAdmin()) return Response.json({ error: 'auth' }, { status: 401 });
  const [evs, ls, focus, lastResult, entries] = await Promise.all([recent(500), lessons(), getMeta('focus'), getMeta('lastResult'), listJSON('spark', 200)]);
  const day = Date.now() - 864e5;
  const count = (f) => evs.filter(f).length;
  const bySource = {};
  ls.forEach((l) => { bySource[l.source] = (bySource[l.source] || 0) + 1; });
  const providers = providerHealth(providerConfig(), entries);
  return Response.json({
    persistent,
    health: { key: !keyProblem(), storage: persistent, cron: !!process.env.CRON_SECRET },
    providers,
    focus, lastResult, lessons: ls, bySource,
    stats: { total: evs.length, last24h: count((e) => e.ts > day), up: count((e) => e.fb === 1), down: count((e) => e.fb === -1), chat: count((e) => e.mode === 'chat'), build: count((e) => e.mode === 'build') },
    recent: evs.slice(0, 30),
    spark: { enabled: providers.active.includes('spark'), metrics: sparkMetrics(entries), entries: entries.slice(0, 40) },
    core: await summary(ls),
  });
}
