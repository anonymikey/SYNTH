import { createHash } from 'node:crypto';
import { hincrExpiring } from './db.js';

// Conservative per-IP hourly caps. Redis makes these shared across instances when configured;
// the in-memory fallback is best-effort for local development and deployments without Redis.
const HOUR_MS = 60 * 60 * 1000;
export async function mediaRateLimit(request, kind, maxPerHour) {
  const raw = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim() || 'unknown';
  const ipHash = createHash('sha256').update(raw).digest('hex').slice(0, 32);
  const bucket = Math.floor(Date.now() / HOUR_MS);
  const count = Number(await hincrExpiring(`media-limit:${kind}:${bucket}`, ipHash, 1, 2 * 60 * 60));
  return { allowed: count <= maxPerHour, count, limit: maxPerHour };
}
