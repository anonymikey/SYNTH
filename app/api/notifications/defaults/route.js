import { getMeta } from '../../../../lib/db';
import { DEFAULT_NOTIFICATION_SOUND_DEFAULTS, normalizeNotificationSoundDefaults } from '../../../../lib/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const saved = await getMeta('notificationSounds');
    return Response.json(normalizeNotificationSoundDefaults(saved), {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json(DEFAULT_NOTIFICATION_SOUND_DEFAULTS, {
      headers: { 'Cache-Control': 'no-store' },
    });
  }
}
