const PRODUCTION_ORIGIN = "https://synth.anonymiketech.space";

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "");
}

export function getSiteOrigin() {
  if (process.env.NODE_ENV === "production") return PRODUCTION_ORIGIN;
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return normalizeOrigin(configured);
  return null;
}

export function getAuthRedirectUrl(path = "/auth/callback") {
  const origin = getSiteOrigin();
  if (origin) return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
  return process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? path;
}

export function safeNextPath(value: string | null | undefined, fallback = "/app") {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
