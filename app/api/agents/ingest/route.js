import { addLesson } from '../../../../lib/db';
// Other agents POST lessons here. AGENT_KEYS="researcher:key1,coder:key2". Lessons wait for admin approval.
export async function POST(req) {
  const key = req.headers.get('x-agent-key') || '';
  const hit = (process.env.AGENT_KEYS || '').split(',').map((s) => s.split(':')).find(([n, k]) => n && k && k === key);
  if (!hit) return Response.json({ error: 'Unknown agent key.' }, { status: 401 });
  const { lessons = [] } = await req.json().catch(() => ({}));
  let added = 0;
  for (const l of lessons.slice(0, 20)) if (await addLesson({ text: l.text, topic: l.topic, source: 'agent:' + hit[0] })) added++;
  return Response.json({ received: lessons.length, added, status: 'pending review' });
}
