// "Something is cooking" visuals for SYNTHCODE while a page is being generated.
// Pure markup: all motion is CSS (see globals.css), so it is cheap and respects reduced-motion.

export const WORDS = ['structuring', 'styling', 'assembling', 'rendering', 'injecting layout', 'optimizing', 'polishing'];

// Rotates through WORDS in place, 1.5 s each (CSS only).
export function WordCycle() {
  return <span className="wc" aria-hidden="true">{WORDS.map((w, i) => <span key={w} style={{ animationDelay: i * 1.5 + 's' }}>{w}</span>)}</span>;
}

const HTML = ['<main id="app">', '<header class="bar">', '  <nav class="nav">', '    <a href="#top">', '<section class="hero">', '  <h1 class="title">', '  <p class="lead">', '  <button id="cta">', '</section>', '<div class="grid">', '  <article class="card">', '    <img alt="cover" />', '    <span class="badge">', '<ul class="list">', '  <li data-id="3">', '<form id="signup">', '  <input type="email" />', '<aside class="side">', '<canvas id="board">', '<footer class="foot">'];
const CSS = [':root { --accent: #6ea8ff; }', '.card { display: grid; gap: 16px; }', '@media (max-width: 640px) {', 'background: linear-gradient(135deg, #22d3ee, #8b5cf6);', 'transition: transform .2s ease;', 'grid-template-columns: repeat(3, 1fr);', 'border-radius: 16px;', 'box-shadow: 0 10px 40px #0006;', 'backdrop-filter: blur(12px);', '.btn:hover { transform: translateY(-2px); }', 'font: 600 clamp(28px, 5vw, 56px);', 'position: sticky; top: 0;', '@keyframes pulse { 50% { opacity: .5 } }', 'align-items: center;', 'justify-content: space-between;', 'overflow: hidden;', 'color: var(--accent);', 'min-height: 100dvh;', 'gap: clamp(12px, 2vw, 24px);', 'animation: float 6s infinite;'];
const JS = ['const state = { items: [] };', 'function render() {', "document.querySelector('#app')", "el.addEventListener('click', onToggle)", "localStorage.setItem('data', json)", 'items.map(createCard).join("")', 'requestAnimationFrame(tick);', 'export const streak = 0;', 'async function load() {', 'if (!ready) return;', 'const total = items.length;', 'setInterval(update, 1000);', 'form.onsubmit = (e) => {', '  e.preventDefault();', 'let timer = null;', 'function formatTime(s) {', 'state.items.push(next);', 'return html`<li>${name}</li>`;', 'window.onresize = layout;', 'audio.play().catch(noop);'];
const COLS = [['t', HTML], ['c', CSS], ['j', JS]];
// Where the floating words sit (percent of the code area).
const SPOTS = [[8, 12], [62, 8], [30, 34], [74, 46], [12, 64], [52, 72], [80, 86]];

// Low-opacity code stream behind the live code: three scrolling columns plus drifting words.
export function CodeRain() {
  return (
    <>
      <div className="rain" aria-hidden="true">
        {COLS.map(([kind, lines], c) => {
          const list = [...lines, ...lines];
          return (
            <div key={kind} className={'rcol ' + kind}>
              <div className="rtrack" style={{ '--d': 38 + c * 9 + 's', '--o': c * -9 + 's' }}>
                {[0, 1].map((k) => <div key={k}>{list.map((l, i) => <p key={i}>{l}</p>)}</div>)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="rwords" aria-hidden="true">
        {WORDS.map((w, i) => <span key={w} style={{ '--i': i, left: SPOTS[i][0] + '%', top: SPOTS[i][1] + '%' }}>{w}</span>)}
      </div>
    </>
  );
}

// A UI that appears to assemble itself: dark card shell, gradient blocks, hero text, skeleton pieces.
export function AssemblingPreview({ lines = 0, width = '100%' }) {
  const pop = (i) => ({ '--i': i });
  return (
    <div className="asmwrap">
      <div className="asm" style={{ width }}>
        <i className="asm-scan" />
        <div className="asm-bar"><i /><i /><i /><span className="asm-url sk" /></div>
        <div className="asm-body">
          <div className="asm-nav asm-in" style={pop(0)}>
            <b className="asm-logo" /><span className="sk w1" /><span className="sk w2" /><span className="sk w3" /><span className="asm-cta" />
          </div>
          <div className="asm-hero">
            <div className="asm-copy asm-in" style={pop(1)}>
              <small className="asm-kicker"><WordCycle /></small>
              <h3 className="asm-title shimmer-text">Your idea, taking shape</h3>
              <div className="sk p" /><div className="sk p mid" /><div className="sk p short" />
              <div className="asm-btns"><span className="asm-cta big" /><span className="asm-ghost" /></div>
            </div>
            <div className="asm-art asm-in" style={pop(2)}><i className="blob b1" /><i className="blob b2" /><i className="scanbar" /></div>
          </div>
          <div className="asm-cards">
            {[0, 1, 2].map((i) => (
              <div key={i} className="asm-card asm-in" style={pop(3 + i)}><i className="asm-ico" /><div className="sk p" /><div className="sk p short" /></div>
            ))}
          </div>
        </div>
        <div className="asm-foot">
          <span className="asm-live"><i /><WordCycle />…</span>
          <em>{lines ? lines + ' lines written' : 'getting started'}</em>
          <div className="asm-prog"><i /></div>
        </div>
      </div>
    </div>
  );
}

// Shown over the current page while an existing build is being updated.
export function AssemblingOverlay() {
  return (
    <div className="asmover" aria-hidden="true">
      <i className="asm-scan" />
      <span className="drafttag"><i /><WordCycle />…</span>
    </div>
  );
}
