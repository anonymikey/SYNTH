import { makeSource } from './sources.js';

const MAX_CHARS = 6000;
const MAX_ITEMS = 5;
const ALLOWED_ACTIONS = new Set(['github:search', 'github:read', 'youtube:search', 'youtube:read', 'youtube:subtitle']);
const ALLOWED_SOURCE_HOSTS = {
  github: new Set(['github.com', 'www.github.com']),
  youtube: new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']),
};

export class PublicSourceError extends Error {}

const clip = (value, limit) => {
  const text = String(value ?? '');
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
};
const plain = (value) => String(value || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&amp;/g, '&')
  .replace(/[\u0000-\u001f\u007f]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function canonicalYouTubeUrl(value) {
  const text = String(value || '').trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return `https://www.youtube.com/watch?v=${text}`;
  try {
    const url = new URL(text);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(host) || (url.port && url.port !== '443')) return null;
    let id = null;
    if (host === 'youtu.be' || host === 'www.youtu.be') {
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length === 1) [id] = segments;
    } else if (url.pathname.replace(/\/$/, '') === '/watch') {
      const ids = url.searchParams.getAll('v');
      if (ids.length === 1) [id] = ids;
    } else {
      const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})\/?$/);
      if (match) [, id] = match;
    }
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube.com/watch?v=${id}` : null;
  } catch { return null; }
}

function publicSourceEndpoint(value = process.env.AGENT_REACH_URL) {
  try {
    const base = new URL(String(value || '').trim());
    if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash) return null;
    return new URL('execute', base.href.endsWith('/') ? base.href : `${base.href}/`);
  } catch { return null; }
}

export const publicSourcesReady = (value) => !!publicSourceEndpoint(value);

export async function publicSourceTool(channel, action, params, {
  serviceUrl = process.env.AGENT_REACH_URL,
  fetchImpl = globalThis.fetch,
} = {}) {
  const endpoint = publicSourceEndpoint(serviceUrl);
  if (!endpoint) throw new PublicSourceError('Public sources are not available right now.');
  if (!ALLOWED_ACTIONS.has(`${channel}:${action}`)) throw new PublicSourceError('That public-source action is not available.');
  if (typeof fetchImpl !== 'function') throw new PublicSourceError('Public sources are temporarily unavailable.');

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ channel, action, params }),
      signal: AbortSignal.timeout(11000),
    });
  } catch (error) {
    throw new PublicSourceError(error?.name === 'TimeoutError' || error?.name === 'AbortError'
      ? 'The public source took too long to respond. Try again shortly.'
      : 'Public sources are temporarily unavailable.');
  }
  if (!response.ok) {
    throw new PublicSourceError(response.status === 400 || response.status === 422
      ? 'Check the search term or public link and try again.'
      : 'Public sources are temporarily unavailable.');
  }

  let result;
  try { result = await response.json(); }
  catch { throw new PublicSourceError('Public sources returned an unreadable response.'); }
  const errors = {
    BAD_INPUT: 'Check the search term or public link and try again.',
    NEED_LOGIN: 'Only publicly available source data can be accessed.',
    NEED_SETUP: 'Public sources are temporarily unavailable.',
    NOT_FOUND: 'No matching public result was found.',
    PLATFORM_BLOCKED: 'The public source temporarily refused the request. Try again later.',
    RATE_LIMITED: 'The public source is rate-limited. Try again later.',
    TIMEOUT: 'The public source took too long to respond. Try again shortly.',
    UPSTREAM_BROKEN: 'Public sources are temporarily unavailable.',
  };
  if (result?.ok !== true) {
    const message = typeof result?.code === 'string' && Object.hasOwn(errors, result.code) ? errors[result.code] : 'Public sources are temporarily unavailable.';
    throw new PublicSourceError(message);
  }

  const items = Array.isArray(result.items) ? result.items.slice(0, MAX_ITEMS) : [];
  const rows = [];
  const sources = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const rawUrl = channel === 'youtube' ? canonicalYouTubeUrl(item.url) : item.url;
    const source = makeSource(rawUrl, plain(item.title), plain(item.snippet ?? item.text));
    if (!source || !source.url.startsWith('https://')) continue;
    const sourceHost = new URL(source.url).hostname.toLowerCase();
    if (!ALLOWED_SOURCE_HOSTS[channel]?.has(sourceHost)) continue;
    const details = [plain(item.author), plain(item.publishedAt)].filter(Boolean).join(' · ');
    const content = String(item.text || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ').trim();
    const excerpt = clip(content, action === 'search' ? 1000 : MAX_CHARS - 600);
    rows.push(`${rows.length + 1}. ${source.title}\n${source.url}${details ? `\n${details}` : ''}${excerpt ? `\n${excerpt}` : ''}`);
    sources.push(source);
  }
  if (!rows.length) return { text: 'No public results were found.', summary: 'no results', sources: [] };
  return {
    text: clip(rows.join('\n\n'), MAX_CHARS),
    summary: `${rows.length} public result${rows.length === 1 ? '' : 's'}`,
    sources,
  };
}
