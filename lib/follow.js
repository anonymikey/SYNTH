import { useCallback, useEffect, useRef, useState } from 'react';

// Keeps a scroll area pinned to its newest content, but only while the reader is at the bottom.
// If they scroll up, it stops following and `away` turns true so a "scroll to latest" button can be shown.
export function useFollow(dep) {
  const ref = useRef(null);
  const stick = useRef(true);
  const [away, setAway] = useState(false);
  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    stick.current = near;
    setAway(!near);
  }, []);
  useEffect(() => { const el = ref.current; if (el && stick.current) el.scrollTop = el.scrollHeight; }, [dep]);
  const down = useCallback((smooth = true) => {
    const el = ref.current;
    if (!el) return;
    stick.current = true;
    setAway(false);
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
  }, []);
  return { ref, onScroll, away, down };
}
