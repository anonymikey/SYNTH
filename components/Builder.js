'use client';
import { useEffect, useRef, useState } from 'react';
import { streamChat } from '../lib/stream';
import { track } from '../lib/track';
import { withImages } from '../lib/images';
import { useAttach, Thumbs, AttachButton } from './Attach';
import Rate from './Rate';
import Workflow from './Workflow';
import { Monitor, Tablet, Phone, Download, Arrow, Plus, Stop, Globe, Build, Refresh, Open, Copy, Send, Close, Edit } from '../lib/icons';

const SYSTEM = `You are a web app builder. Reply with one short sentence, then ONE complete, self-contained HTML file in a single \`\`\`html code block.
Rules: inline all CSS and JS; no external images or build steps; CDN scripts only from cdnjs.cloudflare.com or cdn.jsdelivr.net; responsive; accessible; make it work, not just look good.
When an image is provided (a screenshot, mockup or sketch), recreate its layout, colors, spacing and visible text faithfully, and make the controls actually work. Draw icons and pictures with inline SVG or CSS.
When a current file is provided, modify it and return the full updated file.`;
const IDEAS = ['Landing page for a coffee shop', 'Habit tracker with streaks', 'Pomodoro timer with sounds', 'Kanban board with drag and drop'];
const WIDTH = { desktop: '100%', tablet: '820px', phone: '390px' };
// Script-free copy of a partially written page, safe to show in a fully sandboxed frame while building.
const draft = (t) => (t.length > 120 && /<body|<div|<main|<section|<header|<h1/i.test(t) ? t.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<script[\s\S]*$/i, '') : '');
const grab = (t) => { const m = t.match(/```html\s*([\s\S]*?)(```|$)/i); return m ? m[1] : ''; };

export default function Builder({ seed }) {
  const [prompt, setPrompt] = useState('');
  const [history, setHistory] = useState([]);   // { text, n, status: building | done | stopped | failed }
  const [html, setHtml] = useState('');
  const [live, setLive] = useState('');
  const [view, setView] = useState('preview');
  const [pane, setPane] = useState('prompt');
  const [dev, setDev] = useState('desktop');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [lastId, setLastId] = useState(null);
  const [leaving, setLeaving] = useState(false);   // welcome screen fading out
  const [entering, setEntering] = useState(false); // build workspace fading in
  const [frame, setFrame] = useState(0);
  const [full, setFull] = useState(false);
  const [note, setNote] = useState('');
  const [snap, setSnap] = useState('');           // draft of the page while it is being written
  const a = useAttach();
  const ctl = useRef(null);
  const wbox = useRef(null);
  const histEnd = useRef(null);
  const seeded = useRef(false);
  const skip = useRef(false);
  const liveRef = useRef('');
  const noteT = useRef(null);
  const timers = useRef([]);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  useEffect(() => () => { timers.current.forEach(clearTimeout); clearTimeout(noteT.current); }, []);
  useEffect(() => { const t = wbox.current; if (t) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 180) + 'px'; } }, [prompt]);
  useEffect(() => { histEnd.current?.scrollIntoView({ block: 'end' }); }, [history]);
  // While building, refresh a script-free draft about once a second so the Preview tab shows progress.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setSnap(draft(liveRef.current)), 900);
    return () => clearInterval(id);
  }, [busy]);
  useEffect(() => { if (seed && !seeded.current) { seeded.current = true; build(seed, true); } }, [seed]);
  useEffect(() => {
    if (!full) return;
    const onKey = (e) => { if (e.key === 'Escape') setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [full]);

  const flash = (m) => { setNote(m); clearTimeout(noteT.current); noteT.current = setTimeout(() => setNote(''), 2200); };

  async function build(override, instant) {
    const text = (override ?? prompt).trim();
    const imgs = a.images;
    if ((!text && !imgs.length) || busy) return;
    const first = history.length === 0 && !html;
    const logged = (text || 'image only') + (imgs.length ? ` [${imgs.length} image]` : '');
    skip.current = false;
    setHistory((h) => [...h, { text: text || 'Build from the image', n: imgs.length, status: 'building' }]);
    setPrompt(''); a.clear(); setErr(''); setLastId(null); setBusy(true); setView('preview'); setPane('preview'); setSnap(''); liveRef.current = '';
    if (first) {
      // Welcome screen fades out, then the build workspace fades in.
      if (instant) { setEntering(true); later(() => setEntering(false), 800); }
      else { setLeaving(true); later(() => { setLeaving(false); setEntering(true); later(() => setEntering(false), 800); }, 380); }
    }
    ctl.current = new AbortController();
    const system = SYSTEM + (html ? `\n\nCurrent file:\n${html.slice(0, 40000)}` : '');
    const user = [{ role: 'user', content: withImages(text, imgs, 'Build this.') }];
    const meta = {};
    const mark = (status) => setHistory((h) => h.map((x, i) => (i === h.length - 1 ? { ...x, status } : x)));
    try {
      let full = await streamChat({ messages: user, system, mode: 'build' }, (t) => { const g = grab(t); liveRef.current = g; setLive(g); }, ctl.current.signal, meta);
      let out = grab(full);
      let tid = meta.tid;
      if (!out) {
        // Formatting slip: count it against that model, then retry once on the next one.
        track({ mode: 'build', prompt: logged, reply: '[FORMAT] no html block', model: 'auto', tid: meta.tid, error: true });
        const meta2 = {};
        full = await streamChat({ messages: user, system: system + '\n\nIMPORTANT: reply with one short sentence and then exactly one complete HTML file inside a single ```html fenced block.', mode: 'build', retry: true }, (t) => { const g = grab(t); liveRef.current = g; setLive(g); }, ctl.current.signal, meta2);
        out = grab(full);
        tid = meta2.tid;
      }
      if (!out) throw new Error('SYNTHCODE could not produce a page this time. Please try again.');
      setHtml(out); setSnap(''); setView('preview'); mark('done');
      setLastId(await track({ mode: 'build', prompt: logged, reply: out.slice(0, 400), model: 'auto', tid }));
    } catch (e) {
      if (skip.current) { setBusy(false); return; } // "New" was pressed while building
      const aborted = e.name === 'AbortError';
      if (!aborted) { setErr(e.message.slice(0, 400)); setPane('prompt'); track({ mode: 'build', prompt: logged, reply: '[ERROR] ' + e.message, model: 'auto', error: true }); }
      if (!html) { setHistory([]); setLive(''); setSnap(''); setPrompt(text); setView('preview'); } // nothing built yet: back to the welcome screen
      else mark(aborted ? 'stopped' : 'failed');
    }
    setBusy(false);
  }

  function reset() {
    if (busy) { skip.current = true; ctl.current?.abort(); }
    setHtml(''); setLive(''); setSnap(''); setHistory([]); setErr(''); setLastId(null); setPane('prompt'); setPrompt(''); setBusy(false); setFull(false); setView('preview');
    a.clear();
  }

  function download() {
    const l = document.createElement('a');
    l.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    l.download = 'index.html'; l.click();
  }
  const copy = async () => { try { await navigator.clipboard.writeText(html); flash('Code copied'); } catch { flash('Could not copy'); } };
  async function send() {
    const file = new File([html], 'index.html', { type: 'text/html' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: 'Built with SYNTHCODE' });
      else { await navigator.clipboard.writeText(html); flash('Copied. File sharing is not supported here'); }
    } catch (e) { if (e.name !== 'AbortError') flash('Could not share'); }
  }

  const welcome = (history.length === 0 && !html) || leaving; // default state until a build has started

  const pick = (t) => {
    setPrompt(t);
    setTimeout(() => { const b = wbox.current; if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }, 0);
  };

  const last = history[history.length - 1];

  if (welcome) {
    return (
      <section className={'bw' + (leaving ? ' leaving' : '')} {...a.dropProps}>
        <div className="bw-scroll">
          <div className="bw-hero">
            <img className="bw-mark" src="/logo-mark.png" alt="" />
            <h2>Build anything with SYNTHCODE</h2>
            <p>Describe an app or page, or add a screenshot or sketch to recreate. Then keep asking for changes.</p>
            <div className="bw-pills">
              {IDEAS.map((t, i) => <button key={t} className="bw-pill" style={{ '--i': i }} onClick={() => pick(t)}>{t}</button>)}
            </div>
          </div>
          <Workflow />
        </div>
        <div className="bw-dock">
          {err && <p className="err" role="alert">{err}</p>}
          <Thumbs a={a} />
          <div className="compose">
            <AttachButton a={a} />
            <textarea ref={wbox} value={prompt} rows={1} placeholder="Describe the app or page you want, or paste a screenshot" aria-label="Describe what to build"
              onChange={(e) => setPrompt(e.target.value)} onPaste={a.onPaste}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); build(); } }} />
            <button className="primary buildbtn" onClick={() => build()} disabled={!prompt.trim() && !a.images.length}>Build <Arrow /></button>
          </div>
          <p className="tools"><span>Enter to build, Shift+Enter for a new line. You can also paste or drop an image.</span></p>
        </div>
      </section>
    );
  }

  return (
    <section className={'build' + (entering ? ' enter' : '')} data-pane={pane} {...a.dropProps}>
      <div className="seg" role="tablist">
        <button className={pane === 'prompt' ? 'on' : ''} onClick={() => setPane('prompt')}>Describe</button>
        <button className={pane === 'preview' ? 'on' : ''} onClick={() => setPane('preview')}>Preview</button>
      </div>

      <aside className="panel">
        <div className="phead">
          <div><small>Project</small><b title={history[0]?.text}>{history[0]?.text || 'Untitled'}</b></div>
          <span className={'status' + (busy ? ' busy' : html ? ' done' : '')}><i />{busy ? 'Building…' : html ? 'Ready' : 'Idle'}</span>
        </div>
        <div className="hist">
          {history.length > 1 && (
            <details className="earlier">
              <summary>Earlier requests ({history.length - 1})</summary>
              {history.slice(0, -1).map((h, i) => (
                <button key={i} className="eprev" onClick={() => pick(h.text)} title="Use this request as a starting point"><i className={'sdot ' + h.status} />{h.text}</button>
              ))}
            </details>
          )}
          {last && (
            <div className="lastreq">
              <small>Last request</small>
              <p>{last.text}{last.n > 0 && ` (+${last.n} image${last.n > 1 ? 's' : ''})`}</p>
              <div className="lr-foot">
                <span className={'lr-st ' + last.status}>
                  {last.status === 'building' ? <><span className="typing" role="status" aria-label="Building"><i /><i /><i /></span>Building</>
                    : last.status === 'failed' ? 'Could not finish'
                    : last.status === 'stopped' ? 'Stopped'
                    : 'Done, preview updated'}
                </span>
                <span className="grow" />
                <button className="linkbtn" onClick={() => pick(last.text)} disabled={busy}><Edit width="14" height="14" /> Edit</button>
                {(last.status === 'failed' || last.status === 'stopped') && <button className="linkbtn" onClick={() => build(last.text)} disabled={busy}><Refresh width="14" height="14" /> Retry</button>}
              </div>
            </div>
          )}
          <div ref={histEnd} />
        </div>
        {err && <p className="err" role="alert">{err}</p>}
        <Thumbs a={a} />
        <div className="compose col">
          <textarea ref={wbox} value={prompt} rows={3} placeholder={html ? 'Ask for a change' : 'Describe what to build'} aria-label="Describe what to build or change"
            onChange={(e) => setPrompt(e.target.value)} onPaste={a.onPaste}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); build(); } }} />
          <div className="row">
            <AttachButton a={a} />
            <button onClick={reset}><Plus width="16" height="16" /> New</button>
            <span className="grow" />
            {busy
              ? <button className="stopbtn" onClick={() => ctl.current?.abort()}><Stop width="16" height="16" /> Stop</button>
              : <button className="primary" onClick={() => build()}>Build</button>}
          </div>
        </div>
        {lastId && <Rate id={lastId} />}
      </aside>

      <div className="stage panel">
        <div className="stagebar">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={view === 'preview'} className={view === 'preview' ? 'on' : ''} onClick={() => setView('preview')}><Globe width="16" height="16" />Preview</button>
            <button role="tab" aria-selected={view === 'code'} className={view === 'code' ? 'on' : ''} onClick={() => setView('code')}><Build width="16" height="16" />Code</button>
          </div>
          <div className="actions" role="toolbar" aria-label="Page actions">
            <div className="devs">
              {[['desktop', Monitor], ['tablet', Tablet], ['phone', Phone]].map(([k, Ic]) => (
                <button key={k} className={'iconbtn sm' + (dev === k ? ' on' : '')} onClick={() => setDev(k)} aria-label={k + ' width'} title={k}><Ic /></button>
              ))}
            </div>
            <span className="sep" />
            <button className="iconbtn sm act-opt" disabled={!html} onClick={() => setFrame((n) => n + 1)} aria-label="Refresh preview" title="Refresh preview"><Refresh /></button>
            <button className="iconbtn sm" disabled={!html} onClick={() => setFull(true)} aria-label="Open full screen" title="Open full screen"><Open /></button>
            <button className="iconbtn sm act-opt" disabled={!html} onClick={copy} aria-label="Copy code" title="Copy code"><Copy /></button>
            <button className="iconbtn sm" disabled={!html} onClick={download} aria-label="Download HTML" title="Download HTML"><Download /></button>
            <button className="iconbtn sm" disabled={!html} onClick={send} aria-label="Share" title="Share"><Send /></button>
          </div>
        </div>
        {view === 'preview'
          ? (html
            ? <div className="canvas"><iframe key={frame} title="Preview" style={{ width: WIDTH[dev] }} sandbox="allow-scripts allow-forms allow-modals" srcDoc={html} />{busy && <span className="drafttag"><i />Updating…</span>}</div>
            : busy
              ? (snap
                ? <div className="canvas"><iframe key="draft" title="Live draft" style={{ width: WIDTH[dev] }} sandbox="" srcDoc={snap} /><span className="drafttag"><i />Live draft, finishing…</span></div>
                : <div className="buildstate"><div className="borb" /><b>SYNTHCODE is building your page</b><span>{live ? live.split('\n').length + ' lines written' : 'Warming up…'}</span><button onClick={() => setView('code')}>Watch the code</button></div>)
              : <p className="empty">Your app appears here.</p>)
          : <pre className="code">{busy ? live : html}</pre>}
        {note && <div className="toast" role="status">{note}</div>}
      </div>

      {full && (
        <div className="fs" role="dialog" aria-label="Full screen preview">
          <div className="fsbar"><span>Full screen preview</span><button className="iconbtn sm" onClick={() => setFull(false)} aria-label="Close full screen"><Close /></button></div>
          <iframe title="Full screen preview" sandbox="allow-scripts allow-forms allow-modals" srcDoc={html} />
        </div>
      )}
    </section>
  );
}
