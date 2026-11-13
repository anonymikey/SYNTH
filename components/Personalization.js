'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DEFAULT_PERSONALIZATION, normalizePersonalization, applyPersonalization, prepareWorkspaceWallpaper } from '../lib/personalization';
import { Close, Settings as SettingsIcon } from '../lib/icons';
import NotificationSettings from './NotificationSettings';

const STORAGE_KEY = 'synth-personalization-v1';
const THEME_CHOICES = [
  { id: 'midnight', title: 'Dark', note: 'SYNTH’s deep original palette', color: '#10162e', toast: 'Switching off the lights' },
  { id: 'light', title: 'Light', note: 'Bright surfaces, calm contrast', color: '#edf2fb', toast: 'Bringing in the daylight' },
  { id: 'system', title: 'System', note: 'Follow your device appearance', color: '#8896ae', toast: 'Matching your device’s appearance' },
  { id: 'aurora', title: 'Aurora', note: 'Teal glow over deep blue', color: '#22c7b8', toast: 'Letting the aurora flow' },
  { id: 'obsidian', title: 'Obsidian', note: 'Low-glare near-black surfaces', color: '#111318', toast: 'Going deeper into the dark' },
  { id: 'ember', title: 'Ember', note: 'Warm charcoal and copper', color: '#d47a53', toast: 'Warming up your workspace' },
  { id: 'forest', title: 'Forest', note: 'Deep green, soft mint glow', color: '#398d69', toast: 'Settling into the forest' },
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
const TABS = [
  { id: 'personalization', label: 'Personalization' },
  { id: 'notification', label: 'Notification' },
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
  const [activeTab, setActiveTab] = useState('personalization');
  const [prefs, setPrefs] = useState(DEFAULT_PERSONALIZATION);
  const trigger = useRef(null);
  const dialog = useRef(null);
  const tabButtons = useRef({});
  const wallpaperInput = useRef(null);
  const toastTimers = useRef([]);
  const [themeToast, setThemeToast] = useState(null);
  const [wallpaperBusy, setWallpaperBusy] = useState(false);
  const [wallpaperError, setWallpaperError] = useState('');

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

  useEffect(() => () => toastTimers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const frame = requestAnimationFrame(() => tabButtons.current[activeTab]?.focus());
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
  }, [open, activeTab]);

  function update(key, value) {
    setPrefs((current) => ({ ...current, [key]: value }));
  }

  function selectTheme(theme) {
    update('theme', theme);
    const choice = THEME_CHOICES.find((item) => item.id === theme);
    if (!choice) return;
    toastTimers.current.forEach(clearTimeout);
    setThemeToast({ message: choice.toast, leaving: false, id: Date.now() });
    toastTimers.current = [
      setTimeout(() => setThemeToast((current) => current ? { ...current, leaving: true } : current), 1650),
      setTimeout(() => setThemeToast(null), 1980),
    ];
  }

  async function chooseWallpaper(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setWallpaperBusy(true);
    setWallpaperError('');
    try {
      const wallpaper = await prepareWorkspaceWallpaper(file);
      update('wallpaper', wallpaper);
    } catch (error) {
      setWallpaperError(error instanceof Error ? error.message : 'That image could not be prepared. Try another PNG, JPEG or WebP image.');
    } finally {
      setWallpaperBusy(false);
      input.value = '';
    }
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setPrefs({ ...DEFAULT_PERSONALIZATION });
  }

  function openSettings() {
    setActiveTab('personalization');
    setOpen(true);
  }

  function onTabKeyDown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? TABS[0].id
      : event.key === 'End' ? TABS[TABS.length - 1].id
        : activeTab === 'personalization' ? 'notification' : 'personalization';
    setActiveTab(next);
    requestAnimationFrame(() => tabButtons.current[next]?.focus());
  }

  return (
    <>
      <button ref={trigger} type="button" className="navbtn settings-launch" onClick={openSettings} aria-haspopup="dialog" aria-expanded={open}>
        <SettingsIcon /><span>Settings</span>
      </button>
      {open && ready && createPortal(
        <div className="settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title" ref={dialog}>
            <header className="settings-head">
              <div><span className="settings-kicker">SYNTH WORKSPACE</span><h2 id="settings-title">Settings</h2><p>Personalize your workspace and task notifications.</p></div>
              <button type="button" className="iconbtn sm settings-close" onClick={() => setOpen(false)} aria-label="Close settings"><Close /></button>
            </header>
            <div className="settings-tabs" role="tablist" aria-label="Settings sections" onKeyDown={onTabKeyDown}>
              {TABS.map((tab) => (
                <button key={tab.id} ref={(node) => { tabButtons.current[tab.id] = node; }} type="button" role="tab"
                  id={`settings-tab-${tab.id}`} aria-selected={activeTab === tab.id} aria-controls={`settings-panel-${tab.id}`}
                  tabIndex={activeTab === tab.id ? 0 : -1} className={'settings-tab' + (activeTab === tab.id ? ' active' : '')}
                  onClick={() => setActiveTab(tab.id)}>{tab.label}</button>
              ))}
            </div>
            <div className="settings-content">
              <div id="settings-panel-personalization" role="tabpanel" aria-labelledby="settings-tab-personalization" tabIndex={0} hidden={activeTab !== 'personalization'}>
                  <section className="pref-section">
                    <div className="pref-heading"><div><h3>Platform theme</h3><p>Choose a palette for SYNTH ASSISTANT and SYNTHCODE.</p></div></div>
                    <OptionGroup label="Platform theme" value={prefs.theme} choices={THEME_CHOICES} onChange={selectTheme} className="theme-options" />
                  </section>
                  <section className="pref-section">
                    <div className="pref-heading"><div><h3>Workspace background</h3><p>Use a favorite image behind the workspace panels.</p></div></div>
                    <div className="settings-wallpaper-layout">
                      <div className={'settings-wallpaper-preview' + (prefs.wallpaper ? ' has-image' : '')} role="img" aria-label={prefs.wallpaper ? 'Selected workspace background preview' : 'No custom background selected'}>
                        {prefs.wallpaper ? <img src={prefs.wallpaper} alt="" /> : <span>Your background preview</span>}
                        {prefs.wallpaper && <i className="settings-wallpaper-wash" style={{ opacity: prefs.wallpaperDim / 100 }} aria-hidden="true" />}
                      </div>
                      <div className="settings-wallpaper-actions">
                        <input ref={wallpaperInput} type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseWallpaper} hidden aria-label="Choose a workspace background image" />
                        <div className="settings-wallpaper-buttons">
                          <button type="button" className="settings-wallpaper-button" onClick={() => wallpaperInput.current?.click()} disabled={wallpaperBusy}>
                            {wallpaperBusy ? 'Preparing image…' : prefs.wallpaper ? 'Change image' : 'Choose image'}
                          </button>
                          {prefs.wallpaper && <button type="button" className="settings-wallpaper-remove" onClick={() => { update('wallpaper', ''); setWallpaperError(''); }} disabled={wallpaperBusy}>Remove</button>}
                        </div>
                        <p>PNG, JPEG or WebP · resized on this device · never uploaded.</p>
                      </div>
                    </div>
                    {prefs.wallpaper && <div className="settings-wallpaper-dim">
                      <label htmlFor="settings-wallpaper-dim"><span>Readability overlay</span><b>{prefs.wallpaperDim}%</b></label>
                      <input id="settings-wallpaper-dim" type="range" min="0" max="80" step="5" value={prefs.wallpaperDim} onChange={(event) => update('wallpaperDim', Number(event.target.value))} />
                      <small>Increase the wash to keep text and glass panels easy to read.</small>
                    </div>}
                    {wallpaperError && <p className="settings-wallpaper-error" role="alert">{wallpaperError}</p>}
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
              <div id="settings-panel-notification" role="tabpanel" aria-labelledby="settings-tab-notification" tabIndex={0} hidden={activeTab !== 'notification'}>
                <NotificationSettings />
              </div>
            </div>
            <footer className="settings-foot">
              <span>{activeTab === 'personalization' ? 'Appearance saved automatically on this device.' : 'Notification choices saved on this device.'}</span>
              <div>{activeTab === 'personalization' && <button type="button" className="settings-reset" onClick={reset}>Reset defaults</button>}<button type="button" className="primary settings-done" onClick={() => setOpen(false)}>Done</button></div>
            </footer>
          </section>
        </div>,
        document.body,
      )}
      {themeToast && createPortal(
        <div key={themeToast.id} className={'theme-transition-toast' + (themeToast.leaving ? ' leaving' : '')} role="status" aria-live="polite" aria-atomic="true">
          <span className="theme-transition-mark" aria-hidden="true" />
          <span>{themeToast.message}</span>
        </div>,
        document.body,
      )}
    </>
  );
}
