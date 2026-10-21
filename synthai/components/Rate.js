'use client';
import { useState } from 'react';
import { rate } from '../lib/track';
export default function Rate({ id }) {
  const [v, setV] = useState(0);
  const set = (n) => { setV(n); rate(id, n); };
  return (
    <span className="rate">
      <button className={v === 1 ? 'on' : ''} onClick={() => set(1)} aria-pressed={v === 1}>Helpful</button>
      <button className={v === -1 ? 'on' : ''} onClick={() => set(-1)} aria-pressed={v === -1}>Not helpful</button>
    </span>
  );
}
