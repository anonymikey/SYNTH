import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  DEFAULT_NOTIFICATION_SOUND_DEFAULTS,
  NOTIFICATION_PREFERENCES_KEY,
  NOTIFICATION_SOUND_IDS,
  normalizeNotificationPreferences,
  normalizeNotificationSoundDefaults,
  playNotificationSound,
  readNotificationPreferences,
  requestNotificationPermission,
  reportTaskNotification,
  resetNotificationPreferences,
  resolveNotificationSound,
  saveNotificationPreferences,
  TASK_NOTIFICATION_EVENT,
} from '../lib/notifications.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    values,
  };
}

test('notification preferences accept only known booleans and sound choices', () => {
  const preferences = normalizeNotificationPreferences({
    assistant: false,
    build: 'yes',
    failures: true,
    faviconDot: 1,
    soundsEnabled: false,
    assistantSound: 'data:audio/wav,evil',
    buildSound: 'pulse',
    permission: 'granted',
    prompt: 'private content',
  });
  assert.deepEqual(preferences, {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    assistant: false,
    failures: true,
    soundsEnabled: false,
    buildSound: 'pulse',
  });
  assert.equal(Object.hasOwn(preferences, 'prompt'), false);
  assert.equal(Object.hasOwn(preferences, 'permission'), false);
});

test('preferences save and reset locally without changing browser permission', () => {
  const storage = memoryStorage();
  const saved = saveNotificationPreferences({ assistant: false, build: true, assistantSound: 'soft' }, storage);
  assert.equal(storage.getItem(NOTIFICATION_PREFERENCES_KEY), JSON.stringify(saved));
  assert.deepEqual(readNotificationPreferences(storage), saved);
  assert.deepEqual(resetNotificationPreferences(storage), { ...DEFAULT_NOTIFICATION_PREFERENCES });
  assert.equal(storage.getItem(NOTIFICATION_PREFERENCES_KEY), JSON.stringify(DEFAULT_NOTIFICATION_PREFERENCES));
});

test('browser permission helper prompts only in a supported secure context and normalizes failures', async () => {
  const originalWindow = globalThis.window;
  let requests = 0;
  function FakeNotification() {}
  FakeNotification.permission = 'default';
  FakeNotification.requestPermission = () => { requests += 1; return Promise.resolve('granted'); };
  try {
    globalThis.window = {
      isSecureContext: true,
      Notification: FakeNotification,
    };
    assert.equal(await requestNotificationPermission(), 'granted');
    assert.equal(requests, 1);
    globalThis.window.isSecureContext = false;
    assert.equal(await requestNotificationPermission(), 'unsupported');
    assert.equal(requests, 1);
    globalThis.window.isSecureContext = true;
    globalThis.window.Notification.requestPermission = () => { throw new Error('blocked'); };
    assert.equal(await requestNotificationPermission(), 'unsupported');
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
});

test('workspace sound defaults and user overrides are restricted to generated presets', async () => {
  const defaults = normalizeNotificationSoundDefaults({ assistant: 'pulse', build: 'remote-audio-url' });
  assert.deepEqual(defaults, { assistant: 'pulse', build: DEFAULT_NOTIFICATION_SOUND_DEFAULTS.build });
  assert.deepEqual([...NOTIFICATION_SOUND_IDS].sort(), ['chime', 'pulse', 'silent', 'soft', 'spark']);
  assert.equal(resolveNotificationSound('workspace', defaults, 'assistant'), 'pulse');
  assert.equal(resolveNotificationSound('workspace', defaults, 'build'), DEFAULT_NOTIFICATION_SOUND_DEFAULTS.build);
  assert.equal(resolveNotificationSound('silent', defaults, 'assistant'), 'silent');
  assert.equal(resolveNotificationSound('https://example.org/sound.mp3', defaults, 'assistant'), 'silent');
  assert.equal(await playNotificationSound('silent'), false);
});

test('task lifecycle events contain only a bounded id, allowed category and state', () => {
  const originalWindow = globalThis.window;
  const originalCustomEvent = globalThis.CustomEvent;
  const events = [];
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) { this.type = type; this.detail = options.detail; }
  };
  globalThis.window = { dispatchEvent: (event) => events.push(event) };
  try {
    reportTaskNotification('task-' + 'x'.repeat(150), 'assistant', 'completed');
    reportTaskNotification('task-2', 'build', 'failed');
    reportTaskNotification('private prompt', 'assistant', 'prompt');
    reportTaskNotification('task-3', 'unknown', 'completed');
    assert.equal(events.length, 2);
    assert.equal(events[0].type, TASK_NOTIFICATION_EVENT);
    assert.deepEqual(events[0].detail, { taskId: 'task-' + 'x'.repeat(115), category: 'assistant', state: 'completed' });
    assert.deepEqual(events[1].detail, { taskId: 'task-2', category: 'build', state: 'failed' });
    assert.deepEqual(Object.keys(events[0].detail).sort(), ['category', 'state', 'taskId']);
  } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
    if (originalCustomEvent === undefined) delete globalThis.CustomEvent;
    else globalThis.CustomEvent = originalCustomEvent;
  }
});

test('task event helper is safe to call outside a browser', () => {
  const originalWindow = globalThis.window;
  try {
    delete globalThis.window;
    assert.doesNotThrow(() => reportTaskNotification('task', 'assistant', 'completed'));
  } finally {
    if (originalWindow !== undefined) globalThis.window = originalWindow;
  }
});
