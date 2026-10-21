'use client';
// Swap points: each export below can be replaced by a React Bits component of your choice.
import { useEffect, useRef, useState } from 'react';

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function useSeen(ref, threshold = 0.15) {
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window) || reduced()) { setSeen(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return seen;
}
export { useSeen };

// Scroll reveal. variant: up | left | right | scale | blur
export function Reveal({ as: T = 'div', variant = 'up', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  const seen = useSeen(ref);
  return <T ref={ref} className={`rv rv-${variant}${seen ? ' in' : ''} ${className}`} style={{ '--d': delay + 'ms' }} {...rest}>{children}</T>;
}

// Swap point: React Bits "Shiny Text" / "Gradient Text"
export function ShinyText({ children }) { return <span className="shiny">{children}</span>; }

// Swap point: React Bits "Count Up"
export function CountUp({ to, prefix = '', suffix = '' }) {
  const ref = useRef(null);
  const seen = useSeen(ref, 0.4);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!seen) return;
    if (reduced()) { setN(to); return; }
    let raf, t0;
    const step = (t) => { t0 ??= t; const k = Math.min(1, (t - t0) / 1400); setN(Math.round(to * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, to]);
  return <span ref={ref}>{prefix}{n}{suffix}</span>;
}

// Swap point: React Bits "Logo Loop"
export function Marquee({ items }) {
  const row = items.map((t) => <span key={t} className="mq-item">{t}</span>);
  return (
    <div className="mq" aria-hidden="true"><div className="mq-track"><div>{row}</div><div>{row}</div></div></div>
  );
}

// Swap point: React Bits "Tech Text" (footer wordmark)
export function Wordmark({ text }) { return <div className="wm" aria-hidden="true">{text}</div>; }

// Swap point: React Bits "Spotlight Card"
export function Card({ className = '', children, ...rest }) {
  const move = (e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', e.clientX - r.left + 'px'); e.currentTarget.style.setProperty('--my', e.clientY - r.top + 'px'); };
  return <div className={'card ' + className} onMouseMove={move} {...rest}>{children}</div>;
}
