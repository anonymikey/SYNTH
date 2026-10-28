import { isAdmin } from '../../../../lib/auth';
import { setToolEnabled, checkTools, toolById } from '../../../../lib/tools';
export const runtime = 'nodejs';
export const maxDuration = 30;

// Admin only: switch a tool on or off, or run its sample call (one tool, or all of them).
export async function POST(req) {
  if (!isAdmin()) return Response.json({ error: 'auth' }, { status: 401 });
  const { action, id, enabled } = await req.json().catch(() => ({}));
  if (id !== undefined && !toolById(id)) return Response.json({ error: 'Unknown tool.' }, { status: 400 });
  if (action === 'toggle' && id) { await setToolEnabled(id, enabled === true); return Response.json({ ok: true }); }
  if (action === 'check') { await checkTools(id ? [id] : null); return Response.json({ ok: true }); }
  return Response.json({ error: 'Unknown action.' }, { status: 400 });
}
