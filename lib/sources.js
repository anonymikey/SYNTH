export const MAX_SOURCES = 12;

function cleanText(value, limit) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ').trim().slice(0, limit);
}

export function safeExternalUrl(urlValue) {
  let url;
  try { url = new URL(String(urlValue ?? '').trim()); } catch { return null; }
  const host = url.hostname.toLowerCase();
  if (!/^https?:$/.test(url.protocol) || url.username || url.password || url.href.length > 2048) return null;
  if (!host || host === 'localhost' || !host.includes('.') || host.includes(':') || host.startsWith('[') || /^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) || /\.(?:local|internal|localhost|lan|home)$/.test(host)) return null;
  return url.href;
}

export function makeSource(urlValue, title, snippet) {
  const href = safeExternalUrl(urlValue);
  if (!href) return null;
  const url = new URL(href);
  const host = url.hostname.toLowerCase();
  const displayHost = host.replace(/^www\./, '');
  return {
    url: url.href,
    title: cleanText(title, 180) || displayHost,
    host: displayHost,
    snippet: cleanText(snippet, 360),
  };
}

export function sanitizeSources(values, limit = MAX_SOURCES) {
  if (!Array.isArray(values)) return [];
  const cap = Math.max(0, Math.min(MAX_SOURCES, Number.isFinite(Number(limit)) ? Math.floor(Number(limit)) : MAX_SOURCES));
  const out = [], seen = new Set();
  for (const value of values) {
    if (out.length >= cap) break;
    const source = makeSource(value?.url, value?.title, value?.snippet ?? value?.excerpt);
    if (!source) continue;
    const keyUrl = new URL(source.url);
    keyUrl.hash = '';
    keyUrl.pathname = keyUrl.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '');
    const key = keyUrl.href;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }
  return out;
}
