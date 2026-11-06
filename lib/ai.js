// One-shot completion for SYNTHCORE learning. Keep provider order, but reserve time for later providers.
import { apiBase, apiKey, keyProblem, providerConfig, sparkBase, sparkKey } from './env.js';
import { cloudflareChatTarget } from './cloudflare.js';
import { cooldown, isCoolingDown, pickModels } from './models.js';

const CALL_MS = 14000;
const BUDGET_MS = 40000;
const providerCool = globalThis.__synthLearningProviderCool ||= new Map();

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
  return Math.min(300000, Math.max(defaultMs, retryAfter));
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
  const retryAfterMs = retryHeader && /^\d+(?:\.\d+)?$/.test(retryHeader) ? Number(retryHeader) * 1000 : 0;
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
  // A rate-limited OpenRouter model is not retried ahead of healthy candidates next run.
  const healthy = models.filter((model) => !isCoolingDown(model.id));
  return (healthy.length ? healthy : models).slice(0, 3)
    .map((model) => ({ base: apiBase(), key: apiKey(), model: model.id, label: `openrouter/${model.id}` }));
}

// Returns { text, model, attempts, value? }. A validator lets training reject malformed outputs and fail over too.
export async function completeWith(messages, { validate } = {}) {
  const cfg = providerConfig();
  if (!cfg.active.length) throw new Error(keyProblem() || 'No AI provider is configured.');

  const started = Date.now();
  const failures = [];
  for (let index = 0; index < cfg.active.length; index++) {
    const provider = cfg.active[index];
    if (provider !== 'openrouter' && providerCool.get(provider) > Date.now()) {
      failures.push({ provider, target: provider, status: 0, error: 'Skipped while its recent failure cooldown is active.' });
      continue;
    }

    let targets;
    try { targets = await targetsFor(provider); }
    catch (error) {
      failures.push({ provider, target: `${provider}/model discovery`, status: Number(error.status) || 0, error: errorText(error.message) });
      if (provider !== 'openrouter') providerCool.set(provider, Date.now() + failureCooldown(error));
      continue;
    }
    if (!targets.length) {
      failures.push({ provider, target: `${provider}/model discovery`, status: 0, error: 'No eligible model was available.' });
      continue;
    }

    // Leave a full call window for every later configured provider so a slow primary cannot starve failover.
    const laterProviders = cfg.active.slice(index + 1).filter((name) => name === 'openrouter' || (providerCool.get(name) || 0) <= Date.now()).length;
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
        if (provider === 'openrouter') cooldown(target.model, hold);
        else providerCool.set(provider, Date.now() + hold);
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
