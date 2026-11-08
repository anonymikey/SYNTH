import { safeExternalUrl } from './sources.js';

function safeHref(href) {
  return safeExternalUrl(href);
}

export function parseInline(value, depth = 0) {
  const text = String(value ?? '');
  const pattern = /(`[^`\n]+`|\[([^\]\n]+)\]\((https?:\/\/[^)\s]+)\)|\*\*([^*\n]+)\*\*|__([^_\n]+)__|~~([^~\n]+)~~|\*([^*\n]+)\*|_([^_\n]+)_)/g;
  const out = [];
  let last = 0, match;
  while ((match = pattern.exec(text))) {
    if (match.index > last) out.push({ type: 'text', value: text.slice(last, match.index) });
    const token = match[0];
    if (token.startsWith('`')) out.push({ type: 'code', value: token.slice(1, -1) });
    else if (match[2] && match[3]) {
      const href = safeHref(match[3]);
      if (href) out.push({ type: 'link', value: match[2], href, children: depth < 4 ? parseInline(match[2], depth + 1) : null });
      else out.push({ type: 'text', value: token });
    } else if (match[4] || match[5]) {
      const inner = match[4] || match[5];
      out.push({ type: 'strong', value: inner, children: depth < 4 ? parseInline(inner, depth + 1) : null });
    } else if (match[6]) {
      out.push({ type: 'del', value: match[6], children: depth < 4 ? parseInline(match[6], depth + 1) : null });
    } else {
      const inner = match[7] || match[8];
      out.push({ type: 'em', value: inner, children: depth < 4 ? parseInline(inner, depth + 1) : null });
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) out.push({ type: 'text', value: text.slice(last) });
  return out;
}

function listItem(line) {
  const bullet = line.match(/^ {0,3}[-+*]\s+(.*)$/);
  if (bullet) return { ordered: false, value: bullet[1] };
  const ordered = line.match(/^ {0,3}\d+[.)]\s+(.*)$/);
  return ordered ? { ordered: true, value: ordered[1] } : null;
}

function fenceStart(line) {
  return line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
}

export function parseMarkdown(value) {
  const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
  const blocks = [];
  let paragraph = [];
  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: 'paragraph', lines: paragraph.map(parseInline) });
    paragraph = [];
  };

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { flushParagraph(); index++; continue; }

    const fence = fenceStart(line);
    if (fence) {
      flushParagraph();
      const marker = fence[1];
      const language = fence[2].trim().split(/\s+/)[0] || '';
      const content = [];
      index++;
      let closed = false;
      while (index < lines.length) {
        const closing = lines[index].match(/^ {0,3}(`{3,}|~{3,})\s*$/);
        if (closing && closing[1][0] === marker[0] && closing[1].length >= marker.length) { index++; closed = true; break; }
        content.push(lines[index++]);
      }
      if (!closed && content.at(-1) === '') content.pop();
      blocks.push({ type: 'code', language, value: content.join('\n') });
      continue;
    }

    const heading = line.match(/^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/);
    if (heading) {
      flushParagraph();
      const content = heading[2].replace(/[ \t]+#+[ \t]*$/, '').trimEnd();
      blocks.push({ type: 'heading', level: heading[1].length, content: parseInline(content) });
      index++;
      continue;
    }

    if (/^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line)) {
      flushParagraph(); blocks.push({ type: 'hr' }); index++; continue;
    }

    if (/^ {0,3}>/.test(line)) {
      flushParagraph();
      const quote = [];
      while (index < lines.length && /^ {0,3}>/.test(lines[index])) quote.push(lines[index++].replace(/^ {0,3}> ?/, ''));
      blocks.push({ type: 'quote', lines: quote.map(parseInline) });
      continue;
    }

    const item = listItem(line);
    if (item) {
      flushParagraph();
      const items = [];
      const ordered = item.ordered;
      while (index < lines.length) {
        const next = listItem(lines[index]);
        if (!next || next.ordered !== ordered) break;
        items.push(parseInline(next.value));
        index++;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    paragraph.push(line);
    index++;
  }
  flushParagraph();
  return blocks;
}
