// SYNTHCODE project files: reading the agent's reply, merging, previewing, searching and zipping. Pure functions, no React.

const PATH_RE = /^[\w@.\-]+(?:\/[\w@.\-]+)*\.[A-Za-z0-9]{1,8}$/;
const DEFAULTS = { html: 'index.html', css: 'styles.css', js: 'script.js', javascript: 'script.js', json: 'data.json', svg: 'image.svg', md: 'README.md', markdown: 'README.md' };

export function cleanPath(p) {
  const s = String(p || '').trim().replace(/^["'`*_]+|["'`*_:,;]+$/g, '').replace(/\\/g, '/').replace(/^\.\//, '');
  return PATH_RE.test(s) && !s.includes('..') && s.length <= 80 ? s : '';
}

// The agent writes each file as a fenced block with its path on the opening line, e.g. ```html file=index.html
// Also accepted: ```html:index.html, ```index.html, a "File: x" line above the fence, or a bare ```html (index.html).
// A ```delete block lists files to remove. An unfinished last block comes back with done:false (used for live streaming).
export function parseFiles(text) {
  const files = [], deletes = [];
  const re = /```([^\n`]*)\n([\s\S]*?)(```|$)/g;
  let m, prev = 0;
  while ((m = re.exec(text))) {
    const info = m[1].trim(), body = m[2], closed = m[3] === '```';
    const lang = (info.match(/^[\w+#-]+/) || [''])[0].toLowerCase();
    const before = text.slice(prev, m.index).trimEnd().split('\n').pop() || '';
    prev = m.index + m[0].length;
    if (lang === 'delete' || lang === 'remove') { body.split('\n').map(cleanPath).filter(Boolean).forEach((p) => deletes.push(p)); continue; }
    let path = '';
    const attr = info.match(/(?:file|path|title|name|filename)\s*[=:]\s*["']?([^\s"']+)/i);
    if (attr) path = cleanPath(attr[1]);
    if (!path) for (const tok of info.split(/[\s:,]+/)) { path = cleanPath(tok); if (path) break; }
    if (!path) { const h = before.match(/^[\s#>*_`\-]*(?:file|path)?[\s:]*[`*_"']*([\w@.\-\/]+\.[A-Za-z0-9]{1,8})[`*_"':\s]*$/i); if (h) path = cleanPath(h[1]); }
    if (!path) path = DEFAULTS[lang] || '';
    if (!path) continue;
    files.push({ path, content: body.replace(/\n$/, ''), done: closed });
  }
  return { files, deletes };
}

// Applies a parsed reply to the project. changed lists what the agent actually touched.
export function mergeFiles(prev, parsed) {
  const files = { ...prev }, changed = [];
  for (const f of parsed.files) {
    if (files[f.path] === f.content) continue;
    changed.push({ path: f.path, kind: f.path in prev ? 'edit' : 'new' });
    files[f.path] = f.content;
  }
  for (const p of parsed.deletes) if (p in files) { delete files[p]; changed.push({ path: p, kind: 'del' }); }
  return { files, changed };
}

export function entryOf(files) {
  if ('index.html' in files) return 'index.html';
  return Object.keys(files).filter((p) => /\.html?$/i.test(p)).sort((a, b) => a.length - b.length || (a < b ? -1 : 1))[0] || '';
}

const norm = (p) => { const out = []; for (const s of p.split('/')) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); } return out.join('/'); };

// One self-contained page for the sandboxed preview: linked stylesheets and scripts are inlined,
// small SVG files become data URIs, and the usual style/script files are added if the page forgot to link them.
export function bundle(files) {
  const entry = entryOf(files);
  if (!entry) return '';
  const dir = entry.includes('/') ? entry.slice(0, entry.lastIndexOf('/') + 1) : '';
  const used = new Set([entry]);
  const find = (ref) => {
    const r = String(ref).split('#')[0].split('?')[0].trim();
    if (!r || /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(r) || /^data:/i.test(r)) return '';
    const p = norm(r.startsWith('/') ? r.slice(1) : dir + r);
    return p in files ? p : '';
  };
  let html = files[entry];
  html = html.replace(/<link\b[^>]*>/gi, (tag) => {
    if (!/rel\s*=\s*["']?stylesheet/i.test(tag)) return tag;
    const p = find((tag.match(/href\s*=\s*["']([^"']+)["']/i) || [])[1]);
    if (!p) return tag;
    used.add(p);
    return `<style data-file="${p}">\n${files[p]}\n</style>`;
  });
  html = html.replace(/<script\b([^>]*?)\bsrc\s*=\s*["']([^"']+)["']([^>]*)>\s*<\/script>/gi, (tag, a, src, b) => {
    const p = find(src);
    if (!p) return tag;
    used.add(p);
    const attrs = (a + b).replace(/\s+/g, ' ').trimEnd();
    return `<script${attrs}>\n${files[p].replace(/<\/script/gi, '<\\/script')}\n</script>`;
  });
  html = html.replace(/\b(src|href)\s*=\s*["']([^"']+)["']/gi, (m, attr, ref) => {
    const p = find(ref);
    return p && !used.has(p) && /\.svg$/i.test(p) ? `${attr}="data:image/svg+xml;charset=utf-8,${encodeURIComponent(files[p])}"` : m;
  });
  const loose = (re) => Object.keys(files).filter((p) => !used.has(p) && p.startsWith(dir) && re.test(p.slice(dir.length)));
  // Only for pages that forgot to link their files: a page with styling or scripts of its own is left alone.
  const hasStyle = /<style\b|rel\s*=\s*["']?stylesheet/i.test(html);
  const hasScript = /<script\b(?![^>]*\bsrc\s*=)[^>]*>/i.test(html);
  const css = hasStyle ? '' : loose(/^(?:styles?|main|app)\.css$/i).map((p) => `<style data-file="${p}">\n${files[p]}\n</style>`).join('\n');
  const js = hasScript ? '' : loose(/^(?:script|main|app|index)\.js$/i).map((p) => `<script>\n${files[p].replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n');
  if (css) html = /<\/head>/i.test(html) ? html.replace(/<\/head>/i, () => css + '\n</head>') : css + '\n' + html;
  if (js) html = /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => js + '\n</body>') : html + '\n' + js;
  return html;
}

// What the agent is told about the project: every file (within a size limit) plus the one the user has open.
export function filesForPrompt(files, open, cap = 40000) {
  const paths = Object.keys(files).sort();
  let out = `Project files: ${paths.join(', ')}\n`;
  if (open && open in files) out += `The user currently has "${open}" open.\n`;
  let used = 0;
  for (const p of paths) {
    const c = files[p];
    if (used + c.length > cap) { out += `\n--- ${p} (not shown, ${c.length} characters) ---\n`; continue; }
    used += c.length;
    out += `\n--- ${p} ---\n${c}\n`;
  }
  return out;
}

const KINDS = { html: ['HTML', 'k-html'], htm: ['HTML', 'k-html'], css: ['CSS', 'k-css'], js: ['JS', 'k-js'], mjs: ['JS', 'k-js'], json: ['JSON', 'k-json'], md: ['MD', 'k-md'], svg: ['SVG', 'k-svg'], txt: ['TXT', 'k-file'] };
export function kindOf(path) {
  const k = KINDS[(path.split('.').pop() || '').toLowerCase()];
  return { label: k ? k[0] : 'FILE', cls: k ? k[1] : 'k-file' };
}

// Nested folder structure for display. Each file entry keeps its full path.
export function buildTree(paths, dirs = []) {
  const root = { dirs: {}, files: [] };
  const walk = (parts, isFile) => {
    let n = root;
    for (let i = 0; i < parts.length - (isFile ? 1 : 0); i++) n = (n.dirs[parts[i]] ||= { dirs: {}, files: [] });
    if (isFile) n.files.push(parts.join('/'));
  };
  paths.forEach((p) => walk(p.split('/'), true));
  dirs.forEach((d) => walk(d.split('/'), false));
  return root;
}

// File name or content search; line is the first matching line (empty for a name-only match).
export function searchFiles(files, q) {
  const s = q.toLowerCase();
  const out = [];
  for (const p of Object.keys(files).sort()) {
    const byName = p.toLowerCase().includes(s);
    const line = files[p].split('\n').find((l) => l.toLowerCase().includes(s));
    if (byName || line) out.push({ path: p, line: line ? line.trim().slice(0, 90) : '' });
  }
  return out;
}

// Light syntax colouring. Input is escaped first, so the output only ever contains our own spans.
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const TOKENS = /(&lt;!--[\s\S]*?--&gt;)|(\/\*[\s\S]*?\*\/)|(\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(&lt;\/?[a-zA-Z][\w-]*|\/?&gt;)|(\b(?:const|let|var|function|return|if|else|for|while|new|class|async|await|true|false|null|undefined|this)\b)|(\b\d+(?:\.\d+)?(?:px|rem|em|vh|vw|ms|s|%)?)/g;
export function highlight(src) {
  return esc(src).replace(TOKENS, (m, c1, c2, c3, str, tag, kw) => `<span class="hl-${c1 || c2 || c3 ? 'c' : str ? 's' : tag ? 't' : kw ? 'k' : 'n'}">${m}</span>`);
}

// Minimal .zip writer (stored, no compression) so the whole project can be downloaded without a library.
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const u16 = (n) => [n & 255, (n >>> 8) & 255];
const u32 = (n) => [n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255];
export function makeZip(files) {
  const enc = new TextEncoder();
  const chunks = [], central = [];
  let offset = 0;
  const entries = Object.entries(files);
  for (const [path, text] of entries) {
    const name = enc.encode(path), data = enc.encode(text), crc = crc32(data);
    const common = [...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0)];
    const local = new Uint8Array([...u32(0x04034b50), ...common, ...name]);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...common, ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset), ...name]));
    chunks.push(local, data);
    offset += local.length + data.length;
  }
  const cdSize = central.reduce((a, c) => a + c.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(entries.length), ...u16(entries.length), ...u32(cdSize), ...u32(offset), ...u16(0)]);
  const all = [...chunks, ...central, end];
  const out = new Uint8Array(all.reduce((a, c) => a + c.length, 0));
  let p = 0;
  for (const c of all) { out.set(c, p); p += c.length; }
  return out;
}
