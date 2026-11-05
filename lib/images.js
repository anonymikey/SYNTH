// Client-side: shrink photos/screenshots so they fit Vercel's request limit and keep text readable.
const MAX_CHARS = 1_000_000;
export async function compress(file) {
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is over 15 MB.');
  const bmp = await createImageBitmap(file).catch(() => { throw new Error('Could not read that image. Use PNG, JPG, WebP or GIF.'); });
  const k = Math.min(1, 1568 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const x = c.getContext('2d');
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(bmp, 0, 0, c.width, c.height);
  let q = 0.88, url = c.toDataURL('image/jpeg', q);
  while (url.length > MAX_CHARS && q > 0.4) { q -= 0.12; url = c.toDataURL('image/jpeg', q); }
  if (url.length > MAX_CHARS) throw new Error('That image is too detailed to send. Try a smaller one.');
  return url;
}
export const withImages = (text, images, fallback) =>
  images?.length ? [{ type: 'text', text: text || fallback }, ...images.map((u) => ({ type: 'image_url', image_url: { url: u } }))] : text;
