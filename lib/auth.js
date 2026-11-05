import crypto from 'crypto';
import { cookies } from 'next/headers';
export const adminToken = () => crypto.createHmac('sha256', process.env.ADMIN_PASSWORD || '').update('synthai-admin').digest('hex');
export function isAdmin() {
  if (!process.env.ADMIN_PASSWORD) return false;
  const a = Buffer.from(cookies().get('synthai_admin')?.value || ''), b = Buffer.from(adminToken());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
