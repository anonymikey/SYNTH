'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_PERSONALIZATION, normalizePersonalization, applyPersonalization } from '../lib/personalization';
import { Close, Settings as SettingsIcon } from '../lib/icons';

const STORAGE_KEY = 'synth-personalization-v1';
const THEME_CHOICES = [
  { id: 'midnight', title: 'Midnight', note: 'SYNTH’s deep original dark look' },
  { id: 'light', title: 'Light', note: 'Bright surfaces and dark text' },
  { id: 'system', title: 'System', note: 'Follow your device appearance' },
];
const ACCENTS = [
  { id: 'cyan', title: 'Ocean cyan', color: '#22d3ee' },
  { id: 'violet', title: 'Violet', color: '#a78bfa' },
  { id: 'emerald', title: 'Emerald', color: '#34d399' },
  { id: 'amber', title: 'Amber', color: '#fbbf24' },
  { id: 'rose', title: 'Rose', color: '#fb7185' },
];
const FONTS = [
  { id: 'default', title: 'Sora + Inter', note: 'Workspace default' },
  { id: 'system', title: 'System', note: 'Native device font' },
  { id: 'serif', title: 'Serif', note: 'Traditional reading style' },
  { id: 'mono', title: 'Monospace', note: 'Code-inspired typography' },
];
const TEXT_SIZES = [
  { id: 'small', title: 'Small' },
  { id: 'standard', title: 'Default' },
  { id: 'large', title: 'Large' },
];
const CHAT_STYLES = [
  { id: 'gradient', title: 'Gradient', note: 'Colorful user messages' },
  { id: 'solid', title: 'Soft', note: 'Quiet solid bubbles' },
  { id: 'minimal', title: 'Minimal', note: 'Assistant answers without a card' },
];
const DENSITIES = [
  { id: 'comfortable', title: 'Comfortable' },
  { id: 'compact', title: 'Compact' },
];

function OptionGroup({ label, value, choices, onChange, className = '' }) {
  return (
    <div className={'pref-group ' + className} role="group" aria-label={label}>
      {choices.map((choice) => (
        <button key={choice.id} type="button" className={'pref-choice' + (value === choice.id ? ' selected' : '')}
          onClick={() => onChange(choice.id)} aria-pressed={value === choice.id}>
          {choice.color && <i className="pref-swatch" style={{ '--swatch': choice.color }} aria-hidden="true" />}
          <span className="pref-choice-copy"><b>{choice.title}</b>{choice.note && <small>{choice.note}</small>}</span>
          {value === choice.id && <span className="pref-check" aria-hidden="true">✓</span>}
        </button>
      ))}
    </div>
  );
}

export default function Personalization() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULT_PERSONALIZATION);
  const trigger = useRef(null);
  const dialog = useRef(null);

  useEffect(() => {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch {}
    const next = normalizePersonalization(saved);
    setPrefs(next);
    applyPersonalization(next);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyPersonalization(prefs);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
  }, [prefs, ready]);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const frame = requestAnimationFrame(() => dialog.current?.querySelector('button')?.focus());
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const nodes = [...(dialog.current?.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])') || [])];
      if (!nodes.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [open]);

  function update(key, value) {
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setPrefs({ ...DEFAULT_PERSONALIZATION });
  }

  return (
    <>
      <button ref={trigger} type="button" className="navbtn settings-launch" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open}>
        <SettingsIcon /><span>Settings</span>
      </button>
      {open && ready && createPortal(
        <div className="settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" ref={dialog}>
            <header className="settings-head">
              <div><span className="settings-kicker">SYNTH WORKSPACE</span><h2 id="settings-title">Personalization</h2><p>Shape the workspace to feel right for you.</p></div>
              <button type="button" className="iconbtn sm settings-close" onClick={() => setOpen(false)} aria-label="Close settings"><Close /></button>
            </header>
            <div className="settings-content">
              <section className="pref-section">
                <div className="pref-heading"><div><h3>Platform theme</h3><p>Choose how the whole workspace looks.</p></div></div>
                <OptionGroup label="Platform theme" value={prefs.theme} choices={THEME_CHOICES} onChange={(value) => update('theme', value)} className="theme-options" />
              </section>
              <section className="pref-section">
                <div className="pref-heading"><div><h3>Accent color</h3><p>Updates highlights, buttons, focus rings and progress bars.</p></div></div>
                <OptionGroup label="Accent color" value={prefs.accent} choices={ACCENTS} onChange={(value) => update('accent', value)} className="accent-options" />
              </section>
              <section className="pref-section">
                <div className="pref-heading"><div><h3>Typography</h3><p>Current workspace default: Sora headings with Inter body text.</p></div></div>
                <OptionGroup label="Workspace font" value={prefs.font} choices={FONTS} onChange={(value) => update('font', value)} className="font-options" />
                <div className="pref-subheading"><b>Text size</b><span>Adjust reading size across the workspace.</span></div>
                <OptionGroup label="Text size" value={prefs.textSize} choices={TEXT_SIZES} onChange={(value) => update('textSize', value)} className="seg-options" />
              </section>
              <section className="pref-section">
                <div className="pref-heading"><div><h3>Conversation appearance</h3><p>Change how messages are presented in SYNTH Assistant.</p></div></div>
                <OptionGroup label="Chat bubble style" value={prefs.chatStyle} choices={CHAT_STYLES} onChange={(value) => update('chatStyle', value)} className="theme-options" />
                <div className="pref-subheading"><b>Message spacing</b><span>Choose the amount of space between turns.</span></div>
                <OptionGroup label="Message spacing" value={prefs.density} choices={DENSITIES} onChange={(value) => update('density', value)} className="seg-options" />
              </section>
            </div>
            <footer className="settings-foot"><span>Saved automatically on this device.</span><div><button type="button" className="settings-reset" onClick={reset}>Reset defaults</button><button type="button" className="primary settings-done" onClick={() => setOpen(false)}>Done</button></div></footer>
          </section>
        </div>,
        document.body,
      )}
    </>
  );
}
