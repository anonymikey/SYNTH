// Storage: Upstash Redis (REST, no deps) when configured, in-memory fallback for local dev.
import { createHash } from 'node:crypto';
const U = process.env.UPSTASH_REDIS_REST_URL, T = process.env.UPSTASH_REDIS_REST_TOKEN;
export const persistent = !!(U && T);
const mem = (globalThis.__synthai ||= { kv: {}, list: {}, hash: {}, expires: {} });
mem.expires ||= {};

async function run(c, { timeoutMs } = {}) {
  if (persistent) {
    const signal = Number.isFinite(timeoutMs) && timeoutMs > 0 ? AbortSignal.timeout(timeoutMs) : undefined;
    const r = await fetch(U, { method: 'POST', headers: { Authorization: `Bearer ${T}` }, body: JSON.stringify(c), cache: 'no-store', ...(signal ? { signal } : {}) });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  }
  const [op, k, ...a] = c;
  switch (op) {
    case 'GET': {
      if (mem.expires[k] && mem.expires[k] <= Date.now()) { delete mem.kv[k]; delete mem.expires[k]; }
      return mem.kv[k] ?? null;
    }
    case 'DEL': {
      let deleted = 0;
      for (const key of [k, ...a]) {
        if (Object.prototype.hasOwnProperty.call(mem.kv, key)) deleted++;
        delete mem.kv[key]; delete mem.expires[key]; delete mem.list[key]; delete mem.hash[key];
      }
      return deleted;
    }
    case 'SET':
      if (a.includes('NX')) {
        if (mem.expires[k] && mem.expires[k] <= Date.now()) { delete mem.kv[k]; delete mem.expires[k]; }
        if (Object.prototype.hasOwnProperty.call(mem.kv, k)) return null;
      }
      mem.kv[k] = a[0];
      if (a[1] === 'EX') mem.expires[k] = Date.now() + Number(a[2]) * 1000;
      else if (a[1] === 'PX') mem.expires[k] = Date.now() + Number(a[2]);
      else delete mem.expires[k];
      return 'OK';
    case 'MGET': return [k, ...a].map((x) => mem.kv[x] ?? null);
    case 'LPUSH': (mem.list[k] ||= []).unshift(a[0]); return 1;
    case 'LTRIM': mem.list[k] = (mem.list[k] || []).slice(+a[0], +a[1] + 1); return 'OK';
    case 'LRANGE': return (mem.list[k] || []).slice(+a[0], +a[1] + 1);
    case 'HSET': (mem.hash[k] ||= {})[a[0]] = a[1]; return 1;
    case 'HDEL': delete (mem.hash[k] || {})[a[0]]; return 1;
    case 'HGETALL': return Object.entries(mem.hash[k] || {}).flat();
    case 'HINCRBY': { const h = (mem.hash[k] ||= {}); h[a[0]] = Number(h[a[0]] || 0) + Number(a[1]); return h[a[0]]; }
    case 'EXPIRE': return 1; // the fallback is process-local and uses time-bucketed keys
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
// Update the existing interaction (not a second event); Redis Lua prevents duplicate/racing votes.
export async function rate(id, value, { category = '', comment = '' } = {}) {
  if (persistent) {
    const script = `
      local raw = redis.call('GET', KEYS[1])
      if not raw then return false end
      local ev = cjson.decode(raw)
      local prev = tonumber(ev.fb or 0)
      local next = tonumber(ARGV[1])
      local feedback = ev.feedback or {}
      local same = prev == next
      if same and next == -1 then same = feedback.category == ARGV[2] and feedback.comment == ARGV[3] end
      if same then return cjson.encode({prev=prev, changed=false, ev=ev}) end
      ev.fb = next
      if next == -1 then
        ev.feedback = {category=ARGV[2], comment=ARGV[3], updatedAt=tonumber(ARGV[4])}
      else
        ev.feedback = nil
      end
      redis.call('SET', KEYS[1], cjson.encode(ev), 'EX', '2592000')
      return cjson.encode({prev=prev, changed=(prev ~= next), ev=ev})
    `;
    const raw = await run(['EVAL', script, '1', 'ev:' + id, String(value), category, comment, String(Date.now())]);
    if (!raw) return null;
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  }
  const ev = J(await run(['GET', 'ev:' + id]));
  if (!ev) return null;
  const prev = Number(ev.fb || 0);
  const same = prev === value && (value !== -1 || (ev.feedback?.category === category && ev.feedback?.comment === comment));
  if (same) return { ev, prev, changed: false };
  ev.fb = value;
  if (value === -1) ev.feedback = { category, comment, updatedAt: Date.now() };
  else delete ev.feedback;
  await run(['SET', 'ev:' + id, JSON.stringify(ev), ...TTL]);
  return { ev, prev, changed: prev !== value };
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
  const lesson = { ts: Date.now(), status: 'pending', source: 'self', topic: 'general', ...l, id: l.id || uid() };
  await run(['HSET', 'lessons', lesson.id, JSON.stringify(lesson)]);
  return lesson;
}
// Adds a lesson unless the same text already exists. Returns the lesson or null.
export async function addLesson(l) {
  const text = String(l.text || '').trim().slice(0, 300);
  if (text.length < 10) return null;
  const norm = text.toLowerCase();
  if ((await lessons()).some((x) => x.text.toLowerCase() === norm)) return null;
  const id = uid();
  const digest = createHash('sha256').update(norm).digest('hex');
  const claimKey = `lesson:dedup:${digest}`;
  if (!(await claimTemp(claimKey, id, 30 * 24 * 60 * 60))) return null;
  try {
    return await putLesson({ ...l, id, text, topic: String(l.topic || 'general').slice(0, 40) });
  } catch (error) {
    await releaseTemp(claimKey, id).catch(() => false);
    throw error;
  }
}
export async function delLesson(id) {
  const existing = (await lessons()).find((lesson) => lesson.id === id);
  if (existing?.text) {
    const digest = createHash('sha256').update(String(existing.text).trim().toLowerCase()).digest('hex');
    const claimKey = `lesson:dedup:${digest}`;
    const owner = await getTemp(claimKey);
    if (owner) await releaseTemp(claimKey, owner);
  }
  return run(['HDEL', 'lessons', id]);
}
export const approved = async (n = 8) => (await lessons()).filter((l) => l.status === 'approved').slice(0, n);
export const getMeta = async (k) => J(await run(['GET', 'meta:' + k]));
export const setMeta = (k, v) => run(['SET', 'meta:' + k, JSON.stringify(v)]);

// Generic helpers used by SYNTHSPARK diagnostics and SYNTHCORE training stats.
export const hincr = (k, f, n = 1) => run(['HINCRBY', k, f, String(n)]);
export async function hincrExpiring(k, f, n = 1, ttlSeconds = 3600) {
  const value = await run(['HINCRBY', k, f, String(n)]);
  if (persistent) await run(['EXPIRE', k, String(ttlSeconds)]);
  return value;
}
export async function hall(k) {
  const flat = (await run(['HGETALL', k])) || [];
  const o = {};
  for (let i = 0; i < flat.length; i += 2) o[flat[i]] = Number(flat[i + 1]);
  return o;
}
export const putTemp = (k, v, ttlSeconds = 2592000, options = {}) => run(['SET', k, JSON.stringify(v), 'EX', String(ttlSeconds)], options);
export const getTemp = async (k, options = {}) => J(await run(['GET', k], options));
export const delTemp = (k, options = {}) => run(['DEL', k], options);
const TAKE_TEMP_SCRIPT = "local value=redis.call('GET',KEYS[1]); if value then redis.call('DEL',KEYS[1]); end; return value";
// Consume one-time state atomically so concurrent OAuth callbacks cannot both validate it.
export async function takeTemp(k, options = {}) {
  if (persistent) return J(await run(['EVAL', TAKE_TEMP_SCRIPT, '1', k], options));
  const raw = await run(['GET', k], options);
  if (raw !== null) await run(['DEL', k], options);
  return J(raw);
}
const RELEASE_TEMP_SCRIPT = "if redis.call('GET',KEYS[1]) == ARGV[1] then return redis.call('DEL',KEYS[1]); end; return 0";
export async function releaseTemp(k, expectedValue, options = {}) {
  if (persistent) return Number(await run(['EVAL', RELEASE_TEMP_SCRIPT, '1', k, String(expectedValue)], options)) === 1;
  if (await run(['GET', k], options) !== String(expectedValue)) return false;
  return Number(await run(['DEL', k], options)) === 1;
}
export async function getTemps(keys = [], options = {}) {
  if (!Array.isArray(keys) || !keys.length) return [];
  const values = (await run(['MGET', ...keys], options)) || [];
  return values.map(J);
}
// Atomic short-lived reservation for request-rate limits. Redis SET NX prevents concurrent
// serverless instances from claiming the same provider/model window.
export async function claimTemp(k, value, ttlSeconds = 60, options = {}) {
  const ttl = Math.max(1, Math.ceil(Number(ttlSeconds) || 1));
  const result = await run(['SET', k, String(value), 'EX', String(ttl), 'NX'], options);
  return result === 'OK';
}
// Millisecond-precision NX reservation for account-wide provider RPM windows.
export async function claimTempMs(k, value, ttlMs, options = {}) {
  const ttl = Math.max(1, Math.ceil(Number(ttlMs) || 1));
  const result = await run(['SET', k, String(value), 'PX', String(ttl), 'NX'], options);
  return result === 'OK';
}
const MAX_TEMP_SCRIPT = "local old=tonumber(redis.call('GET',KEYS[1]) or '0'); local next=tonumber(ARGV[1]); if next > old then redis.call('SET',KEYS[1],tostring(next),'EX',ARGV[2]); return next end; return old";
export async function putMaxTemp(k, value, ttlSeconds = 2592000, options = {}) {
  const next = Math.max(0, Math.floor(Number(value) || 0));
  const ttl = Math.max(1, Math.ceil(Number(ttlSeconds) || 1));
  if (persistent) return run(['EVAL', MAX_TEMP_SCRIPT, '1', k, String(next), String(ttl)], options);
  const current = Number(await getTemp(k)) || 0;
  const latest = Math.max(current, next);
  await run(['SET', k, JSON.stringify(latest), 'EX', String(ttl)]);
  return latest;
}
export async function pushCapped(k, v, cap) {
  await run(['LPUSH', k, JSON.stringify(v)]);
  await run(['LTRIM', k, '0', String(cap - 1)]);
}
export async function listJSON(k, n, options = {}) {
  try { return ((await run(['LRANGE', k, '0', String(n - 1)], options)) || []).map(J).filter(Boolean); }
  catch (error) { if (options.throwOnError) throw error; return []; }
}
