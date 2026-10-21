import crypto from 'crypto';
import { cookies } from 'next/headers';
import { adminToken } from '../../../../lib/auth';
const h = (s) => crypto.createHash('sha256').update(String(s)).digest();
export async function POST(req) {
  const { password } = await req.json().catch(() => ({}));
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return Response.json({ error: 'ADMIN_PASSWORD is not set on the server.' }, { status: 500 });
  if (!crypto.timingSafeEqual(h(password), h(pw))) { await new Promise((r) => setTimeout(r, 800)); return Response.json({ error: 'Wrong password.' }, { status: 401 }); }
  cookies().set('synthai_admin', adminToken(), { httpOnly: true, secure: true, sameSite: 'strict', path: '/', maxAge: 604800 });
  return Response.json({ ok: true });
}
