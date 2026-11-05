'use client';
import { useState } from 'react';

function inline(t) {
  return t.split(/(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g).map((p, i) => {
    if (!p) return null;
    if (p.length > 2 && p.startsWith('`') && p.endsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
    if (p.length > 4 && p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    const m = p.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
    if (m) return <a key={i} href={m[2]} target="_blank" rel="noopener noreferrer">{m[1]}</a>;
    return p;
  });
}

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

export default function Markdown({ text }) {
  const out = [];
  let k = 0, last = 0, m;
  const block = (s) => s.split(/\n{2,}/).forEach((par) => {
    const lines = par.split('\n').filter((l) => l.trim());
    if (!lines.length) return;
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) out.push(<ul key={k++}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*[-*]\s+/, ''))}</li>)}</ul>);
    else if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) out.push(<ol key={k++}>{lines.map((l, i) => <li key={i}>{inline(l.replace(/^\s*\d+[.)]\s+/, ''))}</li>)}</ol>);
    else {
      const h = lines.length === 1 && lines[0].match(/^#{1,4}\s+(.*)/);
      if (h) out.push(<h4 key={k++}>{inline(h[1])}</h4>);
      else out.push(<p key={k++}>{lines.map((l, i) => <span key={i}>{i > 0 && <br />}{inline(l)}</span>)}</p>);
    }
  });
  const re = /```(\w*)\n([\s\S]*?)(```|$)/g;
  while ((m = re.exec(text))) {
    block(text.slice(last, m.index));
    out.push(<Code key={k++} lang={m[1]} code={m[2].replace(/\n$/, '')} />);
    last = m.index + m[0].length;
    if (m[3] === '') break;
  }
  block(text.slice(last));
  return <div className="md">{out}</div>;
}
