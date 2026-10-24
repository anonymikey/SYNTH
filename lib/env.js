export const apiBase = () => (process.env.AI_BASE_URL || 'https://openrouter.ai/api/v1').trim().replace(/\/+$/, '');
// Tolerates quotes, spaces and a pasted "Bearer " prefix in the Vercel value.
export const apiKey = () => (process.env.AI_API_KEY || '').trim().replace(/^["']+|["']+$/g, '').replace(/^Bearer\s+/i, '').trim();
export function keyProblem() {
  const k = apiKey();
  if (!k) return 'AI_API_KEY is not set on the server. Add it in Vercel for the Production environment, then redeploy.';
  if (k.length < 20) return 'AI_API_KEY looks too short to be a real key. Re-copy it from your provider and redeploy.';
  return '';
}

// ---- Providers: OpenRouter (default) and the optional SPARK gateway (FreeLLMAPI) ----
const clean = (v) => String(v || '').trim();
const flag = (v) => /^(1|true|yes|on)$/i.test(clean(v));
// SPARK_BASE_URL may be given with or without the trailing /v1.
export const sparkBase = () => { const b = clean(process.env.SPARK_BASE_URL).replace(/\/+$/, ''); return !b ? '' : /\/v1$/.test(b) ? b : b + '/v1'; };
export const sparkKey = () => clean(process.env.SPARK_API_KEY).replace(/^["']+|["']+$/g, '').replace(/^Bearer\s+/i, '').trim();

const KNOWN = ['openrouter', 'spark'];

// Which providers are in play and in what order. Read on every call, so it never needs a restart to change.
//   ENABLE_SPARK=false (default)  -> SPARK is ignored completely
//   PROVIDER_ORDER=openrouter,spark | spark,openrouter
//   GATEWAY_MODE=disabled|fallback|primary (optional alias; when valid it overrides the two above)
// A provider that is disabled, misconfigured or unlisted is never used, and OpenRouter keeps working on its own.
export function providerConfig() {
  const notes = [];
  let wanted = flag(process.env.ENABLE_SPARK);
  let order = clean(process.env.PROVIDER_ORDER || 'openrouter,spark').toLowerCase().split(/[\s,]+/).filter(Boolean);

  const mode = clean(process.env.GATEWAY_MODE).toLowerCase();
  if (mode === 'disabled') wanted = false;
  else if (mode === 'fallback') { wanted = true; order = ['openrouter', 'spark']; }
  else if (mode === 'primary') { wanted = true; order = ['spark', 'openrouter']; }
  else if (mode) notes.push(`GATEWAY_MODE "${mode}" is not valid (use disabled, fallback or primary) and was ignored.`);

  const unknown = order.filter((p) => !KNOWN.includes(p));
  if (unknown.length) notes.push(`PROVIDER_ORDER has unknown provider(s) "${unknown.join(', ')}", which were skipped.`);
  order = [...new Set(order.filter((p) => KNOWN.includes(p)))];
  if (!order.length) order = ['openrouter', 'spark'];

  const openrouter = keyProblem() ? 'missing' : 'ok';
  const spark = !wanted ? 'disabled' : sparkBase() && sparkKey() ? 'enabled' : 'missing';
  if (spark === 'missing') notes.push('SPARK is enabled but SPARK_BASE_URL or SPARK_API_KEY is missing, so only OpenRouter is used.');
  if (spark === 'enabled' && !order.includes('spark')) notes.push('SPARK is enabled but not listed in PROVIDER_ORDER, so it is not used.');

  const ready = { openrouter: openrouter === 'ok', spark: spark === 'enabled' };
  let active = order.filter((p) => ready[p]);
  if (!active.length) active = KNOWN.filter((p) => ready[p]); // the order names nothing usable: use whatever is ready, OpenRouter first
  return { mode, wanted, order, active, openrouter, spark, notes };
}
