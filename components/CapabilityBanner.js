'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Close, Arrow, Build, Flask, Globe, Settings } from '../lib/icons';

const STORAGE_KEY = 'synth-capabilities-banner-v2';
const SYNC_EVENT = 'synth-capabilities-banner-dismissed';

const CONTENT = {
  landing: {
    art: '/synth-banner-landing.webp',
    eyebrow: 'SYNTHCODE · MULTI-LANGUAGE PROJECTS',
    title: 'Build beyond the browser.',
    description: 'Preview Web and TypeScript projects, or generate downloadable Python, Rust, Go, C++ and Node.js backend source in the same workspace.',
    features: [
      { icon: Build, text: 'Web + TypeScript browser preview*' },
      { icon: Flask, text: 'Python · Rust · Go · C++ source' },
      { icon: Globe, text: 'Node.js backend starters' },
      { icon: Settings, text: 'README guides + ZIP export' },
    ],
    actions: [
      { label: 'Try SYNTHCODE', href: '/app?tab=build', primary: true },
      { label: 'Read the release notes', href: '/dev-updates/synthcode-multilanguage-projects' },
    ],
    note: '*TypeScript preview is transpile-only. Python, Rust, Go, C++ and backend projects export source only; SYNTHCODE does not compile, test, run or deploy them.',
  },
  assistant: {
    art: '/synth-banner-assistant.webp',
    eyebrow: 'SYNTHCODE · NEW PROJECT MODES',
    title: 'More than browser projects.',
    description: 'From SYNTH ASSISTANT, open SYNTHCODE to preview Web and TypeScript projects or export Python, Rust, Go, C++ and Node.js backend source.',
    features: [
      { icon: Build, text: 'Browser preview: Web + TypeScript*' },
      { icon: Flask, text: 'Source exports: Python, Rust, Go, C++' },
      { icon: Globe, text: 'Node.js backend starters' },
    ],
    actions: [
      { label: 'Open SYNTHCODE', href: '/app?tab=build', primary: true },
      { label: 'Read the release notes', href: '/dev-updates/synthcode-multilanguage-projects' },
    ],
    note: '*Python, Rust, Go, C++ and backend modes export source files only; SYNTHCODE does not compile or run them.',
  },
  builder: {
    art: '/synth-banner-builder.webp',
    eyebrow: 'SYNTHCODE · MORE PROJECT LANGUAGES',
    title: 'Preview browser apps. Export source projects.',
    description: 'Choose Web or TypeScript for a browser preview, or generate multi-file Python, Rust, Go, C++ and Node.js backend starter projects with local run instructions.',
    features: [
      { icon: Build, text: 'Web + TypeScript preview*' },
      { icon: Flask, text: 'Python · Rust · Go · C++ source' },
      { icon: Globe, text: 'Node.js backend starter source' },
      { icon: Settings, text: 'README + ZIP download' },
    ],
    actions: [
      { label: 'Ask SYNTH ASSISTANT', href: '/app?tab=chat', primary: true },
      { label: 'Read the release notes', href: '/dev-updates/synthcode-multilanguage-projects' },
    ],
    note: '*TypeScript preview is transpile-only. Other listed language modes export source; SYNTHCODE does not compile, test, run, or deploy them.',
  },
  updates: {
    art: '/synth-banner-updates.webp',
    eyebrow: 'LATEST SYNTH RELEASE',
    title: 'More ways to build with SYNTHCODE.',
    description: 'TypeScript browser previews and downloadable Python, Rust, Go, C++ and Node.js backend source projects—one combined release.',
    features: [
      { icon: Build, text: 'Web + TypeScript preview*' },
      { icon: Flask, text: 'Five source-export modes' },
      { icon: Settings, text: 'Local run guides + ZIPs' },
    ],
    actions: [
      { label: 'Read release notes', href: '/dev-updates/synthcode-multilanguage-projects', primary: true },
      { label: 'Open SYNTH', href: '/app' },
    ],
    note: '*Python, Rust, Go, C++, and Node.js backend projects are source-only exports. SYNTHCODE does not run or deploy them.',
  },
};

export default function CapabilityBanner({ variant = 'landing' }) {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const content = CONTENT[variant] || CONTENT.landing;

  useEffect(() => {
    const readDismissal = () => {
      try { setDismissed(localStorage.getItem(STORAGE_KEY) === '1'); }
      catch { setDismissed(false); }
      setReady(true);
    };
    const onStorage = (event) => {
      if (event.key === STORAGE_KEY || event.type === SYNC_EVENT) readDismissal();
    };
    readDismissal();
    window.addEventListener('storage', onStorage);
    window.addEventListener(SYNC_EVENT, onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SYNC_EVENT, onStorage);
    };
  }, []);

  function acknowledge() {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    window.dispatchEvent(new Event(SYNC_EVENT));
  }

  if (!ready || dismissed) return null;

  return (
    <aside className={`capbanner capbanner-${variant}`} aria-label="SYNTH capabilities announcement">
      <img className="capbanner-art" src={content.art} alt="" aria-hidden="true" />
      <div className="capbanner-glow" aria-hidden="true" />
      <div className="capbanner-copy">
        <p className="capbanner-eyebrow"><i />{content.eyebrow}</p>
        <h2>{content.title}</h2>
        <p className="capbanner-description">{content.description}</p>
        <div className="capbanner-features" aria-label="Featured capabilities">
          {content.features.map(({ icon: Icon, text }) => (
            <span className="capbanner-feature" key={text}><Icon width="15" height="15" /><span>{text}</span></span>
          ))}
        </div>
        <div className="capbanner-actions">
          {content.actions.map((action) => (
            <Link key={action.href} href={action.href} onClick={acknowledge} className={'capbanner-link' + (action.primary ? ' primary' : '')}>
              {action.label}{action.primary && <Arrow width="16" height="16" />}
            </Link>
          ))}
        </div>
        <p className="capbanner-note">{content.note}</p>
      </div>
      <button type="button" className="capbanner-dismiss" onClick={acknowledge} aria-label="Dismiss this announcement; it will not return on this browser" title="Dismiss — it won’t return on this browser"><Close width="18" height="18" /></button>
    </aside>
  );
}
