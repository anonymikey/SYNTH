'use client';
import { useRef, useState } from 'react';
import { streamChat } from '../lib/stream';
import { track } from '../lib/track';
import { idsFor, withImages } from '../lib/images';
import { useAttach, Thumbs, AttachButton } from './Attach';
import Rate from './Rate';

const SYSTEM = `You are a web app builder. Reply with one short sentence, then ONE complete, self-contained HTML file in a single \`\`\`html code block.
Rules: inline all CSS and JS; no external images or build steps; CDN scripts only from cdnjs.cloudflare.com or cdn.jsdelivr.net; responsive; accessible; make it work, not just look good.
When an image is provided (a screenshot, mockup or sketch), recreate its layout, colors, spacing and visible text faithfully, and make the controls actually work. Draw icons and pictures with inline SVG or CSS.
When a current file is provided, modify it and return the full updated file.`;

const grab = (t) => { const m = t.match(/```html\s*([\s\S]*?)(```|$)/i); return m ? m[1] : ''; };

export default function Builder({ models }) {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState([]);
  const [html, setHtml] = useState('');
  const [live, setLive] = useState('');
  const [view, setView] = useState('preview');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [lastId, setLastId] = useState(null);
  const a = useAttach();
  const ctl = useRef(null);

  async function build() {
    const text = prompt.trim();
    const imgs = a.images;
    if ((!text && !imgs.length) || busy) return;
    const ids = idsFor(models, imgs.length > 0);
    if (!ids.length) { setErr('No image-capable free model is available right now. Remove the image or try later.'); return; }
    const logged = (text || 'image only') + (imgs.length ? ` [${imgs.length} image]` : '');
    setHistory((h) => [...h, { text: text || 'Build from the image', n: imgs.length }]); setPrompt(''); a.clear(); setErr(''); setLastId(null); setBusy(true); setView('code');
    ctl.current = new AbortController();
    const system = SYSTEM + (html ? `\n\nCurrent file:\n${html.slice(0, 40000)}` : '');
    try {
      const full = await streamChat({ messages: [{ role: 'user', content: withImages(text, imgs, 'Build this.') }], models: ids, system },
        (t) => setLive(grab(t)), ctl.current.signal);
      const out = grab(full);
      if (!out) throw new Error('The model did not return an HTML file. Try again or pick another model.');
      setHtml(out); setView('preview');
      setLastId(await track({ mode: 'build', prompt: logged, reply: out.slice(0, 400), model: ids[0] }));
    } catch (e) {
      if (e.name !== 'AbortError') { setErr(e.message.slice(0, 300)); track({ mode: 'build', prompt: logged, reply: '[ERROR] ' + e.message, model: ids[0], error: true }); }
    }
    setBusy(false);
  }

  function download() {
    const l = document.createElement('a');
    l.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    l.download = 'index.html'; l.click();
  }

  return (
    <section className="build" {...a.dropProps}>
      <aside>
        <div className="hist">
          {history.length === 0 && <p className="empty">Describe an app or page, or add a screenshot or sketch to recreate. Then keep asking for changes.</p>}
          {history.map((h, i) => <div key={i} className="msg user">{h.text}{h.n > 0 && ` (+${h.n} image${h.n > 1 ? 's' : ''})`}</div>)}
        </div>
        {err && <p className="err">{err}</p>}
        <Thumbs a={a} />
        <textarea value={prompt} rows={4} placeholder={html ? 'Ask for a change' : 'A habit tracker with streaks'}
          onChange={(e) => setPrompt(e.target.value)} onPaste={a.onPaste}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) build(); }} />
        <div className="row">
          {busy ? <button onClick={() => ctl.current?.abort()}>Stop</button> : <button className="primary" onClick={build}>Build</button>}
          <AttachButton a={a} />
          <button disabled={!html} onClick={download}>Download HTML</button>
          <button onClick={() => { setHtml(''); setLive(''); setHistory([]); setErr(''); }}>New</button>
        </div>
        {lastId && <Rate id={lastId} />}
      </aside>
      <div className="stage">
        <div className="tabs">
          <button className={view === 'preview' ? 'on' : ''} onClick={() => setView('preview')}>Preview</button>
          <button className={view === 'code' ? 'on' : ''} onClick={() => setView('code')}>Code</button>
        </div>
        {view === 'preview'
          ? (html ? <iframe title="Preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={html} /> : <p className="empty pad">Your app appears here.</p>)
          : <pre className="code">{busy ? live : html}</pre>}
      </div>
    </section>
  );
}
