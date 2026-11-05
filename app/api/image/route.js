import { Buffer } from 'node:buffer';
import { CF_MODELS, cloudflareRun, cloudflareReady } from '../../../lib/cloudflare.js';
import { providerConfig } from '../../../lib/env.js';
import { mediaRateLimit } from '../../../lib/media-limit.js';
import { pushCapped } from '../../../lib/db.js';
import { record, recordFail } from '../../../lib/core.js';
export const runtime = 'nodejs';
export const maxDuration = 60;

const tid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
function imageMime(base64, hinted = '') {
  if (/^image\/(png|jpeg|webp)$/i.test(hinted)) return hinted.toLowerCase();
  const b = Buffer.from(base64.slice(0, 40), 'base64');
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'image/jpeg';
  if (b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return 'image/png';
}
async function logRun(id, started, status, error = '') {
  const ms = Date.now() - started;
  const entry = { tid: id, ts: Date.now(), mode: 'chat', task: 'image-generation', step: 0, provider: 'cloudflare', node: `cloudflare/${CF_MODELS.image}`, failovers: 0, ms, status, img: false, fails: error ? [{ provider: 'cloudflare', target: `cloudflare/${CF_MODELS.image}`, status: 502, msg: String(error).slice(0, 140) }] : [] };
  try { await pushCapped('spark', entry, 500); } catch {}
  if (status === 'Failed') await recordFail('image-generation', `cloudflare/${CF_MODELS.image}`);
  else await record({ tid: id, task: 'image-generation', via: `cloudflare/${CF_MODELS.image}`, ms, fallback: false });
}

export async function POST(req) {
  const started = Date.now(), id = tid();
  const cfg = providerConfig();
  if (!cfg.wantedCloudflare || cfg.cloudflare !== 'enabled' || !cloudflareReady()) {
    return Response.json({ error: 'Image generation is unavailable. Enable Cloudflare Workers AI and configure its account ID and API token.' }, { status: 503 });
  }
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > 8000) return Response.json({ error: 'Image prompt is too large.' }, { status: 413 });
  const body = await req.json().catch(() => ({}));
  const prompt = String(body.prompt || '').trim();
  if (!prompt) return Response.json({ error: 'Describe the image you want to generate.' }, { status: 400 });
  if (prompt.length > 2048) return Response.json({ error: 'Image prompts must be 2,048 characters or fewer.' }, { status: 400 });

  try {
    const limit = await mediaRateLimit(req, 'image', 5);
    if (!limit.allowed) return Response.json({ error: 'Image generation limit reached for this network. Please try again in an hour.' }, { status: 429, headers: { 'Retry-After': '3600' } });
  } catch {
    return Response.json({ error: 'Image generation is temporarily unavailable because request limits could not be checked.' }, { status: 503 });
  }

  try {
    const result = await cloudflareRun(CF_MODELS.image, { prompt, steps: 4 }, 55000);
    const raw = typeof result === 'string' ? result : result?.image;
    if (!raw || typeof raw !== 'string') throw new Error('The image model returned no image.');
    const data = raw.startsWith('data:image/') ? raw : `data:${imageMime(raw, result?.contentType)};base64,${raw}`;
    await logRun(id, started, 'Success');
    return Response.json({ image: data, tid: id, model: `cloudflare/${CF_MODELS.image}` });
  } catch (e) {
    await logRun(id, started, 'Failed', e.message);
    console.warn('[synth] Cloudflare image generation failed:', String(e.message).slice(0, 180));
    return Response.json({ error: 'Cloudflare could not generate that image right now. Check the Cloudflare Workers AI free daily allowance and model availability, then try again.' }, { status: 502 });
  }
}
