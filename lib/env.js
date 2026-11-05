export const apiBase = () => (process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1').trim().replace(/\/+$/, '');
// Tolerates quotes, spaces and a pasted "Bearer " prefix in the Vercel value.
export const apiKey = () => (process.env.AI_API_KEY || '').trim().replace(/^["']+|["']+$/g, '').replace(/^Bearer\s+/i, '').trim();
export function keyProblem() {
  const k = apiKey();
  if (!k) return 'AI_API_KEY is not set on the server. Add it in Vercel for the Production environment, then redeploy.';
  if (k.length < 20) return 'AI_API_KEY looks too short to be a real key. Re-copy it from your provider and redeploy.';
  return '';
}

// ---- Providers: OpenRouter (default), optional SPARK gateway and optional Cloudflare Workers AI ----
const clean = (v) => String(v || '').trim();
const flag = (v) => /^(1|true|yes|on)$/i.test(clean(v));
const cleanSecret = (v) => clean(v).replace(/^["']+|["']+$/g, '').replace(/^Bearer\s+/i, '').trim();
// SPARK_BASE_URL may be given with or without the trailing /v1.
export const sparkBase = () => { const b = clean(process.env.SPARK_BASE_URL).replace(/\/+$/, ''); return !b ? '' : /\/v1$/.test(b) ? b : b + '/v1'; };
export const sparkKey = () => cleanSecret(process.env.SPARK_API_KEY);
export const cloudflareAccountId = () => cleanSecret(process.env.CLOUDFLARE_ACCOUNT_ID);
export const cloudflareToken = () => cleanSecret(process.env.CLOUDFLARE_API_TOKEN);
export const cloudflareBase = () => `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId()}/ai/v1`;
export const cloudflareRunBase = () => `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId()}/ai/run`;
export const cloudflareAccountProblem = () => {
  if (!cloudflareAccountId()) return 'CLOUDFLARE_ACCOUNT_ID is not set.';
  if (!/^[a-f0-9]{32}$/i.test(cloudflareAccountId())) return 'CLOUDFLARE_ACCOUNT_ID must be the 32-character account ID from Cloudflare.';
  if (!cloudflareToken()) return 'CLOUDFLARE_API_TOKEN is not set.';
  return '';
};

const KNOWN = ['openrouter', 'spark', 'cloudflare'];
const DEFAULT_ORDER = ['openrouter', 'spark', 'cloudflare'];

// Which providers are in play and in what order. Read on every call, so it never needs a restart to change.
// ENABLE_SPARK and ENABLE_CLOUDFLARE are false by default. A disabled or misconfigured provider is skipped.
// GATEWAY_MODE remains a backward-compatible shortcut for the SPARK gateway and keeps Cloudflare in the order.
export function providerConfig() {
  const notes = [];
  let wantedSpark = flag(process.env.ENABLE_SPARK);
  const wantedCloudflare = flag(process.env.ENABLE_CLOUDFLARE);
  let order = clean(process.env.PROVIDER_ORDER || DEFAULT_ORDER.join(',')).toLowerCase().split(/[\s,]+/).filter(Boolean);

  const mode = clean(process.env.GATEWAY_MODE).toLowerCase();
  if (mode === 'disabled') wantedSpark = false;
  else if (mode === 'fallback') { wantedSpark = true; order = DEFAULT_ORDER.slice(); }
  else if (mode === 'primary') { wantedSpark = true; order = ['spark', 'openrouter', 'cloudflare']; }
  else if (mode) notes.push(`GATEWAY_MODE "${mode}" is not valid (use disabled, fallback or primary) and was ignored.`);

  const unknown = order.filter((p) => !KNOWN.includes(p));
  if (unknown.length) notes.push(`PROVIDER_ORDER has unknown provider(s) "${unknown.join(', ')}", which were skipped.`);
  order = [...new Set(order.filter((p) => KNOWN.includes(p)))];
  if (!order.length) order = DEFAULT_ORDER.slice();

  const openrouter = keyProblem() ? 'missing' : 'ok';
  const spark = !wantedSpark ? 'disabled' : sparkBase() && sparkKey() ? 'enabled' : 'missing';
  const cloudflare = !wantedCloudflare ? 'disabled' : cloudflareAccountProblem() ? 'missing' : 'enabled';
  if (spark === 'missing') notes.push('SPARK is enabled but SPARK_BASE_URL or SPARK_API_KEY is missing, so it is skipped.');
  if (spark === 'enabled' && !order.includes('spark')) notes.push('SPARK is enabled but not listed in PROVIDER_ORDER, so it is not used.');
  if (cloudflare === 'missing') notes.push(`Cloudflare is enabled but not ready: ${cloudflareAccountProblem()} Add the missing value(s) in the server environment.`);
  if (cloudflare === 'enabled' && !order.includes('cloudflare')) notes.push('Cloudflare is enabled but not listed in PROVIDER_ORDER, so it is not used for chat routing.');
  if (cloudflare === 'enabled') notes.push('Cloudflare AI features share the account daily allocation. SYNTH pins models without a paid-only notice; 1M-context models are not selected.');

  const ready = { openrouter: openrouter === 'ok', spark: spark === 'enabled', cloudflare: cloudflare === 'enabled' };
  let active = order.filter((p) => ready[p]);
  if (!active.length) active = KNOWN.filter((p) => ready[p]); // use available providers if the configured order names none
  return { mode, wanted: wantedSpark, wantedCloudflare, order, active, openrouter, spark, cloudflare, notes };
}
