import { isAdmin } from '../../../../lib/auth.js';
import { listJSON } from '../../../../lib/db.js';
import { providerConfig } from '../../../../lib/env.js';
import { providerHealth } from '../../../../lib/health.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_CACHE = { 'Cache-Control': 'private, no-store, max-age=0', Pragma: 'no-cache' };

export async function GET() {
  if (!isAdmin()) return Response.json({ error: 'unauthorized' }, { status: 401, headers: NO_CACHE });
  try {
    const entries = await listJSON('spark', 500, { timeoutMs: 750, throwOnError: true });
    const refreshedAt = Date.now();
    return Response.json({ providers: providerHealth(providerConfig(), entries, refreshedAt), refreshedAt }, { headers: NO_CACHE });
  } catch {
    return Response.json({ error: 'provider_health_unavailable' }, { status: 503, headers: NO_CACHE });
  }
}
