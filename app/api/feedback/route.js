import { rate } from '../../../lib/db';
import { rating } from '../../../lib/core';
export async function POST(req) {
  const { id, value } = await req.json();
  if (!id || ![-1, 0, 1].includes(value)) return Response.json({ ok: false }, { status: 400 });
  const r = await rate(String(id), value);
  if (!r) return Response.json({ ok: false });
  if (r.ev.tid) await rating(r.ev.tid, r.prev, value); // feeds the per-model training stats
  return Response.json({ ok: true });
}
