import { Buffer } from 'node:buffer';
import { cloudflareAccountProblem, cloudflareBase, cloudflareRunBase, cloudflareToken } from './env.js';

// Defaults are models without Cloudflare's "Paid access required" notice as of Nov 2026.
// The 1M-context DeepSeek/GLM models are intentionally excluded: Cloudflare marks them paid-only.
export const CF_MODELS = Object.freeze({
  chat: '@cf/zai-org/glm-4.7-flash',
  vision: '@cf/meta/llama-4-scout-17b-16e-instruct',
  image: '@cf/black-forest-labs/flux-1-schnell',
  speech: '@cf/openai/whisper-large-v3-turbo',
});

export function cloudflareChatTarget(hasImg = false) {
  const model = hasImg ? CF_MODELS.vision : CF_MODELS.chat;
  return { base: cloudflareBase(), key: cloudflareToken(), model, label: `cloudflare/${model}` };
}

export function cloudflareReady() { return !cloudflareAccountProblem(); }

const brief = (value) => String(value || '').replace(/[\r\n]+/g, ' ').slice(0, 240);

export async function cloudflareRun(model, input, timeoutMs = 45000) {
  const problem = cloudflareAccountProblem();
  if (problem) throw new Error(`Cloudflare Workers AI is not configured: ${problem}`);
  // Model IDs are fixed constants above; reject path injection if this helper is ever reused.
  if (typeof model !== 'string' || !/^@cf\/[a-z0-9-]+\/[a-z0-9./-]+$/i.test(model)) throw new Error('Invalid Cloudflare model ID.');
  const response = await fetch(`${cloudflareRunBase()}/${model}`, {
    method: 'POST',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Authorization: `Bearer ${cloudflareToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    cache: 'no-store',
  });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    const raw = await response.text().catch(() => '');
    let message = raw;
    try { const j = JSON.parse(raw); message = j.errors?.map((e) => e.message).join('; ') || j.error?.message || j.message || raw; } catch {}
    throw new Error(`Cloudflare Workers AI returned ${response.status}: ${brief(message) || response.statusText}`);
  }
  if (contentType.startsWith('image/')) {
    return { image: Buffer.from(await response.arrayBuffer()).toString('base64'), contentType };
  }
  const payload = await response.json();
  if (payload?.success === false || payload?.errors?.length) {
    const message = (payload.errors || []).map((e) => e.message).filter(Boolean).join('; ') || 'Cloudflare Workers AI request failed.';
    throw new Error(brief(message));
  }
  return payload?.result ?? payload;
}
