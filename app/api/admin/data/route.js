import { isAdmin } from '../../../../lib/auth';
import { keyProblem } from '../../../../lib/env';
import { recent, lessons, getMeta, persistent, listJSON } from '../../../../lib/db';
import { sparkEnabled } from '../../../../lib/spark';
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
  return Response.json({
    persistent,
    health: { key: !keyProblem(), storage: persistent, cron: !!process.env.CRON_SECRET, spark: sparkEnabled() },
    focus, lastResult, lessons: ls, bySource,
    stats: { total: evs.length, last24h: count((e) => e.ts > day), up: count((e) => e.fb === 1), down: count((e) => e.fb === -1), chat: count((e) => e.mode === 'chat'), build: count((e) => e.mode === 'build') },
    recent: evs.slice(0, 30),
    spark: { enabled: sparkEnabled(), metrics: sparkMetrics(entries), entries: entries.slice(0, 40) },
    core: await summary(ls),
  });
}
