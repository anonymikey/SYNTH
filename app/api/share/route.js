import { randomBytes } from 'node:crypto';
import { putTemp, persistent } from '../../../lib/db.js';
import { mediaRateLimit } from '../../../lib/media-limit.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const TTL_SECONDS = 24 * 60 * 60;
const MAX_RESPONSE_CHARS = 12000;

export async function POST(req) {
  try {
    const body = await req.json();
    if (body.consent !== true) return Response.json({ error: 'Explicit consent is required to create a share link.' }, { status: 400 });
    const response = typeof body.response === 'string' ? body.response.trim() : '';
    if (!response || response.length > MAX_RESPONSE_CHARS) return Response.json({ error: 'Response is empty or too long to share as a link. Copy the response text instead.' }, { status: 413 });
    if (!persistent && process.env.NODE_ENV === 'production') return Response.json({ error: 'Secure share links require persistent Upstash storage. Copy the response text instead.' }, { status: 503 });
    const limit = await mediaRateLimit(req, 'response-share', 10);
    if (!limit.allowed) return Response.json({ error: 'Too many share links were created from this network. Try again later.' }, { status: 429, headers: { 'Retry-After': '3600' } });
    const token = randomBytes(24).toString('base64url');
    const createdAt = Date.now();
    const expiresAt = createdAt + TTL_SECONDS * 1000;
    await putTemp('share:' + token, { response, createdAt, expiresAt }, TTL_SECONDS);
    return Response.json({ path: '/share/' + token, expiresAt }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return Response.json({ error: 'A secure response link could not be created. Copy the response text instead.' }, { status: 500 }); }
}
