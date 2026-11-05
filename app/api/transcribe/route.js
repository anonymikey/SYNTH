import { Buffer } from 'node:buffer';
import { CF_MODELS, cloudflareRun, cloudflareReady } from '../../../lib/cloudflare.js';
import { providerConfig } from '../../../lib/env.js';
import { mediaRateLimit } from '../../../lib/media-limit.js';
import { pushCapped } from '../../../lib/db.js';
import { record, recordFail } from '../../../lib/core.js';
export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const tid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
async function logRun(id, started, status, error = '') {
  const ms = Date.now() - started;
  const entry = { tid: id, ts: Date.now(), mode: 'chat', task: 'speech-to-text', step: 0, provider: 'cloudflare', node: `cloudflare/${CF_MODELS.speech}`, failovers: 0, ms, img: false, status, fails: error ? [{ provider: 'cloudflare', target: `cloudflare/${CF_MODELS.speech}`, status: 502, msg: String(error).slice(0, 140) }] : [] };
  try { await pushCapped('spark', entry, 500); } catch {}
  if (status === 'Failed') await recordFail('speech-to-text', `cloudflare/${CF_MODELS.speech}`);
  else await record({ tid: id, task: 'speech-to-text', via: `cloudflare/${CF_MODELS.speech}`, ms, fallback: false });
}

export async function POST(req) {
  const started = Date.now(), id = tid();
  const cfg = providerConfig();
  if (!cfg.wantedCloudflare || cfg.cloudflare !== 'enabled' || !cloudflareReady()) {
    return Response.json({ error: 'Voice input is unavailable. Enable Cloudflare Workers AI and configure its account ID and API token.' }, { status: 503 });
  }
  const contentLength = Number(req.headers.get('content-length') || 0);
  if (contentLength > MAX_AUDIO_BYTES + 128 * 1024) return Response.json({ error: 'Audio must be no larger than 3 MB.' }, { status: 413 });

  let file;
  try { file = (await req.formData()).get('audio'); } catch { return Response.json({ error: 'Choose an audio recording to transcribe.' }, { status: 400 }); }
  if (!file || typeof file.arrayBuffer !== 'function' || !String(file.type || '').startsWith('audio/')) return Response.json({ error: 'Choose a supported audio file or make a short recording.' }, { status: 400 });
  if (file.size < 1 || file.size > MAX_AUDIO_BYTES) return Response.json({ error: 'Audio must be between 1 byte and 3 MB.' }, { status: 413 });

  try {
    const limit = await mediaRateLimit(req, 'speech', 10);
    if (!limit.allowed) return Response.json({ error: 'Transcription limit reached for this network. Please try again in an hour.' }, { status: 429, headers: { 'Retry-After': '3600' } });
  } catch {
    return Response.json({ error: 'Voice input is temporarily unavailable because request limits could not be checked.' }, { status: 503 });
  }

  try {
    const audio = Buffer.from(await file.arrayBuffer()).toString('base64');
    const result = await cloudflareRun(CF_MODELS.speech, { audio, task: 'transcribe' }, 55000);
    const text = String(result?.text || result?.transcription_info?.text || '').trim();
    if (!text) throw new Error('The speech model returned no transcript.');
    await logRun(id, started, 'Success');
    return Response.json({ text: text.slice(0, 20000), tid: id, model: `cloudflare/${CF_MODELS.speech}` });
  } catch (e) {
    await logRun(id, started, 'Failed', e.message);
    console.warn('[synth] Cloudflare speech transcription failed:', String(e.message).slice(0, 180));
    return Response.json({ error: 'Cloudflare could not transcribe that audio right now. Check the Cloudflare Workers AI free daily allowance, file format, and model availability, then try again.' }, { status: 502 });
  }
}
