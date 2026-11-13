export const DEFAULT_PERSONALIZATION = Object.freeze({
  theme: 'midnight',
  accent: 'cyan',
  font: 'default',
  textSize: 'standard',
  chatStyle: 'gradient',
  density: 'comfortable',
  wallpaper: '',
  wallpaperDim: 45,
});

export const PERSONALIZATION_OPTIONS = Object.freeze({
  theme: ['midnight', 'light', 'system', 'aurora', 'obsidian', 'ember', 'forest'],
  accent: ['cyan', 'violet', 'emerald', 'amber', 'rose'],
  font: ['default', 'system', 'serif', 'mono'],
  textSize: ['small', 'standard', 'large'],
  chatStyle: ['gradient', 'solid', 'minimal'],
  density: ['comfortable', 'compact'],
});

export const MAX_WALLPAPER_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_WALLPAPER_BLOB_BYTES = 600_000;
export const MAX_WALLPAPER_DATA_URL_LENGTH = 850_000;
const WALLPAPER_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const WALLPAPER_DATA_URL = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/i;

export function isSupportedWallpaperFile(file) {
  return !!file && WALLPAPER_TYPES.includes(file.type) && Number.isFinite(file.size)
    && file.size > 0 && file.size <= MAX_WALLPAPER_SOURCE_BYTES;
}

export function isSafeWallpaperDataUrl(value) {
  return typeof value === 'string' && value.length <= MAX_WALLPAPER_DATA_URL_LENGTH
    && WALLPAPER_DATA_URL.test(value);
}

export function normalizePersonalization(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const preferences = Object.fromEntries(Object.keys(PERSONALIZATION_OPTIONS).map((key) => [
    key,
    PERSONALIZATION_OPTIONS[key].includes(source[key]) ? source[key] : DEFAULT_PERSONALIZATION[key],
  ]));
  const dim = typeof source.wallpaperDim === 'number' ? source.wallpaperDim : NaN;
  return {
    ...preferences,
    wallpaper: isSafeWallpaperDataUrl(source.wallpaper) ? source.wallpaper : '',
    wallpaperDim: Number.isFinite(dim) ? Math.round(Math.max(0, Math.min(80, dim))) : DEFAULT_PERSONALIZATION.wallpaperDim,
  };
}

function decodeImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(objectUrl); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('That image could not be opened. Try a PNG, JPEG or WebP image.')); };
    image.src = objectUrl;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('The image could not be prepared.'));
    reader.onerror = () => reject(new Error('The image could not be prepared.'));
    reader.readAsDataURL(blob);
  });
}

export async function prepareWorkspaceWallpaper(file) {
  if (!isSupportedWallpaperFile(file)) {
    throw new Error('Choose a PNG, JPEG or WebP image 20 MB or smaller.');
  }
  if (typeof document === 'undefined' || typeof Image === 'undefined' || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
    throw new Error('Image editing is not supported in this browser.');
  }
  const image = await decodeImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight || sourceWidth * sourceHeight > 80_000_000) {
    throw new Error('That image is too large to use as a workspace background.');
  }
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) throw new Error('Image editing is not supported in this browser.');

  let scale = Math.min(1, 1920 / Math.max(sourceWidth, sourceHeight));
  let quality = 0.84;
  for (let attempt = 0; attempt < 7; attempt += 1) {
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
    if (!blob) throw new Error('The image could not be compressed in this browser.');
    if (blob.size <= MAX_WALLPAPER_BLOB_BYTES) {
      const dataUrl = await blobToDataUrl(blob);
      if (isSafeWallpaperDataUrl(dataUrl)) return dataUrl;
      throw new Error('The compressed image format is not supported.');
    }
    if (attempt % 2 === 1) scale *= 0.78;
    quality = Math.max(0.48, quality - 0.08);
  }
  throw new Error('This image could not be reduced enough. Try a smaller image.');
}

export function applyPersonalization(value, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root) return;
  const preferences = normalizePersonalization(value);
  for (const key of Object.keys(PERSONALIZATION_OPTIONS)) root.dataset[key] = preferences[key];
  root.dataset.wallpaper = preferences.wallpaper ? 'custom' : 'none';
  if (!root.style?.setProperty) return;
  if (preferences.wallpaper) {
    root.style.setProperty('--workspace-wallpaper', `url("${preferences.wallpaper}")`);
    root.style.setProperty('--wallpaper-dim', String(preferences.wallpaperDim / 100));
  } else {
    root.style.removeProperty('--workspace-wallpaper');
    root.style.removeProperty('--wallpaper-dim');
  }
}
