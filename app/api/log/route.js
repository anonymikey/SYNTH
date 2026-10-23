import { addEvent } from '../../../lib/db';
import { rating } from '../../../lib/core';
const clean = (s, n) => String(s || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]').replace(/\d{7,}/g, '[number]').slice(0, n);
export async function POST(req) {
  try {
    const b = await req.json();
    if (!['chat', 'build'].includes(b.mode)) return Response.json({ error: 'bad mode' }, { status: 400 });
    const tid = typeof b.tid === 'string' ? b.tid.slice(0, 40) : '';
    const id = await addEvent({ mode: b.mode, prompt: clean(b.prompt, 500), reply: clean(b.reply, 600), model: String(b.model || '').slice(0, 80), fb: b.error ? -1 : 0, ...(tid ? { tid } : {}) });
    if (b.error && tid) await rating(tid, 0, -1); // an error or formatting slip counts against the model that produced it
    return Response.json({ id });
  } catch { return Response.json({ id: null }); }
}
