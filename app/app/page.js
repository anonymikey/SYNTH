'use client';
import { useEffect, useRef, useState } from 'react';
import Chat from '../../components/Chat';
import Builder from '../../components/Builder';
import { Chat as ChatIcon, Build as BuildIcon, Pin, Menu, Close, Panel } from '../../lib/icons';

const TABS = [['chat', 'SYNTH ASSISTANT', ChatIcon], ['build', 'SYNTHCODE', BuildIcon]];
const PIN_KEY = 'synth-sidebar-pinned';

export default function Home() {
  const [tab, setTab] = useState('chat');
  const [seed, setSeed] = useState({ tab: '', q: '' });
  const [pinned, setPinned] = useState(false);   // desktop: locked open
  const [peek, setPeek] = useState(false);       // desktop: sidebar visible (hover or button)
  const [manual, setManual] = useState(false);   // desktop: opened with the top-bar button, stays until closed
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

  useEffect(() => { try { setPinned(localStorage.getItem(PIN_KEY) === '1'); } catch {} }, []);
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setDrawer(false); setManual(false); setPeek(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Desktop hover behaviour (ignored while pinned).
  const show = () => { if (pinned) return; clearTimeout(timer.current); setPeek(true); };
  const hide = () => { if (pinned || manual) return; clearTimeout(timer.current); timer.current = setTimeout(() => setPeek(false), 160); };
  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    setManual(false);
    setPeek(!next); // unpinning with the cursor on the sidebar: stay open until the cursor leaves
    try { localStorage.setItem(PIN_KEY, next ? '1' : '0'); } catch {}
  };
  const togglePanel = () => {
    clearTimeout(timer.current);
    if (peek) { setPeek(false); setManual(false); } else { setPeek(true); setManual(true); }
  };
  const closeSidebar = () => { setDrawer(false); setManual(false); setPeek(false); };
  const choose = (k) => { setTab(k); setDrawer(false); };
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
          <button className="iconbtn sm closebtn" onClick={closeSidebar} aria-label="Close sidebar"><Close /></button>
        </div>
        <p className="sidelabel">Workspace</p>
        <nav aria-label="Workspace">
          {TABS.map(([k, label, Icon]) => (
            <button key={k} className={'navbtn' + (tab === k ? ' on' : '')} onClick={() => choose(k)}><Icon />{label}</button>
          ))}
        </nav>
        <div className="sidefoot"><p className="meta"><i className="dot" />SYNTH Ready to Rock and Roll</p></div>
      </aside>

      <main className="main" onMouseDown={(e) => { if (manual && !e.target.closest('.panelbtn')) closeSidebar(); }}>
        <header className={'top' + (tab === 'build' ? ' xl' : '')}>
          <button className={'iconbtn panelbtn' + (peek ? ' on' : '')} onClick={togglePanel} aria-label={peek ? 'Close sidebar' : 'Open sidebar'} title={peek ? 'Close sidebar' : 'Open sidebar'} aria-expanded={peek} aria-controls="sidebar"><Panel /></button>
          <button className="iconbtn menubtn" onClick={() => setDrawer(true)} aria-label="Open menu" aria-expanded={drawer} aria-controls="sidebar"><Menu /></button>
          <img className="topmark" src="/logo-mark.png" alt="" />
          <div className="topttl"><h1 className="toptitle">{title}</h1>{tab === 'build' && <span className="topsub">Think. Build. Evolve.</span>}</div>
        </header>
        <div hidden={tab !== 'chat'}><Chat seed={seed.tab === 'chat' ? seed.q : ''} /></div>
        <div hidden={tab !== 'build'}><Builder seed={seed.tab === 'build' ? seed.q : ''} /></div>
      </main>
    </div>
  );
}
