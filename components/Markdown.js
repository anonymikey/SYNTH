'use client';
import { useState } from 'react';
import { parseMarkdown } from '../lib/markdown';

function Code({ lang, code }) {
  const [ok, setOk] = useState(false);
  const copy = async () => { try { await navigator.clipboard.writeText(code); setOk(true); setTimeout(() => setOk(false), 1500); } catch {} };
  return (
    <div className="codeblk">
      <div className="codehead"><span>{lang || 'code'}</span><button type="button" onClick={copy}>{ok ? 'Copied' : 'Copy'}</button></div>
      <pre><code>{code}</code></pre>
    </div>
  );
}

function Inline({ items }) {
  return items.map((part, index) => {
    const children = part.children ? <Inline items={part.children} /> : part.value;
    if (part.type === 'code') return <code key={index}>{part.value}</code>;
    if (part.type === 'strong') return <strong key={index}>{children}</strong>;
    if (part.type === 'em') return <em key={index}>{children}</em>;
    if (part.type === 'del') return <del key={index}>{children}</del>;
    if (part.type === 'link') return <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">{children}</a>;
    return <span key={index}>{part.value}</span>;
  });
}

export default function Markdown({ text }) {
  return (
    <div className="md">
      {parseMarkdown(text).map((block, index) => {
        if (block.type === 'code') return <Code key={index} lang={block.language} code={block.value} />;
        if (block.type === 'heading') {
          const Tag = `h${block.level}`;
          return <Tag key={index}><Inline items={block.content} /></Tag>;
        }
        if (block.type === 'list') {
          const Tag = block.ordered ? 'ol' : 'ul';
          return <Tag key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}><Inline items={item} /></li>)}</Tag>;
        }
        if (block.type === 'quote') return <blockquote key={index}>{block.lines.map((line, lineIndex) => <p key={lineIndex}><Inline items={line} /></p>)}</blockquote>;
        if (block.type === 'hr') return <hr key={index} />;
        return <p key={index}>{block.lines.map((line, lineIndex) => <span key={lineIndex}>{lineIndex > 0 && <br />}<Inline items={line} /></span>)}</p>;
      })}
    </div>
  );
}
