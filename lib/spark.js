// SYNTHSPARK: routing engine. Providers come from providerConfig() (OpenRouter by default, SPARK gateway optional) in the
// configured order. Targets are tried until one starts answering. A target that errors, rejects the key, breaks the stream
// or shows no token within 14 s is skipped silently, so a dead provider never leaves the user waiting.
import { apiBase, apiKey, providerConfig, sparkBase, sparkKey } from './env.js';
import { cloudflareChatTarget } from './cloudflare.js';
import { pickModels, cooldown } from './models.js';
import { claimTemp, claimTempMs, getTemp, getTemps, persistent, pushCapped, putMaxTemp, putTemp } from './db.js';
import { record, recordFail } from './core.js';
import { UNO_COOLDOWN_STORAGE_TIMEOUT_MS, UNO_DEFAULT_RATE_LIMIT_COOLDOWN_MS, UNO_MAX_COOLDOWN_MS, UNO_MIN_MODEL_INTERVAL_MS, isUnoFreeModelId, parseUnoRetryAfter, unorouterBase, unorouterKey, verifiedUnoFreeModels } from './unorouter.js';
import { APINEX_ACCOUNT_COOLDOWN_KEY, APINEX_CIRCUIT_BREAKER_KEY, APINEX_DEFAULT_FAILURE_COOLDOWN_MS, APINEX_DEFAULT_QUOTA_COOLDOWN_MS, APINEX_DEFAULT_RATE_LIMIT_COOLDOWN_MS, APINEX_MAX_COOLDOWN_MS, APINEX_MIN_REQUEST_INTERVAL_MS, APINEX_STORAGE_TIMEOUT_MS, apinexChatTargets, apinexQuotaResetAt, parseApinexCooldown } from './apinex.js';

const MAX_ATTEMPTS = 4;       // first try + 3 automatic retries, across all providers
const PER_PROVIDER = 2;       // with two providers, each gets this many tries before the other one is used
const SPARK_TRIES = 2;        // gateway routes available per request
const FIRST_TOKEN_MS = 14000; // no first token by now: skip this target
const BUDGET_MS = 36000;      // no new attempts after this, to stay inside the function time limit
const DOWN_MS = 90000;        // a provider that just failed is tried last for this long

const env = (k) => (process.env[k] || '').trim();
const sparkCool = (globalThis.__sparkCool ||= new Map());
const provDown = (globalThis.__provDown ||= new Map());
const unoCool = (globalThis.__synthUnoCool ||= new Map());
const apinexCool = (globalThis.__synthApinexCool ||= new Map());

export const sparkEnabled = () => providerConfig().active.includes('spark');

// Gateway model strings. "auto", "auto:smart", "auto:reliable" and "auto:<profile>" are FreeLLMAPI routing modes.
// The gateway itself restricts image requests to vision-capable models.
const sparkModels = (code) => [...new Set((code ? [env('SPARK_CODE_MODEL'), 'auto:smart', 'auto:reliable'] : [env('SPARK_VISION_MODEL'), 'auto', 'auto:reliable']).filter(Boolean))].slice(0, SPARK_TRIES);

async function targetsFor(provider, code, hasImg) {
  if (provider === 'apinex') {
    if (hasImg) return []; // Keep APInex text-only, even if a live catalog entry advertises vision.
    // Check the live catalog only when routing reaches this fallback, not for every primary-provider request.
    return [{ engine: 'apinex', deferred: true, label: 'apinex' }];
  }
  if (provider === 'unorouter') {
    if (hasImg) return []; // Do not send image payloads to a model without verified image-input support.
    const models = await verifiedUnoFreeModels();
    await restoreUnoCooldowns(models);
    return models
      .filter((model) => isUnoFreeModelId(model) && !(unoCool.get(model) > Date.now()))
      .map((model) => ({ engine: 'unorouter', base: unorouterBase(), key: unorouterKey(), model, label: 'unorouter/' + model }));
  }
  if (provider === 'spark') {
    const all = sparkModels(code).map((model) => ({ engine: 'spark', base: sparkBase(), key: sparkKey(), model, label: 'spark/' + model }));
    const now = Date.now();
    return [...all.filter((t) => !(sparkCool.get(t.label) > now)), ...all.filter((t) => sparkCool.get(t.label) > now)]; // recently failing routes last
  }
  if (provider === 'cloudflare') return [cloudflareChatTarget(hasImg)].map((t) => ({ ...t, engine: 'cloudflare' }));
  return (await pickModels(hasImg, code ? 'code' : 'chat')).map((m) => ({ engine: 'openrouter', base: apiBase(), key: apiKey(), model: m.id, label: 'openrouter/' + m.id }));
}

// Provider order is resolved first; model discovery happens only when that provider's turn arrives.
function planProviders() {
  const active = providerConfig().active;
  const now = Date.now();
  return [...active.filter((p) => !(provDown.get(p) > now)), ...active.filter((p) => provDown.get(p) > now)];
}

function brief(t) {
  try { return JSON.parse(t).error?.message || String(t).slice(0, 160); } catch { return String(t).slice(0, 160); }
}

function unoCooldownStorageKey(model) { return `chat:cooldown:unorouter:model:${encodeURIComponent(model)}`; }

async function restoreUnoCooldowns(models) {
  const eligible = models.filter(isUnoFreeModelId);
  if (!eligible.length) return;
  try {
    const values = await getTemps(eligible.map(unoCooldownStorageKey), { timeoutMs: UNO_COOLDOWN_STORAGE_TIMEOUT_MS });
    const now = Date.now();
    eligible.forEach((model, index) => {
      const until = Number(values[index]) || 0;
      if (until > now) unoCool.set(model, Math.max(unoCool.get(model) || 0, until));
    });
  } catch {}
}

async function persistUnoCooldown(model, until) {
  const ttlSeconds = Math.ceil((until - Date.now()) / 1000);
  if (ttlSeconds < 1) return;
  try {
    await putMaxTemp(unoCooldownStorageKey(model), Math.trunc(until), Math.min(86400, ttlSeconds), { timeoutMs: UNO_COOLDOWN_STORAGE_TIMEOUT_MS });
  } catch {}
}

async function reserveUnoModel(model) {
  if (!persistent || !isUnoFreeModelId(model)) return false;
  const now = Date.now();
  const until = now + UNO_MIN_MODEL_INTERVAL_MS;
  const reserved = await claimTemp(unoCooldownStorageKey(model), Math.trunc(until), Math.ceil(UNO_MIN_MODEL_INTERVAL_MS / 1000), { timeoutMs: UNO_COOLDOWN_STORAGE_TIMEOUT_MS });
  unoCool.set(model, Math.max(unoCool.get(model) || 0, until));
  return reserved;
}

async function reserveApinexAccount() {
  if (!persistent) return false;
  if ((apinexCool.get('account') || 0) > Date.now()) return false;
  const blockedUntil = Number(await getTemp(APINEX_CIRCUIT_BREAKER_KEY, { timeoutMs: APINEX_STORAGE_TIMEOUT_MS })) || 0;
  if (blockedUntil > Date.now()) return false;
  const until = Date.now() + APINEX_MIN_REQUEST_INTERVAL_MS;
  return claimTempMs(APINEX_ACCOUNT_COOLDOWN_KEY, Math.trunc(until), APINEX_MIN_REQUEST_INTERVAL_MS, { timeoutMs: APINEX_STORAGE_TIMEOUT_MS });
}

async function persistApinexCooldown(until) {
  const deadline = Math.trunc(until);
  apinexCool.set('account', Math.max(apinexCool.get('account') || 0, deadline));
  const ttlSeconds = Math.ceil((until - Date.now()) / 1000);
  if (ttlSeconds < 1) return true;
  try {
    const saved = await putMaxTemp(APINEX_ACCOUNT_COOLDOWN_KEY, deadline, Math.min(86400, ttlSeconds), { timeoutMs: APINEX_STORAGE_TIMEOUT_MS });
    if (Number(saved) >= deadline) return true;
  } catch {}

  // If the atomic max-write fails, quarantine APInex for one day using a separate shared key.
  // Every fallback write extends to now + 24h, so concurrent failures cannot shorten the hold.
  const quarantineUntil = Math.trunc(Date.now() + APINEX_MAX_COOLDOWN_MS);
  apinexCool.set('account', Math.max(apinexCool.get('account') || 0, quarantineUntil));
  try {
    await putTemp(APINEX_CIRCUIT_BREAKER_KEY, quarantineUntil, Math.ceil(APINEX_MAX_COOLDOWN_MS / 1000), { timeoutMs: APINEX_STORAGE_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

// Reads the start of the stream until the model is really answering. Fails on errors or empty streams.
async function probe(reader) {
  const dec = new TextDecoder();
  const chunks = [];
  let buf = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const l of lines) {
        const s = l.trim();
        if (!s.startsWith('data:')) continue;
        const d = s.slice(5).trim();
        if (!d || d === '[DONE]') continue;
        let j;
        try { j = JSON.parse(d); } catch { continue; }
        if (j.error) return { fail: brief(JSON.stringify(j)) };
        const c = j.choices?.[0];
        const dl = c?.delta || {};
        if (dl.content || dl.reasoning || dl.reasoning_content) return { live: { reader, chunks } };
        if (c?.finish_reason === 'error') return { fail: 'provider error' };
      }
    }
  } catch (e) { return { fail: e.name === 'AbortError' ? 'timed out' : e.message }; }
  return { fail: 'empty response' };
}

// Replays what was read while probing, then streams the rest.
function relay({ reader, chunks }) {
  return new ReadableStream({
    start(c) { chunks.forEach((b) => c.enqueue(b)); },
    async pull(c) {
      try { const { done, value } = await reader.read(); if (done) c.close(); else c.enqueue(value); } catch { c.close(); }
    },
    cancel() { reader.cancel().catch(() => {}); },
  });
}

function apinexFailureMessage(status) {
  if (status === 401) return 'credentials rejected';
  if (status === 402) return 'free allowance unavailable';
  if (status === 429) return 'rate limited';
  if (status === 502 || status === 503) return 'temporary upstream failure';
  return 'provider request failed';
}

async function attempt(t, messages, code) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FIRST_TOKEN_MS);
  const headers = { Authorization: `Bearer ${t.key}`, 'Content-Type': 'application/json', 'X-Title': 'SYNTH' };
  if (t.engine === 'spark') headers['X-FreeLLM-Task-Type'] = code ? 'code' : 'chat'; // soft routing hint for the gateway
  try {
    const up = await fetch(`${t.base}/chat/completions`, { method: 'POST', signal: ac.signal, headers, body: JSON.stringify({ model: t.model, stream: true, messages }) });
    if (!up.ok || !up.body) {
      const isApinex = t.engine === 'apinex';
      const raw = isApinex ? '' : await up.text().catch(() => '');
      if (isApinex) up.body?.cancel().catch(() => {}); // Never log or persist a provider-supplied error body.
      const e = new Error(isApinex ? apinexFailureMessage(up.status) : brief(raw) || up.statusText);
      e.status = up.status;
      if (t.engine === 'unorouter') e.retryAfterMs = parseUnoRetryAfter(up.headers.get('retry-after'));
      if (isApinex) e.retryAfterMs = parseApinexCooldown(up.headers);
      throw e;
    }
    const reader = up.body.getReader();
    const r = await probe(reader);
    if (r.fail) {
      reader.cancel().catch(() => {});
      const message = t.engine === 'apinex' ? (r.fail === 'timed out' ? 'timed out' : 'provider stream failed') : r.fail;
      const e = new Error(message);
      e.status = r.fail === 'timed out' ? 504 : 502;
      throw e;
    }
    clearTimeout(timer);
    let via = up.headers.get('x-routed-via') || ''; // the gateway reports the real "<provider>/<model>" here
    try { via = decodeURIComponent(via); } catch {}
    return { ...r.live, via, gw: Number(up.headers.get('x-fallback-attempts')) || 0 };
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') { e.message = 'timed out'; e.status = 504; }
    else if (t.engine === 'apinex' && !e.status) { e.message = 'provider transport failed'; e.status = 502; }
    throw e;
  }
}

const safely = (p) => p.catch(() => {});

// mode: 'chat' (SYNTH ASSISTANT) | 'build' (SYNTHCODE). retry: skip the first target (used after a formatting slip).
export async function route({ mode, task, hasImg, payload, retry, step = 0, budgetMs = BUDGET_MS }) {
  const code = mode === 'build';
  const cfg = providerConfig();
  const primary = cfg.active[0]; // the provider the configuration puts first
  const t0 = Date.now();
  const tid = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const providers = planProviders();
  const cap = providers.length > 1 ? PER_PROVIDER : MAX_ATTEMPTS;
  const used = {};
  const fails = [];
  let targetAvailable = false;
  let skipFirst = !!retry;

  for (const provider of providers) {
    if (fails.length >= MAX_ATTEMPTS || Date.now() - t0 > budgetMs) break;
    let candidates;
    try { candidates = await targetsFor(provider, code, hasImg); }
    catch (error) {
      const status = Number(error?.status) || 0;
      const label = `${provider}/model discovery`;
      fails.push({ provider, target: label, status, msg: String(error?.message || 'Model discovery failed.').replace(/[\r\n\t]+/g, ' ').slice(0, 140) });
      provDown.set(provider, Date.now() + DOWN_MS);
      await recordFail(task, label);
      continue;
    }
    if (!candidates.length) continue;
    targetAvailable = true;
    for (const candidate of candidates) {
      if (fails.length >= MAX_ATTEMPTS || Date.now() - t0 > budgetMs) break;
      if ((used[candidate.engine] || 0) >= cap) continue;
      if (skipFirst) { skipFirst = false; continue; }
      let t = candidate;
      if (t.deferred && t.engine === 'apinex') {
        t = (await apinexChatTargets())[0];
        if (!t) continue;
        targetAvailable = true;
      }
      if (t.engine === 'unorouter') {
        const reserved = await reserveUnoModel(t.model).catch(() => false);
        if (!reserved) continue; // A shared reservation or storage failure means skip safely to another provider.
      }
      if (t.engine === 'apinex') {
        const reserved = await reserveApinexAccount().catch(() => false);
        if (!reserved) continue; // A shared reservation or storage failure means skip safely to another provider.
      }
      used[t.engine] = (used[t.engine] || 0) + 1;
      try {
        const live = await attempt(t, payload, code);
        provDown.delete(t.engine);
        const ms = Date.now() - t0;
        const via = live.via || t.label;
        const viaFallback = cfg.active.length > 1 && t.engine !== primary;
        const failovers = Math.max(fails.length + live.gw, viaFallback ? 1 : 0);
        const status = failovers > 0 ? 'Fallback' : 'Success';
        await Promise.all([
          safely(pushCapped('spark', { tid, ts: Date.now(), mode, task, step, provider: t.engine, node: via, failovers, ms, status, img: hasImg, fails: fails.slice(0, 3) }, 500)),
          record({ tid, task, via, ms, fallback: failovers > 0 }),
        ]);
        return { ok: true, tid, stream: relay(live) };
      } catch (e) {
        const status = e.status || 0;
        fails.push({ provider: t.engine, target: t.label, status, msg: String(e.message).slice(0, 140) });
        console.warn('[synthspark] target failed:', t.label, status, String(e.message).slice(0, 140));
        const retryAfter = Number(e.retryAfterMs) || 0;
        let hold = status === 429 ? 120000 : status === 401 || status === 403 ? 30000 : 60000;
        if (t.engine === 'unorouter' && (status === 429 || status === 503)) {
          hold = Math.min(UNO_MAX_COOLDOWN_MS, status === 429 ? (retryAfter || UNO_DEFAULT_RATE_LIMIT_COOLDOWN_MS) : Math.max(60000, retryAfter));
        } else if (t.engine === 'apinex') {
          if (status === 429) hold = Math.max(APINEX_DEFAULT_RATE_LIMIT_COOLDOWN_MS, retryAfter);
          else if (status === 402) {
            const resetAt = await apinexQuotaResetAt();
            hold = resetAt > Date.now() ? resetAt - Date.now() : APINEX_DEFAULT_QUOTA_COOLDOWN_MS;
          } else hold = Math.max(APINEX_DEFAULT_FAILURE_COOLDOWN_MS, retryAfter);
          hold = Math.min(APINEX_MAX_COOLDOWN_MS, hold);
        }
        if (t.engine === 'spark') sparkCool.set(t.label, Date.now() + hold);
        else if (t.engine === 'unorouter' && isUnoFreeModelId(t.model)) {
          const until = Date.now() + hold;
          unoCool.set(t.model, Math.max(unoCool.get(t.model) || 0, until));
          if (status === 429 || status === 503) await persistUnoCooldown(t.model, until);
        } else if (t.engine === 'apinex') {
          await persistApinexCooldown(Date.now() + hold);
        } else cooldown(t.model, hold);
        if (status === 401 || status === 429 || status >= 500 || e.name === 'TimeoutError' || e.name === 'AbortError') used[t.engine] = cap;
        if (used[t.engine] >= cap) provDown.set(t.engine, Date.now() + DOWN_MS);
        await recordFail(task, t.label);
      }
    }
  }
  for (const p of Object.keys(used)) provDown.set(p, Date.now() + DOWN_MS); // nobody answered: remember who was tried
  await safely(pushCapped('spark', { tid, ts: Date.now(), mode, task, step, provider: '', node: '', failovers: fails.length, ms: Date.now() - t0, status: 'Failed', img: hasImg, fails: fails.slice(0, 3) }, 500));
  return { ok: false, tid, noTargets: !targetAvailable };
}
