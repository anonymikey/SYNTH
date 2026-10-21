import { rate } from '../../../lib/db';
export async function POST(req) {
  const { id, value } = await req.json();
  if (!id || ![-1, 0, 1].includes(value)) return Response.json({ ok: false }, { status: 400 });
  return Response.json({ ok: await rate(String(id), value) });
}
