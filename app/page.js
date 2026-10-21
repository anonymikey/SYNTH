'use client';
import { useEffect, useState } from 'react';
import Chat from '../components/Chat';
import Builder from '../components/Builder';

export default function Home() {
  const [tab, setTab] = useState('chat');
  const [models, setModels] = useState([]);
  const [pick, setPick] = useState('');

  useEffect(() => {
    fetch('/api/models').then((r) => r.json()).then((j) => {
      setModels(j.models || []);
      setPick(localStorage.getItem('synthai-model') || j.models?.[0]?.id || '');
    }).catch(() => {});
  }, []);

  // Chosen model first, then the others as fallbacks.
  const ordered = pick ? [models.find((m) => m.id === pick), ...models.filter((m) => m.id !== pick)].filter(Boolean) : models;

  return (
    <div className="shell">
      <header className="bar">
        <h1><img src="/logo-mark.png" alt="" width="34" height="34" />SYNTHAI</h1>
        <nav>
          <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>Synth Assistant</button>
          <button className={tab === 'build' ? 'on' : ''} onClick={() => setTab('build')}>Web builder</button>
        </nav>
        <label className="picker">Model
          <select value={pick} onChange={(e) => { setPick(e.target.value); localStorage.setItem('synthai-model', e.target.value); }}>
            {models.length === 0 && <option value="">No models found</option>}
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}{m.vision ? ' (images)' : ''}</option>)}
          </select>
        </label>
      </header>
      <main>
        <div hidden={tab !== 'chat'}><Chat models={ordered} /></div>
        <div hidden={tab !== 'build'}><Builder models={ordered} /></div>
      </main>
      <footer className="foot">Requests and ratings are logged to help SYNTHAI improve. Please don't enter personal or confidential data.</footer>
    </div>
  );
}
