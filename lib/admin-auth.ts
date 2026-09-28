import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "synth_admin_session";
const SESSION_TTL = 60 * 60 * 8;

function secret() {
  const value = process.env.SYNTH_ADMIN_SECRET;
  if (!value) throw new Error("SYNTH_ADMIN_SECRET is not configured.");
  return value;
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function verifyAdminSecret(candidate: string) {
  const expected = Buffer.from(secret());
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export async function establishAdminSession() {
  const payload = `${Date.now() + SESSION_TTL * 1000}`;
  const store = await cookies();
  store.set(COOKIE_NAME, `${payload}.${signature(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL,
  });
}

export async function clearAdminSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function hasAdminSession() {
  const value = (await cookies()).get(COOKIE_NAME)?.value;
  if (!value) return false;
  const [expires, provided] = value.split(".");
  if (!expires || !provided || Number(expires) < Date.now()) return false;
  const expected = signature(expires);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export { COOKIE_NAME };
