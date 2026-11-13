export const NOTIFICATION_PREFERENCES_KEY = 'synth-notification-preferences-v1';
export const NOTIFICATION_PREFERENCES_EVENT = 'synth:notification-preferences';
export const TASK_NOTIFICATION_EVENT = 'synth:task-notification';

export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  assistant: true,
  build: true,
  failures: false,
  faviconDot: true,
  soundsEnabled: true,
  assistantSound: 'workspace',
  buildSound: 'workspace',
});

export const NOTIFICATION_SOUND_OPTIONS = Object.freeze([
  { id: 'silent', label: 'Silent' },
  { id: 'soft', label: 'Soft bell' },
  { id: 'chime', label: 'Crystal chime' },
  { id: 'spark', label: 'SYNTH sparkle' },
  { id: 'pulse', label: 'Focus pulse' },
]);

export const NOTIFICATION_SOUND_IDS = Object.freeze(NOTIFICATION_SOUND_OPTIONS.map((option) => option.id));
export const DEFAULT_NOTIFICATION_SOUND_DEFAULTS = Object.freeze({ assistant: 'chime', build: 'spark' });
const SOUND_ID_SET = new Set(NOTIFICATION_SOUND_IDS);
const LOCAL_SOUND_CHOICES = new Set([...NOTIFICATION_SOUND_IDS, 'workspace']);

const SOUND_PATTERNS = Object.freeze({
  soft: [[523.25, 0.14, 0], [659.25, 0.17, 0.16]],
  chime: [[659.25, 0.13, 0], [880, 0.2, 0.14]],
  spark: [[784, 0.1, 0], [988, 0.12, 0.11], [1174.66, 0.2, 0.23]],
  pulse: [[440, 0.1, 0], [587.33, 0.1, 0.14], [440, 0.16, 0.3]],
});
let audioContext = null;

const objectOrEmpty = (value) => value && typeof value === 'object' && !Array.isArray(value) ? value : {};

export function normalizeNotificationPreferences(value) {
  const source = objectOrEmpty(value);
  return {
    assistant: typeof source.assistant === 'boolean' ? source.assistant : DEFAULT_NOTIFICATION_PREFERENCES.assistant,
    build: typeof source.build === 'boolean' ? source.build : DEFAULT_NOTIFICATION_PREFERENCES.build,
    failures: typeof source.failures === 'boolean' ? source.failures : DEFAULT_NOTIFICATION_PREFERENCES.failures,
    faviconDot: typeof source.faviconDot === 'boolean' ? source.faviconDot : DEFAULT_NOTIFICATION_PREFERENCES.faviconDot,
    soundsEnabled: typeof source.soundsEnabled === 'boolean' ? source.soundsEnabled : DEFAULT_NOTIFICATION_PREFERENCES.soundsEnabled,
    assistantSound: LOCAL_SOUND_CHOICES.has(source.assistantSound) ? source.assistantSound : DEFAULT_NOTIFICATION_PREFERENCES.assistantSound,
    buildSound: LOCAL_SOUND_CHOICES.has(source.buildSound) ? source.buildSound : DEFAULT_NOTIFICATION_PREFERENCES.buildSound,
  };
}

export function normalizeNotificationSoundDefaults(value) {
  const source = objectOrEmpty(value);
  return {
    assistant: SOUND_ID_SET.has(source.assistant) ? source.assistant : DEFAULT_NOTIFICATION_SOUND_DEFAULTS.assistant,
    build: SOUND_ID_SET.has(source.build) ? source.build : DEFAULT_NOTIFICATION_SOUND_DEFAULTS.build,
  };
}

function resolveStorage(storage) {
  if (storage) return storage;
  try { return typeof window !== 'undefined' ? window.localStorage : null; } catch { return null; }
}

export function readNotificationPreferences(storage) {
  try {
    const saved = resolveStorage(storage)?.getItem(NOTIFICATION_PREFERENCES_KEY);
    return normalizeNotificationPreferences(saved ? JSON.parse(saved) : null);
  } catch {
    return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  }
}

export function saveNotificationPreferences(value, storage) {
  const normalized = normalizeNotificationPreferences(value);
  try { resolveStorage(storage)?.setItem(NOTIFICATION_PREFERENCES_KEY, JSON.stringify(normalized)); } catch {}
  if (typeof window !== 'undefined') {
    try { window.dispatchEvent(new Event(NOTIFICATION_PREFERENCES_EVENT)); } catch {}
  }
  return normalized;
}

export function resetNotificationPreferences(storage) {
  try { resolveStorage(storage)?.removeItem(NOTIFICATION_PREFERENCES_KEY); } catch {}
  return saveNotificationPreferences(DEFAULT_NOTIFICATION_PREFERENCES, storage);
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !window.isSecureContext || typeof window.Notification !== 'function') return 'unsupported';
  try {
    const request = window.Notification.requestPermission();
    void prepareNotificationAudio();
    const result = await Promise.resolve(request);
    return ['granted', 'denied', 'default'].includes(result) ? result : 'unsupported';
  } catch {
    return 'unsupported';
  }
}

export function reportTaskNotification(taskId, category, state) {
  if (typeof window === 'undefined' || !taskId || !['assistant', 'build'].includes(category)) return;
  if (!['started', 'completed', 'failed', 'stopped'].includes(state)) return;
  try {
    window.dispatchEvent(new CustomEvent(TASK_NOTIFICATION_EVENT, {
      detail: { taskId: String(taskId).slice(0, 120), category, state },
    }));
  } catch {}
}

export function resolveNotificationSound(selection, defaults, category) {
  if (selection === 'silent') return 'silent';
  if (selection !== 'workspace') return SOUND_ID_SET.has(selection) ? selection : 'silent';
  return normalizeNotificationSoundDefaults(defaults)[category] || 'silent';
}

export function prepareNotificationAudio() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return Promise.resolve(false);
  try {
    audioContext ||= new AudioContextClass();
    return audioContext.state === 'suspended' ? audioContext.resume().then(() => true).catch(() => false) : Promise.resolve(true);
  } catch {
    return Promise.resolve(false);
  }
}

export async function playNotificationSound(soundId) {
  const pattern = SOUND_PATTERNS[soundId];
  if (!pattern || !(await prepareNotificationAudio()) || !audioContext) return false;
  try {
    const startAt = audioContext.currentTime + 0.025;
    for (const [frequency, duration, delay] of pattern) {
      const start = startAt + delay;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.12, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + duration + 0.01);
    }
    return true;
  } catch {
    return false;
  }
}
