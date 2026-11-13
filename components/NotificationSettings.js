'use client';
import { useEffect, useState } from 'react';
import {
  DEFAULT_NOTIFICATION_SOUND_DEFAULTS,
  NOTIFICATION_SOUND_OPTIONS,
  playNotificationSound,
  requestNotificationPermission,
  readNotificationPreferences,
  normalizeNotificationSoundDefaults,
  resolveNotificationSound,
  resetNotificationPreferences,
  saveNotificationPreferences,
} from '../lib/notifications';

function ToggleRow({ title, description, checked, onChange, disabled = false }) {
  return (
    <label className={'notification-toggle' + (disabled ? ' disabled' : '')}>
      <span className="notification-toggle-copy"><b>{title}</b><small>{description}</small></span>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  );
}

function soundLabel(soundId) {
  return NOTIFICATION_SOUND_OPTIONS.find((option) => option.id === soundId)?.label || 'SYNTH default';
}

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState(readNotificationPreferences);
  const [soundDefaults, setSoundDefaults] = useState(DEFAULT_NOTIFICATION_SOUND_DEFAULTS);
  const [permission, setPermission] = useState('checking');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    setPreferences(readNotificationPreferences());
    const readPermission = () => {
      if (!window.isSecureContext || typeof window.Notification !== 'function') setPermission('unsupported');
      else setPermission(window.Notification.permission || 'default');
    };
    readPermission();
    window.addEventListener('focus', readPermission);
    fetch('/api/notifications/defaults', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => { if (value) setSoundDefaults(normalizeNotificationSoundDefaults(value)); })
      .catch(() => {});
    return () => window.removeEventListener('focus', readPermission);
  }, []);

  function update(key, value) {
    const next = saveNotificationPreferences({ ...preferences, [key]: value });
    setPreferences(next);
    setNotice('Saved on this device.');
  }

  async function requestPermission() {
    setNotice('');
    const result = await requestNotificationPermission();
    setPermission(result);
    setNotice(result === 'granted'
      ? 'Notifications enabled for this browser.'
      : result === 'denied'
        ? 'Notifications are blocked. Allow them in your browser site settings to enable delivery.'
        : result === 'unsupported'
          ? 'Browser notifications are not supported in this context.'
          : 'No permission was granted. You can try again when ready.');
  }

  async function preview(category) {
    setNotice('');
    const selection = category === 'assistant' ? preferences.assistantSound : preferences.buildSound;
    const sound = resolveNotificationSound(selection, soundDefaults, category);
    if (sound === 'silent') { setNotice('This task is set to Silent.'); return; }
    const played = await playNotificationSound(sound);
    setNotice(played ? `Previewing ${soundLabel(sound)}.` : 'Sound preview is unavailable in this browser.');
  }

  function testNotification() {
    if (permission !== 'granted' || typeof window.Notification !== 'function') return;
    try {
      const notification = new window.Notification('SYNTH notification test', {
        body: 'Notifications are set up. Return to Settings to adjust your choices.',
        icon: '/icon-192.png',
        tag: 'synth-notification-test',
        silent: true,
      });
      notification.onclick = () => { try { window.focus(); notification.close(); } catch {} };
      if (preferences.soundsEnabled) void preview('assistant');
    } catch {
      setNotice('The browser could not display a test notification.');
    }
  }

  function reset() {
    setPreferences(resetNotificationPreferences());
    setNotice('Notification preferences reset on this device. Browser permission is unchanged.');
  }

  const permissionText = permission === 'granted' ? 'Allowed in this browser'
    : permission === 'denied' ? 'Blocked in browser settings'
      : permission === 'unsupported' ? 'Not available here'
        : permission === 'checking' ? 'Checking browser support'
          : 'Not enabled yet';

  return (
    <div className="notification-settings">
      <section className="pref-section">
        <div className="pref-heading"><div><h3>Browser permission</h3><p>Choose explicitly whether SYNTH may show native task notices.</p></div></div>
        <div className="notification-permission-row">
          <span className={'notification-permission-status ' + (permission === 'granted' ? 'is-granted' : permission === 'denied' ? 'is-blocked' : '')} role="status">
            <i aria-hidden="true" />{permissionText}
          </span>
          {permission !== 'granted' && permission !== 'denied' && (
            <button type="button" className="secondary notification-action" onClick={requestPermission} disabled={permission === 'checking' || permission === 'unsupported'}>
              Enable browser notifications
            </button>
          )}
          {permission === 'granted' && (
            <button type="button" className="secondary notification-action" onClick={testNotification}>Send test notification</button>
          )}
        </div>
        {permission === 'denied' && <p className="notification-help">Use your browser’s site permissions for this address to allow notifications. SYNTH will not keep prompting automatically.</p>}
      </section>

      <section className="pref-section">
        <div className="pref-heading"><div><h3>When to notify</h3><p>Task notices are sent only while the SYNTH page is open and hidden behind another tab or window.</p></div></div>
        <ToggleRow title="Assistant task completed" description="Let me know when a response or image is ready." checked={preferences.assistant} onChange={(value) => update('assistant', value)} />
        <ToggleRow title="SYNTHCODE build completed" description="Let me know when a validated project is ready." checked={preferences.build} onChange={(value) => update('build', value)} />
        <ToggleRow title="Task failed" description="Show a generic notice if an Assistant or SYNTHCODE task fails." checked={preferences.failures} onChange={(value) => update('failures', value)} />
        <ToggleRow title="Favicon dot for background work" description="Show a small SYNTH badge while a task is running or a notice is unread." checked={preferences.faviconDot} onChange={(value) => update('faviconDot', value)} />
      </section>

      <section className="pref-section">
        <div className="pref-heading"><div><h3>Notification sounds</h3><p>Sound is generated locally; each workspace can use its own tone or follow the Learning Studio default.</p></div></div>
        <ToggleRow title="Play a sound with task notices" description="Requires browser notification permission and may depend on browser audio settings." checked={preferences.soundsEnabled} onChange={(value) => update('soundsEnabled', value)} />
        {[['assistant', 'Assistant'], ['build', 'SYNTHCODE']].map(([category, label]) => {
          const selection = category === 'assistant' ? preferences.assistantSound : preferences.buildSound;
          const defaultId = soundDefaults[category];
          return (
            <div className="notification-sound-row" key={category}>
              <label htmlFor={`notification-sound-${category}`}>{label} sound</label>
              <select id={`notification-sound-${category}`} value={selection} onChange={(event) => update(category === 'assistant' ? 'assistantSound' : 'buildSound', event.target.value)}>
                <option value="workspace">Use Learning Studio default ({soundLabel(defaultId)})</option>
                {NOTIFICATION_SOUND_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
              <button type="button" className="secondary notification-preview" onClick={() => preview(category)} aria-label={`Preview ${label} notification sound`}>Preview</button>
            </div>
          );
        })}
      </section>

      <p className="notification-lifecycle-note">Notifications work while this SYNTH page remains loaded. If you close the tab or browser, running tasks stop and no background push notification can be delivered.</p>
      <div className="notification-settings-actions">
        <button type="button" className="settings-reset" onClick={reset}>Reset notification choices</button>
        <span role="status" aria-live="polite">{notice}</span>
      </div>
    </div>
  );
}
