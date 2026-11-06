import { addEvent } from '../../../lib/db.js';
import { rating } from '../../../lib/core.js';
const clean = (s, n) => String(s || '').replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '[email]').replace(/\d{7,}/g, '[number]').slice(0, n);
export async function POST(req) {
  try {
    const b = await req.json();
    if (!['chat', 'build'].includes(b.mode)) return Response.json({ error: 'bad mode' }, { status: 400 });
    const tid = typeof b.tid === 'string' ? b.tid.slice(0, 40) : '';
    const conversationId = typeof b.conversationId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(b.conversationId) ? b.conversationId : '';
    const regeneratedFrom = typeof b.regeneratedFrom === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(b.regeneratedFrom) ? b.regeneratedFrom : '';
    const id = await addEvent({ mode: b.mode, prompt: clean(b.prompt, 500), reply: clean(b.reply, 600), model: String(b.model || '').slice(0, 80), fb: b.error ? -1 : 0, error: !!b.error, ...(tid ? { tid } : {}), ...(conversationId ? { conversationId } : {}), ...(regeneratedFrom ? { regeneratedFrom } : {}) });
    if (b.error && tid) await rating(tid, 0, -1); // an error or formatting slip counts against the model that produced it
    return Response.json({ id });
  } catch { return Response.json({ id: null }); }
}
