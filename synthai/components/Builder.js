'use client';
import { useEffect, useRef, useState } from 'react';
import { streamChat } from '../lib/stream';
import { track } from '../lib/track';
import { idsFor, withImages } from '../lib/images';
import { useAttach, Thumbs, AttachButton } from './Attach';
import Rate from './Rate';
import { Monitor, Tablet, Phone, Download } from '../lib/icons';

const SYSTEM = `You are a web app builder. Reply with one short sentence, then ONE complete, self-contained HTML file in a single \`\`\`html code block.
Rules: inline all CSS and JS; no external images or build steps; CDN scripts only from cdnjs.cloudflare.com or cdn.jsdelivr.net; responsive; accessible; make it work, not just look good.
When an image is provided (a screenshot, mockup or sketch), recreate its layout, colors, spacing and visible text faithfully, and make the controls actually work. Draw icons and pictures with inline SVG or CSS.
When a current file is provided, modify it and return the full updated file.`;
const IDEAS = ['Landing page for a coffee shop', 'Habit tracker with streaks', 'Pomodoro timer with sounds', 'Kanban board with drag and drop'];
const WIDTH = { desktop: '100%', tablet: '820px', phone: '390px' };
const grab = (t) => { const m = t.match(/```html\s*([\s\S]*?)(```|$)/i); return m ? m[1] : ''; };

export default function Builder({ models, seed }) {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState([]);
  const [html, setHtml] = useState('');
  const [live, setLive] = useState('');
  const [view, setView] = useState('preview');
  const [pane, setPane] = useState('prompt');
  const [dev, setDev] = useState('desktop');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [lastId, setLastId] = useState(null);
  const a = useAttach();
  const ctl = useRef(null);
  const seeded = useRef(false);
  useEffect(() => { if (seed && models.length && !seeded.current) { seeded.current = true; build(seed); } }, [seed, models.length]);

  async function build(override) {
    const text = (override ?? prompt).trim();
    const imgs = a.images;
    if ((!text && !imgs.length) || busy) return;
    const ids = idsFor(models, imgs.length > 0);
    if (!ids.length) { setErr('No image-capable free model is available right now. Remove the image or try later.'); return; }
    const logged = (text || 'image only') + (imgs.length ? ` [${imgs.length} image]` : '');
    setHistory((h) => [...h, { text: text || 'Build from the image', n: imgs.length }]);
    setPrompt(''); a.clear(); setErr(''); setLastId(null); setBusy(true); setView('code'); setPane('preview');
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
      if (e.name !== 'AbortError') { setErr(e.message.slice(0, 400)); setPane('prompt'); track({ mode: 'build', prompt: logged, reply: '[ERROR] ' + e.message, model: ids[0], error: true }); }
    }
    setBusy(false);
  }

  function download() {
    const l = document.createElement('a');
    l.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    l.download = 'index.html'; l.click();
  }

  return (
    <section className="build" data-pane={pane} {...a.dropProps}>
      <div className="seg" role="tablist">
        <button className={pane === 'prompt' ? 'on' : ''} onClick={() => setPane('prompt')}>Describe</button>
        <button className={pane === 'preview' ? 'on' : ''} onClick={() => setPane('preview')}>Preview</button>
      </div>
      <aside className="panel">
        <div className="hist">
          {history.length === 0 && (
            <div className="welcome sm">
              <h2>Build anything</h2>
              <p>Describe an app or page, or add a screenshot or sketch to recreate. Then keep asking for changes.</p>
              <div className="chips">{IDEAS.map((t) => <button key={t} className="chip" onClick={() => build(t)}>{t}</button>)}</div>
            </div>
          )}
          {history.map((h, i) => <div key={i} className="m user"><div className="bub">{h.text}{h.n > 0 && ` (+${h.n} image${h.n > 1 ? 's' : ''})`}</div></div>)}
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <Thumbs a={a} />
        <div className="compose col">
          <textarea value={prompt} rows={3} placeholder={html ? 'Ask for a change' : 'A habit tracker with streaks'} aria-label="Describe what to build"
            onChange={(e) => setPrompt(e.target.value)} onPaste={a.onPaste}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) build(); }} />
          <div className="row">
            <AttachButton a={a} />
            <button className="linkbtn" onClick={() => { setHtml(''); setLive(''); setHistory([]); setErr(''); setPane('prompt'); }}>New</button>
            <span className="grow" />
            {busy ? <button onClick={() => ctl.current?.abort()}>Stop</button> : <button className="primary" onClick={() => build()}>Build</button>}
          </div>
        </div>
        {lastId && <Rate id={lastId} />}
      </aside>
      <div className="stage panel">
        <div className="stagebar">
          <div className="tabs">
            <button className={view === 'preview' ? 'on' : ''} onClick={() => setView('preview')}>Preview</button>
            <button className={view === 'code' ? 'on' : ''} onClick={() => setView('code')}>Code</button>
          </div>
          <div className="devs">
            {[['desktop', Monitor], ['tablet', Tablet], ['phone', Phone]].map(([k, Ic]) => (
              <button key={k} className={'iconbtn sm' + (dev === k ? ' on' : '')} onClick={() => setDev(k)} aria-label={k + ' width'} title={k}><Ic /></button>
            ))}
          </div>
          <button className="iconbtn sm" disabled={!html} onClick={download} aria-label="Download HTML" title="Download HTML"><Download /></button>
        </div>
        {view === 'preview'
          ? (html
            ? <div className="canvas"><iframe title="Preview" style={{ width: WIDTH[dev] }} sandbox="allow-scripts allow-forms allow-modals" srcDoc={html} /></div>
            : <p className="empty">{busy ? 'Building…' : 'Your app appears here.'}</p>)
          : <pre className="code">{busy ? live : html}</pre>}
      </div>
    </section>
  );
}
