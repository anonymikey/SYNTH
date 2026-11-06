'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Close, Arrow, Build, Flask, Img, Mic, Settings } from '../lib/icons';

const STORAGE_KEY = 'synth-capabilities-banner-v1';
const SYNC_EVENT = 'synth-capabilities-banner-dismissed';

const CONTENT = {
  landing: {
    art: '/synth-banner-landing.webp',
    eyebrow: 'THE SYNTH WORKSPACE, EVOLVED',
    title: 'Think. Build. Make it yours.',
    description: 'Ask with tools and images, build responsive projects from prompts or screenshots, and make the workspace your own.',
    features: [
      { icon: Flask, text: 'Built-in tools + failover' },
      { icon: Img, text: 'Vision + image tools*' },
      { icon: Mic, text: 'Voice transcription*' },
      { icon: Build, text: 'Responsive previews' },
      { icon: Settings, text: 'Personalized appearance' },
    ],
    actions: [
      { label: 'Try Assistant', href: '/app?tab=chat', primary: true },
      { label: 'Build with SYNTHCODE', href: '/app?tab=build' },
      { label: 'See the latest', href: '/dev-updates' },
    ],
    note: '*Cloudflare image and voice tools need optional setup; Cloudflare limits apply.',
  },
  assistant: {
    art: '/synth-banner-assistant.webp',
    eyebrow: 'SYNTH ASSISTANT · NEW CAPABILITIES',
    title: 'Ask, explore, attach, or dictate.',
    description: 'Use built-in tools and image understanding in chat. Optional image generation and speech transcription work when Cloudflare Workers AI is configured.',
    features: [
      { icon: Flask, text: 'Free built-in tools' },
      { icon: Img, text: 'Image understanding + creation*' },
      { icon: Mic, text: 'Voice transcription*' },
    ],
    actions: [
      { label: 'Build with SYNTHCODE', href: '/app?tab=build', primary: true },
      { label: 'What’s new', href: '/dev-updates' },
    ],
    note: '*Cloudflare media features require the provider to be enabled with server-side account credentials and are subject to its limits.',
  },
  builder: {
    art: '/synth-banner-builder.webp',
    eyebrow: 'SYNTHCODE · FROM PROMPT TO PROJECT',
    title: 'Build it, preview it, keep refining.',
    description: 'Start with a description or screenshot. SYNTHCODE creates and edits project files, with live previews sized for desktop, tablet, and phone.',
    features: [
      { icon: Build, text: 'Multi-file projects' },
      { icon: Img, text: 'Screenshots and sketches' },
      { icon: Mic, text: 'Voice transcription*' },
    ],
    actions: [
      { label: 'Ask SYNTH ASSISTANT', href: '/app?tab=chat', primary: true },
      { label: 'What’s new', href: '/dev-updates' },
    ],
    note: '*Voice transcription requires Cloudflare Workers AI to be enabled and configured. Usage follows Cloudflare’s limits.',
  },
  updates: {
    art: '/synth-banner-updates.webp',
    eyebrow: 'LATEST SYNTH RELEASE',
    title: 'New tools. Your workspace.',
    description: 'Discover optional Cloudflare media tools, streamlined composers, and browser-saved appearance settings.',
    features: [
      { icon: Flask, text: 'Cloudflare is optional' },
      { icon: Mic, text: 'Voice + image tools*' },
      { icon: Settings, text: 'Personalization saved locally' },
    ],
    actions: [
      { label: 'Read latest', href: '/dev-updates/cloudflare-voice-personalization', primary: true },
      { label: 'Open SYNTH', href: '/app' },
    ],
    note: '*Cloudflare media features need setup and follow Cloudflare’s limits.',
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
