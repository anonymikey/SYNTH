const PROVIDERS = Object.freeze({
  openrouter: 'SYNTH Core',
  spark: 'SYNTH Relay',
  cloudflare: 'SYNTH Image Master',
});

export function providerLabel(value) {
  const key = String(value || '').toLowerCase().split(/[/:]/, 1)[0];
  return PROVIDERS[key] || 'SYNTH service';
}

// Stable UI alias only; it is not a security boundary and does not alter backend attribution.
export function modelLabel(value) {
  const text = String(value || '').trim();
  if (!text) return 'SYNTH model';
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `SYNTH Model ${((hash >>> 0).toString(36)).toUpperCase()}`;
}

export function serviceNodeLabel(value) {
  const text = String(value || '').trim();
  if (!text) return 'SYNTH engine';
  const provider = text.split('/', 1)[0];
  return `${providerLabel(provider)} · ${modelLabel(text)}`;
}

// Keep raw diagnostics in the existing backend records, but do not render vendor IDs,
// model paths, credential-shaped values, or environment-variable names in the UI.
export function safeFrontendText(value) {
  return String(value ?? '')
    .replace(/\bBearer\s+[^\s,;]+/gi, '[credential hidden]')
    .replace(/\b(?:sk-or-v1|sk|ghp|github_pat|cf)_[A-Za-z0-9_-]{12,}\b/gi, '[credential hidden]')
    .replace(/([?&](?:api[_-]?key|token|authorization)=)[^&\s]+/gi, '$1[hidden]')
    .replace(/https?:\/\/\S+/gi, '[service link]')
    .replace(/@cf\/[A-Za-z0-9._/-]+/gi, 'SYNTH model')
    .replace(/\b(?:[a-z0-9][a-z0-9_.-]*\/){1,2}[a-z0-9][a-z0-9_.:-]+(?::free)?\b/gi, 'SYNTH model')
    .replace(/\b(?:ADMIN_PASSWORD|CRON_SECRET|AI_API_KEY|AI_BASE_URL|CLOUDFLARE_[A-Z0-9_]+|OPENROUTER_[A-Z0-9_]+|SPARK_[A-Z0-9_]+|ENABLE_CLOUDFLARE|ENABLE_SPARK|PROVIDER_ORDER|UPSTASH_[A-Z0-9_]+)\b/gi, 'workspace settings')
    .replace(/\bCloudflare(?:\s+Workers)?(?:\s+AI)?\b/gi, 'SYNTH Image Master')
    .replace(/\bOpenRouter\b/gi, 'SYNTH Core')
    .replace(/\bFreeLLMAPI\b/gi, 'SYNTH Relay')
    .replace(/\bSYNTHSPARK(?:\s+gateway)?\b/gi, 'SYNTH Relay')
    .replace(/\bSPARK\b/gi, 'SYNTH Relay')
    .replace(/\badmin(?:istrator)?s?\b/gi, 'Learning Studio')
    .replace(/\bprovider(?:s)?\b/gi, 'service');
}
