'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Close, Settings as SettingsIcon } from '../lib/icons';
import { LANGUAGE_OPTIONS, languageLabel, normalizeLanguagePreference } from '../lib/project-languages';

const shortLabel = (language) => language === 'auto' ? 'Auto' : language === 'backend' ? 'Node.js' : languageLabel(language);

export function LanguageSettingsButton({ preference, onClick, open = false, iconOnly = false }) {
  const label = shortLabel(preference);
  return (
    <button
      type="button"
      className={iconOnly ? 'iconbtn sm builder-settings-icon' : 'toolbar-chip builder-settings-chip'}
      onClick={onClick}
      aria-label={`Open SYNTHCODE settings. Language preference: ${label}.`}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls="synthcode-language-settings"
      title={`SYNTHCODE settings · Language preference: ${label}`}
    >
      <SettingsIcon width="16" height="16" />
      {!iconOnly && <span className="toolbar-label">{label}</span>}
    </button>
  );
}

export default function BuilderLanguageSettings({
  open,
  onClose,
  preference,
  onChange,
  busy = false,
  preferenceReady = true,
  projectStarted = false,
  currentLanguage = 'auto',
}) {
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const currentLabel = busy && currentLanguage === 'auto' ? 'Selecting a mode…' : languageLabel(currentLanguage);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const dialog = dialogRef.current;
    const focusFrame = window.requestAnimationFrame(() => {
      const target = dialog?.querySelector('select:not(:disabled)') || dialog?.querySelector('button:not(:disabled)');
      target?.focus();
    });
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), select:not(:disabled)')];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="builder-settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <aside
        id="synthcode-language-settings"
        ref={dialogRef}
        className="builder-settings-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-settings-title"
        aria-describedby="builder-settings-description"
      >
        <header className="builder-settings-head">
          <div>
            <span className="builder-settings-kicker">SYNTHCODE</span>
            <h2 id="builder-settings-title">Settings</h2>
            <p id="builder-settings-description">Choose how SYNTHCODE should shape new projects.</p>
          </div>
          <button type="button" className="iconbtn sm" onClick={onClose} aria-label="Close SYNTHCODE settings"><Close width="17" height="17" /></button>
        </header>

        <div className="builder-settings-content">
          <section className="builder-language-section" aria-labelledby="builder-language-heading">
            <label id="builder-language-heading" htmlFor="builder-language-preference">Language preference</label>
            <p>Auto is recommended. SYNTHCODE selects one supported project mode from your request; you can also choose a preferred mode for future projects.</p>
            <select
              id="builder-language-preference"
              value={normalizeLanguagePreference(preference)}
              disabled={busy || !preferenceReady}
              onChange={(event) => onChange?.(normalizeLanguagePreference(event.target.value))}
            >
              {LANGUAGE_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
            {!preferenceReady && <small className="builder-settings-status" role="status">Loading the saved preference…</small>}
            {busy && <small className="builder-settings-status">Language preference is locked while a build is running.</small>}
          </section>

          <section className="builder-settings-current" aria-live="polite">
            <span>{projectStarted ? 'CURRENT PROJECT' : 'NEXT PROJECT'}</span>
            <b>{projectStarted ? currentLabel : languageLabel(preference)}</b>
            <p>{projectStarted
              ? 'Changing the preference here will not change this project. Use New after choosing a preference to start a project in another mode.'
              : 'Your selection is saved in this browser and used when a new project starts.'}</p>
          </section>

          <p className="builder-settings-boundary">Python, Rust, Go, C++ and Node.js backend projects are source exports only. SYNTHCODE does not compile, test, run, host, or deploy them.</p>
        </div>

        <footer className="builder-settings-foot">
          <span>Preference is stored locally in this browser when available.</span>
          <button type="button" className="primary settings-done" onClick={onClose}>Done</button>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
