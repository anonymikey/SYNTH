'use client';
import { useEffect, useRef, useState } from 'react';
import Chat from '../../components/Chat';
import Builder from '../../components/Builder';
import { Chat as ChatIcon, Build as BuildIcon, Pin, Menu, Close } from '../../lib/icons';

const TABS = [['chat', 'SYNTH ASSISTANT', ChatIcon], ['build', 'SYNTHCODE', BuildIcon]];
const PIN_KEY = 'synth-sidebar-pinned';

export default function Home() {
  const [tab, setTab] = useState('chat');
  const [models, setModels] = useState([]);
  const [pick, setPick] = useState('');
  const [seed, setSeed] = useState({ tab: '', q: '' });
  const [pinned, setPinned] = useState(false);   // desktop: locked open
  const [peek, setPeek] = useState(false);       // desktop: shown by hover
  const [drawer, setDrawer] = useState(false);   // mobile: slide-in menu
  const timer = useRef(null);

  // Landing prompt hand-off: /app?tab=build&q=...
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    const t = p.get('tab'), q = p.get('q') || '';
    if (t === 'build' || t === 'chat') setTab(t);
    if (q) setSeed({ tab: t === 'chat' ? 'chat' : 'build', q });
    if (location.search) history.replaceState(null, '', '/app');
  }, []);

  useEffect(() => {
    fetch('/api/models').then((r) => r.json()).then((j) => {
      const list = j.models || [];
      setModels(list);
      const saved = localStorage.getItem('synthai-model');
      setPick(list.find((m) => m.id === saved) ? saved : list[0]?.id || '');
    }).catch(() => {});
  }, []);

  useEffect(() => { try { setPinned(localStorage.getItem(PIN_KEY) === '1'); } catch {} }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setDrawer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Desktop hover behaviour (ignored while pinned).
  const show = () => { if (pinned) return; clearTimeout(timer.current); setPeek(true); };
  const hide = () => { if (pinned) return; clearTimeout(timer.current); timer.current = setTimeout(() => setPeek(false), 160); };
  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    setPeek(!next); // unpinning with the cursor on the sidebar: stay open until the cursor leaves
    try { localStorage.setItem(PIN_KEY, next ? '1' : '0'); } catch {}
  };
  const choose = (k) => { setTab(k); setDrawer(false); };

  // Chosen model first, the rest as automatic fallbacks.
  const ordered = pick ? [models.find((m) => m.id === pick), ...models.filter((m) => m.id !== pick)].filter(Boolean) : models;
  const title = TABS.find((t) => t[0] === tab)[1];

  return (
    <div className={'app' + (pinned ? ' is-pinned' : '')}>
      <div className="edge" onMouseEnter={show} aria-hidden="true" />
      <div className={'scrim' + (drawer ? ' show' : '')} onClick={() => setDrawer(false)} aria-hidden="true" />

      <aside id="sidebar" className={'side' + (pinned ? ' pinned' : '') + (peek ? ' peek' : '') + (drawer ? ' drawer-open' : '')} onMouseEnter={show} onMouseLeave={hide}>
        <div className="sidehead">
          <a className="brand" href="/" aria-label="SYNTH home"><img src="/logo-mark.png" alt="" /><span>SYNTH</span></a>
          <button className={'iconbtn sm pinbtn' + (pinned ? ' on' : '')} onClick={togglePin} aria-pressed={pinned}
            aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar'} title={pinned ? 'Unpin sidebar' : 'Pin sidebar'}><Pin /></button>
          <button className="iconbtn sm closebtn" onClick={() => setDrawer(false)} aria-label="Close menu"><Close /></button>
        </div>
        <nav aria-label="Workspace">
          {TABS.map(([k, label, Icon]) => (
            <button key={k} className={'navbtn' + (tab === k ? ' on' : '')} onClick={() => choose(k)}><Icon />{label}</button>
          ))}
        </nav>
        <div className="sidefoot"><p className="meta"><i className="dot" />{models.length} free models ready</p></div>
      </aside>

      <main className="main">
        <header className="top">
          <button className="iconbtn menubtn" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} aria-controls="sidebar"><Menu /></button>
          <img className="topmark" src="/logo-mark.png" alt="" />
          <h1 className="toptitle">{title}</h1>
          <label className="picker"><span>Model</span>
            <select value={pick} onChange={(e) => { setPick(e.target.value); localStorage.setItem('synthai-model', e.target.value); }}>
              {models.length === 0 && <option value="">No models found</option>}
              {models.map((m) => <option key={m.id} value={m.id}>{m.name}{m.vision ? ' (images)' : ''}</option>)}
            </select>
          </label>
        </header>
        <div hidden={tab !== 'chat'}><Chat models={ordered} seed={seed.tab === 'chat' ? seed.q : ''} /></div>
        <div hidden={tab !== 'build'}><Builder models={ordered} seed={seed.tab === 'build' ? seed.q : ''} /></div>
      </main>
    </div>
  );
}
