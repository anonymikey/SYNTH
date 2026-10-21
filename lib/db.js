// Storage: Upstash Redis (REST, no deps) when configured, in-memory fallback for local dev.
const U = process.env.UPSTASH_REDIS_REST_URL, T = process.env.UPSTASH_REDIS_REST_TOKEN;
export const persistent = !!(U && T);
const mem = (globalThis.__synthai ||= { kv: {}, list: {}, hash: {} });

async function run(c) {
  if (persistent) {
    const r = await fetch(U, { method: 'POST', headers: { Authorization: `Bearer ${T}` }, body: JSON.stringify(c), cache: 'no-store' });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  }
  const [op, k, ...a] = c;
  switch (op) {
    case 'GET': return mem.kv[k] ?? null;
    case 'SET': mem.kv[k] = a[0]; return 'OK';
    case 'MGET': return [k, ...a].map((x) => mem.kv[x] ?? null);
    case 'LPUSH': (mem.list[k] ||= []).unshift(a[0]); return 1;
    case 'LTRIM': mem.list[k] = (mem.list[k] || []).slice(+a[0], +a[1] + 1); return 'OK';
    case 'LRANGE': return (mem.list[k] || []).slice(+a[0], +a[1] + 1);
    case 'HSET': (mem.hash[k] ||= {})[a[0]] = a[1]; return 1;
    case 'HDEL': delete (mem.hash[k] || {})[a[0]]; return 1;
    case 'HGETALL': return Object.entries(mem.hash[k] || {}).flat();
  }
}
const J = (s) => { try { return JSON.parse(s); } catch { return null; } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const TTL = ['EX', '2592000'];

export async function addEvent(e) {
  const id = uid();
  await run(['SET', 'ev:' + id, JSON.stringify({ id, ts: Date.now(), fb: 0, ...e }), ...TTL]);
  await run(['LPUSH', 'events', id]);
  await run(['LTRIM', 'events', '0', '999']);
  return id;
}
export async function rate(id, v) {
  const ev = J(await run(['GET', 'ev:' + id]));
  if (!ev) return false;
  ev.fb = v;
  await run(['SET', 'ev:' + id, JSON.stringify(ev), ...TTL]);
  return true;
}
export async function recent(n = 200) {
  const ids = await run(['LRANGE', 'events', '0', String(n - 1)]);
  if (!ids?.length) return [];
  return (await run(['MGET', ...ids.map((i) => 'ev:' + i)])).map(J).filter(Boolean);
}
export async function lessons() {
  const flat = (await run(['HGETALL', 'lessons'])) || [];
  const out = [];
  for (let i = 1; i < flat.length; i += 2) { const l = J(flat[i]); if (l) out.push(l); }
  return out.sort((a, b) => b.ts - a.ts);
}
export async function putLesson(l) {
  const lesson = { id: uid(), ts: Date.now(), status: 'pending', source: 'self', topic: 'general', ...l };
  await run(['HSET', 'lessons', lesson.id, JSON.stringify(lesson)]);
  return lesson;
}
// Adds a lesson unless the same text already exists. Returns the lesson or null.
export async function addLesson(l) {
  const text = String(l.text || '').trim().slice(0, 300);
  if (text.length < 10) return null;
  const norm = text.toLowerCase();
  if ((await lessons()).some((x) => x.text.toLowerCase() === norm)) return null;
  return putLesson({ ...l, text, topic: String(l.topic || 'general').slice(0, 40) });
}
export const delLesson = (id) => run(['HDEL', 'lessons', id]);
export const approved = async (n = 8) => (await lessons()).filter((l) => l.status === 'approved').slice(0, n);
export const getMeta = async (k) => J(await run(['GET', 'meta:' + k]));
export const setMeta = (k, v) => run(['SET', 'meta:' + k, JSON.stringify(v)]);
