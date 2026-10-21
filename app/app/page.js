'use client';
import { useEffect, useState } from 'react';
import Chat from '../../components/Chat';
import Builder from '../../components/Builder';
import { Chat as ChatIcon, Build as BuildIcon } from '../../lib/icons';

export default function Home() {
  const [tab, setTab] = useState('chat');
  const [models, setModels] = useState([]);
  const [pick, setPick] = useState('');
  const [seed, setSeed] = useState({ tab: '', q: '' });

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

  // Chosen model first, the rest as automatic fallbacks.
  const ordered = pick ? [models.find((m) => m.id === pick), ...models.filter((m) => m.id !== pick)].filter(Boolean) : models;
  const picker = (
    <label className="picker"><span>Model</span>
      <select value={pick} onChange={(e) => { setPick(e.target.value); localStorage.setItem('synthai-model', e.target.value); }}>
        {models.length === 0 && <option value="">No models found</option>}
        {models.map((m) => <option key={m.id} value={m.id}>{m.name}{m.vision ? ' (images)' : ''}</option>)}
      </select>
    </label>
  );

  return (
    <div className="app">
      <aside className="side">
        <a className="brand" href="/" aria-label="SYNTHAI home"><img src="/logo-mark.png" alt="" /><span>SYNTHAI</span></a>
        <nav aria-label="Workspace">
          <button className={'navbtn' + (tab === 'chat' ? ' on' : '')} onClick={() => setTab('chat')}><ChatIcon />Synth Assistant</button>
          <button className={'navbtn' + (tab === 'build' ? ' on' : '')} onClick={() => setTab('build')}><BuildIcon />Web builder</button>
        </nav>
        <div className="sidefoot">
          {picker}
          <p className="meta"><i className="dot" />{models.length} free models ready</p>
        </div>
      </aside>
      <main className="main">
        <header className="top"><a className="brand" href="/" aria-label="SYNTHAI home"><img src="/logo-mark.png" alt="" /><span>SYNTHAI</span></a>{picker}</header>
        <div hidden={tab !== 'chat'}><Chat models={ordered} seed={seed.tab === 'chat' ? seed.q : ''} /></div>
        <div hidden={tab !== 'build'}><Builder models={ordered} seed={seed.tab === 'build' ? seed.q : ''} /></div>
      </main>
    </div>
  );
}
