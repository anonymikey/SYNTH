'use client';
import { useRef, useState } from 'react';
import { compress } from '../lib/images';

export function useAttach() {
  const [images, setImages] = useState([]);
  const [note, setNote] = useState('');
  async function add(files) {
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (!list.length) return;
    setNote('');
    const room = 4 - images.length;
    if (room <= 0) { setNote('Up to 4 images per message.'); return; }
    try {
      const out = [];
      for (const f of list.slice(0, room)) out.push(await compress(f));
      setImages((p) => [...p, ...out]);
      if (list.length > room) setNote('Up to 4 images per message.');
    } catch (e) { setNote(e.message); }
  }
  return {
    images, note, add,
    remove: (i) => setImages((p) => p.filter((_, j) => j !== i)),
    clear: () => { setImages([]); setNote(''); },
    onPaste: (e) => { const f = [...e.clipboardData.files]; if (f.some((x) => x.type.startsWith('image/'))) { e.preventDefault(); add(f); } },
    dropProps: { onDragOver: (e) => e.preventDefault(), onDrop: (e) => { e.preventDefault(); add(e.dataTransfer.files); } },
  };
}

export function Thumbs({ a }) {
  return (<>
    {a.images.length > 0 && <div className="thumbs">{a.images.map((s, i) => (
      <div key={i} className="thumb"><img src={s} alt={`Attachment ${i + 1}`} /><button type="button" onClick={() => a.remove(i)} aria-label={`Remove image ${i + 1}`}>×</button></div>
    ))}</div>}
    {a.note && <p className="err">{a.note}</p>}
  </>);
}

export function AttachButton({ a }) {
  const ref = useRef();
  return (<>
    <input ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => { a.add(e.target.files); e.target.value = ''; }} />
    <button type="button" onClick={() => ref.current.click()}>Add image</button>
  </>);
}
