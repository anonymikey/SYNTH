'use client';
import { useEffect } from 'react';
import {
  DEFAULT_NOTIFICATION_SOUND_DEFAULTS,
  NOTIFICATION_PREFERENCES_EVENT,
  TASK_NOTIFICATION_EVENT,
  normalizeNotificationSoundDefaults,
  playNotificationSound,
  readNotificationPreferences,
  resolveNotificationSound,
} from '../lib/notifications';

let faviconRevision = 0;
const originalIcons = new WeakMap();
const badgeIcons = new Map();

function setFaviconDot(enabled) {
  if (typeof document === 'undefined') return;
  const revision = ++faviconRevision;
  const links = [...document.querySelectorAll('link[rel~="icon"]')];
  for (const link of links) {
    if (!originalIcons.has(link)) originalIcons.set(link, link.getAttribute('href'));
    const original = originalIcons.get(link);
    if (!enabled) {
      if (original) link.setAttribute('href', original);
      else link.removeAttribute('href');
      continue;
    }
    if (!original) continue;
    if (badgeIcons.has(original)) {
      link.setAttribute('href', badgeIcons.get(original));
      continue;
    }
    const image = new Image();
    image.onload = () => {
      if (revision !== faviconRevision || !link.isConnected) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const context = canvas.getContext('2d');
        if (!context) return;
        context.drawImage(image, 0, 0, 64, 64);
        context.beginPath(); context.arc(51, 13, 10, 0, Math.PI * 2);
        context.fillStyle = '#fb5577'; context.fill();
        context.lineWidth = 4; context.strokeStyle = '#ffffff'; context.stroke();
        const href = canvas.toDataURL('image/png');
        badgeIcons.set(original, href);
        link.setAttribute('href', href);
      } catch {}
    };
    try { image.src = new URL(original, window.location.href).href; } catch {}
  }
}

function isHidden() {
  return typeof document !== 'undefined' && document.visibilityState !== 'visible';
}

export default function NotificationManager() {
  useEffect(() => {
    const active = new Map();
    const unread = new Set();
    const openNotifications = new Set();
    const managerClosedNotifications = new WeakSet();
    const pendingWorkspaceSounds = [];
    let preferences = readNotificationPreferences();
    let soundDefaults = { ...DEFAULT_NOTIFICATION_SOUND_DEFAULTS };
    let soundDefaultsReady = false;

    const refreshBadge = () => setFaviconDot(
      preferences.faviconDot && isHidden() && (active.size > 0 || unread.size > 0),
    );
    const syncPreferences = () => {
      preferences = readNotificationPreferences();
      refreshBadge();
    };
    const closeManaged = (notification) => {
      managerClosedNotifications.add(notification);
      try { notification.close(); } catch {}
    };
    const soundEnabledFor = (category, state) => state === 'completed'
      ? preferences[category]
      : state === 'failed' && preferences.failures;
    const playTaskSound = ({ category, state }) => {
      if (!isHidden() || !preferences.soundsEnabled || !soundEnabledFor(category, state)) return;
      const choice = category === 'assistant' ? preferences.assistantSound : preferences.buildSound;
      if (choice === 'workspace' && !soundDefaultsReady) {
        if (pendingWorkspaceSounds.length < 12) pendingWorkspaceSounds.push({ category, state });
        return;
      }
      const sound = resolveNotificationSound(choice, soundDefaults, category);
      if (sound !== 'silent') void playNotificationSound(sound);
    };
    const flushWorkspaceSounds = () => {
      if (!soundDefaultsReady || !pendingWorkspaceSounds.length) return;
      const pending = pendingWorkspaceSounds.splice(0);
      for (const item of pending) playTaskSound(item);
    };
    const clearUnread = () => {
      if (!isHidden()) {
        unread.clear();
        pendingWorkspaceSounds.length = 0;
        for (const notification of openNotifications) {
          closeManaged(notification);
        }
        openNotifications.clear();
        setFaviconDot(false);
        const clearVisibleBadge = () => { if (!isHidden()) setFaviconDot(false); };
        if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(clearVisibleBadge);
        else window.setTimeout(clearVisibleBadge, 0);
        return;
      }
      refreshBadge();
    };
    const maybeNotify = (category, state, taskId) => {
      if (!isHidden()) return;
      const enabled = state === 'completed' ? preferences[category] : state === 'failed' && preferences.failures;
      if (!enabled || typeof window.Notification !== 'function' || window.Notification.permission !== 'granted') { refreshBadge(); return; }

      const isFailure = state === 'failed';
      const title = isFailure
        ? 'A SYNTH task needs attention'
        : category === 'assistant' ? 'Your Assistant response is ready' : 'Your SYNTHCODE build is complete';
      const body = isFailure ? 'Return to SYNTH to retry or review the result.' : 'Return to SYNTH to review the result.';
      try {
        unread.add(taskId);
        refreshBadge();
        const notification = new window.Notification(title, {
          body,
          icon: '/icon-192.png',
          tag: `synth-${taskId}`,
          silent: true,
        });
        openNotifications.add(notification);
        notification.onclick = () => {
          managerClosedNotifications.add(notification);
          try { window.focus(); } catch {}
          try { notification.close(); } catch {}
          unread.delete(taskId);
          openNotifications.delete(notification);
          refreshBadge();
        };
        notification.onclose = () => {
          openNotifications.delete(notification);
          if (!managerClosedNotifications.has(notification)) {
            unread.delete(taskId);
            refreshBadge();
          }
        };
        window.setTimeout(() => {
          closeManaged(notification);
          openNotifications.delete(notification);
        }, 12_000);
      } catch { unread.delete(taskId); refreshBadge(); return; }

      playTaskSound({ category, state });
    };
    const onTask = (event) => {
      const detail = event.detail || {};
      const { taskId, category, state } = detail;
      if (!taskId || !['assistant', 'build'].includes(category)) return;
      if (state === 'started') {
        active.set(taskId, category);
        refreshBadge();
        return;
      }
      if (!['completed', 'failed', 'stopped'].includes(state)) return;
      active.delete(taskId);
      if (state !== 'stopped') maybeNotify(category, state, taskId);
      else refreshBadge();
    };

    window.addEventListener(TASK_NOTIFICATION_EVENT, onTask);
    window.addEventListener(NOTIFICATION_PREFERENCES_EVENT, syncPreferences);
    window.addEventListener('storage', syncPreferences);
    document.addEventListener('visibilitychange', clearUnread);
    window.addEventListener('focus', clearUnread);
    window.addEventListener('pageshow', clearUnread);
    const defaultsController = new AbortController();
    const defaultsTimeout = window.setTimeout(() => defaultsController.abort(), 2_500);
    fetch('/api/notifications/defaults', { cache: 'no-store', signal: defaultsController.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => { if (value) soundDefaults = normalizeNotificationSoundDefaults(value); })
      .catch(() => {})
      .finally(() => {
        window.clearTimeout(defaultsTimeout);
        soundDefaultsReady = true;
        flushWorkspaceSounds();
      });
    refreshBadge();

    return () => {
      defaultsController.abort();
      window.clearTimeout(defaultsTimeout);
      pendingWorkspaceSounds.length = 0;
      window.removeEventListener(TASK_NOTIFICATION_EVENT, onTask);
      window.removeEventListener(NOTIFICATION_PREFERENCES_EVENT, syncPreferences);
      window.removeEventListener('storage', syncPreferences);
      document.removeEventListener('visibilitychange', clearUnread);
      window.removeEventListener('focus', clearUnread);
      window.removeEventListener('pageshow', clearUnread);
      for (const notification of openNotifications) closeManaged(notification);
      setFaviconDot(false);
    };
  }, []);

  return null;
}
