import { listJSON, persistent } from '../../../lib/db.js';
import { aggregateStatus } from '../../../lib/status.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const PUBLIC_HEADERS = {
  'Cache-Control': 'public, max-age=0, s-maxage=10, stale-while-revalidate=20',
};
const UNAVAILABLE_HEADERS = { 'Cache-Control': 'no-store, max-age=0', Pragma: 'no-cache' };

export async function GET() {
  if (!persistent) return Response.json({ error: 'status_unavailable' }, { status: 503, headers: UNAVAILABLE_HEADERS });
  try {
    const entries = await listJSON('spark', 500, { timeoutMs: 750, throwOnError: true });
    return Response.json(aggregateStatus(entries), { headers: PUBLIC_HEADERS });
  } catch {
    return Response.json({ error: 'status_unavailable' }, { status: 503, headers: UNAVAILABLE_HEADERS });
  }
}
