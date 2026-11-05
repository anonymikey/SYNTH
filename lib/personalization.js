export const DEFAULT_PERSONALIZATION = Object.freeze({
  theme: 'midnight',
  accent: 'cyan',
  font: 'default',
  textSize: 'standard',
  chatStyle: 'gradient',
  density: 'comfortable',
});

export const PERSONALIZATION_OPTIONS = Object.freeze({
  theme: ['midnight', 'light', 'system'],
  accent: ['cyan', 'violet', 'emerald', 'amber', 'rose'],
  font: ['default', 'system', 'serif', 'mono'],
  textSize: ['small', 'standard', 'large'],
  chatStyle: ['gradient', 'solid', 'minimal'],
  density: ['comfortable', 'compact'],
});

export function normalizePersonalization(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return Object.fromEntries(Object.entries(DEFAULT_PERSONALIZATION).map(([key, fallback]) => [
    key,
    PERSONALIZATION_OPTIONS[key].includes(source[key]) ? source[key] : fallback,
  ]));
}

export function applyPersonalization(value, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return;
  const preferences = normalizePersonalization(value);
  for (const [key, selection] of Object.entries(preferences)) root.dataset[key] = selection;
}
