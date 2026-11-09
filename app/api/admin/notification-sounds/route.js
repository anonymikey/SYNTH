import { isAdmin } from '../../../../lib/auth';
import { getMeta, setMeta, persistent } from '../../../../lib/db';
import { DEFAULT_NOTIFICATION_SOUND_DEFAULTS, NOTIFICATION_SOUND_IDS, normalizeNotificationSoundDefaults } from '../../../../lib/notifications';

export const runtime = 'nodejs';
export const maxDuration = 10;
const allowed = new Set(NOTIFICATION_SOUND_IDS);

export async function POST(request) {
  if (!isAdmin()) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (!persistent) return Response.json({ error: 'Persistent storage is unavailable.' }, { status: 503 });
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 1024) return Response.json({ error: 'Invalid settings' }, { status: 413 });

  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid settings' }, { status: 400 }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)
      || Object.keys(body).some((key) => !['assistant', 'build'].includes(key))
      || !allowed.has(body.assistant) || !allowed.has(body.build)) {
    return Response.json({ error: 'Choose a supported sound for each workspace.' }, { status: 400 });
  }

  const sounds = normalizeNotificationSoundDefaults({ assistant: body.assistant, build: body.build });
  try {
    await setMeta('notificationSounds', sounds);
    return Response.json({ ok: true, sounds }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    const fallback = normalizeNotificationSoundDefaults(await getMeta('notificationSounds').catch(() => DEFAULT_NOTIFICATION_SOUND_DEFAULTS));
    return Response.json({ error: 'Could not save notification defaults.', sounds: fallback }, { status: 503 });
  }
}
