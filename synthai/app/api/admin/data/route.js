import { isAdmin } from '../../../../lib/auth';
import { keyProblem } from '../../../../lib/env';
import { recent, lessons, getMeta, persistent } from '../../../../lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!isAdmin()) return Response.json({ error: 'auth' }, { status: 401 });
  const [evs, ls, focus, lastResult] = await Promise.all([recent(500), lessons(), getMeta('focus'), getMeta('lastResult')]);
  const day = Date.now() - 864e5;
  const count = (f) => evs.filter(f).length;
  const bySource = {};
  ls.forEach((l) => { bySource[l.source] = (bySource[l.source] || 0) + 1; });
  return Response.json({
    persistent, health: { key: !keyProblem(), storage: persistent, cron: !!process.env.CRON_SECRET }, focus, lastResult, lessons: ls, bySource,
    stats: { total: evs.length, last24h: count((e) => e.ts > day), up: count((e) => e.fb === 1), down: count((e) => e.fb === -1), chat: count((e) => e.mode === 'chat'), build: count((e) => e.mode === 'build') },
    recent: evs.slice(0, 30),
  });
}
