import { isAdmin } from '../../../../lib/auth';
import { lessons, putLesson, delLesson, addLesson } from '../../../../lib/db';
export async function POST(req) {
  if (!isAdmin()) return Response.json({ error: 'auth' }, { status: 401 });
  const { action, id, text, topic } = await req.json();
  if (action === 'add') return Response.json({ lesson: await addLesson({ text, topic, source: 'admin', status: 'approved' }) });
  if (action === 'delete') { await delLesson(id); return Response.json({ ok: true }); }
  const l = (await lessons()).find((x) => x.id === id);
  if (!l || !['approve', 'reject'].includes(action)) return Response.json({ error: 'not found' }, { status: 404 });
  await putLesson({ ...l, status: action === 'approve' ? 'approved' : 'rejected' });
  return Response.json({ ok: true });
}
