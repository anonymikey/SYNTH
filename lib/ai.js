// One-shot completion for SYNTHCORE learning. Keep provider order, but reserve time for later providers.
import { apiBase, apiKey, keyProblem, providerConfig, sparkBase, sparkKey } from './env.js';
import { cloudflareChatTarget } from './cloudflare.js';
import { cooldown, cooldownUntil, isCoolingDown, pickModels } from './models.js';
import { getTemps, putMaxTemp } from './db.js';

const CALL_MS = 14000;
const BUDGET_MS = 40000;
const MAX_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const COOLDOWN_STORAGE_TIMEOUT_MS = 750;
const providerCool = globalThis.__synthLearningProviderCool ||= new Map();

function modelCooldownKey(id) { return `learn:cooldown:model:${encodeURIComponent(id)}`; }
function providerCooldownKey(provider) { return `learn:cooldown:provider:${provider}`; }

async function restoreCooldowns(entries, apply) {
  if (!entries.length) return;
  try {
    const values = await getTemps(entries.map((entry) => entry.key), { timeoutMs: COOLDOWN_STORAGE_TIMEOUT_MS });
    const now = Date.now();
    entries.forEach((entry, index) => {
      const until = Number(values[index]) || 0;
      if (until > now) apply(entry, until);
    });
  } catch {}
}

async function persistCooldown(key, until) {
  const ttlSeconds = Math.ceil((until - Date.now()) / 1000);
  if (ttlSeconds < 1) return;
  try { await putMaxTemp(key, Math.trunc(until), Math.min(86400, ttlSeconds), { timeoutMs: COOLDOWN_STORAGE_TIMEOUT_MS }); } catch {}
}

async function restoreProviderCooldowns(providers) {
  const unique = [...new Set(providers)];
  await restoreCooldowns(unique.map((provider) => ({ key: providerCooldownKey(provider), provider })), ({ provider }, until) => {
    providerCool.set(provider, Math.max(providerCool.get(provider) || 0, until));
  });
}

async function restoreModelCooldowns(models) {
  await restoreCooldowns(models.map((model) => ({ key: modelCooldownKey(model.id), id: model.id })), ({ id }, until) => cooldownUntil(id, until));
}

function errorText(value, fallback = 'Provider request failed.') {
  let body = value;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch {}
  }
  const err = body?.error || body;
  const messages = [
    err?.metadata?.raw,
    err?.message,
    Array.isArray(body?.errors) ? body.errors.map((x) => x?.message).filter(Boolean).join('; ') : '',
    body?.message,
    typeof value === 'string' ? value : '',
  ];
  return String(messages.find((x) => typeof x === 'string' && x.trim()) || fallback)
    .replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').slice(0, 200);
}

function statusFrom(body, fallback = 0) {
  const err = body?.error || body;
  const value = Number(err?.code || err?.status || fallback);
  return Number.isFinite(value) ? value : fallback;
}

function failureCooldown(error) {
  const status = Number(error?.status) || 0;
  const defaultMs = status === 429 ? 120000 : status === 401 || status === 403 ? 30000 : 60000;
  const retryAfter = Number(error?.retryAfterMs) || 0;
  return Math.min(MAX_COOLDOWN_MS, Math.max(defaultMs, retryAfter));
}

function parseRetryAfter(value, now = Date.now()) {
  if (typeof value !== 'string') return 0;
  const header = value.trim();
  if (!header) return 0;
  if (/^\d+(?:\.\d+)?$/.test(header)) return Math.max(0, Number(header) * 1000);
  const date = Date.parse(header);
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

function asError(message, status = 0, retryAfterMs = 0) {
  const error = new Error(errorText(message, 'Provider request failed.'));
  error.status = status;
  if (retryAfterMs > 0) error.retryAfterMs = retryAfterMs;
  return error;
}

async function ask(target, messages, timeoutMs) {
  const response = await fetch(`${target.base}/chat/completions`, {
    method: 'POST', signal: AbortSignal.timeout(Math.max(1, Math.floor(timeoutMs))),
    headers: { Authorization: `Bearer ${target.key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: target.model, messages }),
    cache: 'no-store',
  });

  const retryHeader = response.headers.get('retry-after');
  const retryAfterMs = parseRetryAfter(retryHeader);
  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    throw asError(raw || response.statusText, response.status, retryAfterMs);
  }

  let payload;
  try { payload = await response.json(); }
  catch { throw asError('Provider returned invalid JSON.', response.status); }
  if (payload?.error || (Array.isArray(payload?.errors) && payload.errors.length)) {
    throw asError(payload, statusFrom(payload, response.status), retryAfterMs);
  }

  const content = payload?.choices?.[0]?.message?.content;
  const text = typeof content === 'string'
    ? content
    : Array.isArray(content) ? content.map((part) => part?.text || '').join('') : '';
  if (!text.trim()) throw asError('Provider returned an empty response.', response.status);

  let via = response.headers.get('x-routed-via') || '';
  try { via = decodeURIComponent(via); } catch {}
  return { text, model: via || target.label };
}

async function targetsFor(provider) {
  if (provider === 'spark') {
    return [{ base: sparkBase(), key: sparkKey(), model: 'auto:smart', label: 'spark/auto:smart' }];
  }
  if (provider === 'cloudflare') return [cloudflareChatTarget(false)];

  const models = await pickModels(false, 'text');
  await restoreModelCooldowns(models);
  // Never retry a model while it is cooling down. If all are cooling, move to the next provider.
  const healthy = models.filter((model) => !isCoolingDown(model.id));
  return healthy.slice(0, 3)
    .map((model) => ({ base: apiBase(), key: apiKey(), model: model.id, label: `openrouter/${model.id}` }));
}

// Returns { text, model, attempts, value? }. A validator lets training reject malformed outputs and fail over too.
export async function completeWith(messages, { validate } = {}) {
  const cfg = providerConfig();
  const active = cfg.active.filter((provider) => provider !== 'unorouter');
  if (!active.length) throw new Error(cfg.active.includes('unorouter') ? 'No eligible Learning Studio provider is configured; the optional text fallback is not used for training analysis.' : keyProblem() || 'No AI provider is configured.');

  const started = Date.now();
  await restoreProviderCooldowns(active);
  const failures = [];
  for (let index = 0; index < active.length; index++) {
    const provider = active[index];
    if (providerCool.get(provider) > Date.now()) {
      failures.push({ provider, target: provider, status: 0, error: 'Skipped while its recent failure cooldown is active.' });
      continue;
    }

    let targets;
    try { targets = await targetsFor(provider); }
    catch (error) {
      failures.push({ provider, target: `${provider}/model discovery`, status: Number(error.status) || 0, error: errorText(error.message) });
      const until = Date.now() + failureCooldown(error);
      providerCool.set(provider, Math.max(providerCool.get(provider) || 0, until));
      await persistCooldown(providerCooldownKey(provider), until);
      continue;
    }
    if (!targets.length) {
      failures.push({ provider, target: `${provider}/model discovery`, status: 0, error: 'No eligible model was available.' });
      continue;
    }

    // Leave a full call window for every later configured provider so a slow primary cannot starve failover.
    const laterProviders = active.slice(index + 1).filter((name) => (providerCool.get(name) || 0) <= Date.now()).length;
    const providerDeadline = started + BUDGET_MS - laterProviders * CALL_MS;
    for (const target of targets) {
      const remaining = providerDeadline - Date.now();
      if (remaining <= 0) break;
      try {
        const result = await ask(target, messages, Math.min(CALL_MS, remaining));
        const value = typeof validate === 'function' ? await validate(result.text) : undefined;
        return { ...result, attempts: failures, ...(typeof validate === 'function' ? { value } : {}) };
      } catch (error) {
        const status = Number(error?.status) || 0;
        const message = errorText(error?.message || error);
        failures.push({ provider, target: target.label, status, error: message });
        const hold = failureCooldown(error);
        const until = Date.now() + hold;
        if (provider === 'openrouter') {
          cooldown(target.model, hold);
          await persistCooldown(modelCooldownKey(target.model), until);
        } else {
          providerCool.set(provider, Math.max(providerCool.get(provider) || 0, until));
          await persistCooldown(providerCooldownKey(provider), until);
        }
        // Invalid credentials affect every model on that provider; preserve budget for the next provider.
        if (status === 401) break;
      }
    }
  }

  const detail = failures.map((failure) => `${failure.target} (${failure.status ? `HTTP ${failure.status}` : 'unavailable'}: ${failure.error})`).join(' → ');
  const error = new Error((detail ? `No configured learning provider completed the analysis. Tried: ${detail}` : 'No configured learning provider completed the analysis.').slice(0, 1000));
  error.attempts = failures;
  throw error;
}

export const complete = async (messages) => (await completeWith(messages)).text;
