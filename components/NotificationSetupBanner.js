'use client';

import { useEffect, useState } from 'react';
import {
  NOTIFICATION_PREFERENCES_EVENT,
  NOTIFICATION_PREFERENCES_KEY,
  readNotificationPreferences,
  requestNotificationPermission,
  saveNotificationPreferences,
} from '../lib/notifications';

const CATEGORY_LABELS = { assistant: 'Assistant', build: 'SYNTHCODE' };
const SNOOZE_PREFIX = 'synth-notification-suggestion-dismissed-v1-';

function wasDismissed(category) {
  try { return window.sessionStorage.getItem(SNOOZE_PREFIX + category) === '1'; }
  catch { return false; }
}

export default function NotificationSetupBanner({ category }) {
  const label = CATEGORY_LABELS[category];
  const [permission, setPermission] = useState('checking');
  const [configured, setConfigured] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!label) return undefined;
    const refresh = () => {
      const preferences = readNotificationPreferences();
      let nextPermission = 'unsupported';
      try {
        if (window.isSecureContext && typeof window.Notification === 'function') {
          nextPermission = window.Notification.permission || 'default';
        }
      } catch {}
      setPermission(nextPermission);
      setConfigured(nextPermission === 'granted' && preferences[category] === true);
      setDismissed(wasDismissed(category));
    };
    const onStorage = (event) => {
      if (!event.key || event.key === NOTIFICATION_PREFERENCES_KEY) refresh();
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('storage', onStorage);
    window.addEventListener(NOTIFICATION_PREFERENCES_EVENT, refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(NOTIFICATION_PREFERENCES_EVENT, refresh);
    };
  }, [category, label]);

  if (!label || permission === 'checking' || permission === 'unsupported' || configured || dismissed) return null;

  async function enable() {
    if (busy) return;
    setBusy(true);
    setShowHelp(false);
    if (permission === 'denied') {
      setShowHelp(true);
      setBusy(false);
      return;
    }

    let result = permission;
    if (permission !== 'granted') result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      const current = readNotificationPreferences();
      saveNotificationPreferences({ ...current, [category]: true });
      try { window.sessionStorage.removeItem(SNOOZE_PREFIX + category); } catch {}
      setConfigured(true);
      setDismissed(false);
    } else if (result === 'denied') {
      setShowHelp(true);
    }
    setBusy(false);
  }

  function dismiss() {
    try { window.sessionStorage.setItem(SNOOZE_PREFIX + category, '1'); } catch {}
    setDismissed(true);
  }

  return (
    <section className="notification-nudge" aria-label={`${label} notification setup`}>
      <span className="notification-nudge-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
      </span>
      <span className="notification-nudge-copy">
        <strong>Get notified when {label} finishes</strong>
        <small>Choose whether this open workspace can show task-complete notices.</small>
      </span>
      <span className="notification-nudge-actions">
        <button type="button" className="notification-nudge-enable" onClick={enable} disabled={busy}>
          {busy ? 'Enabling…' : permission === 'denied' ? 'How to enable' : permission === 'granted' ? 'Turn on' : 'Enable'}
        </button>
        <button type="button" className="notification-nudge-dismiss" onClick={dismiss} aria-label={`Dismiss ${label} notification suggestion`} title="Not now">
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
        </button>
      </span>
      {showHelp && <p className="notification-nudge-help" role="status">Notifications are blocked by your browser. Allow them in this site’s browser permissions, then return here. You can also manage task types in Settings → Notification.</p>}
    </section>
  );
}
