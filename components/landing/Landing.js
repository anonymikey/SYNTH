'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import '../../app/landing.css';
import { Reveal, ShinyText, CountUp, Marquee, Wordmark, Card } from './bits';
import { Flow, EvolveLoop, DemoWindow, MockBuilder, MockVision, MockFallback, MockLearn, MockAdmin, MockDevices } from './visuals';
import { Globe, Build, Phone, Chat, Flask, Arrow, Menu, Close } from '../../lib/icons';
import CapabilityBanner from '../CapabilityBanner';

const TILES = [
  { k: 'website', t: 'Website', I: Globe, p: 'Build a modern, responsive website for ' },
  { k: 'app', t: 'App', I: Phone, p: 'Build a working web app that ' },
  { k: 'proto', t: 'Prototype', I: Flask, p: 'Prototype an interactive demo of ' },
  { k: 'ask', t: 'SYNTH ASSISTANT', I: Chat, p: '' },
];
const HOLD = ['a habit tracker with streaks', 'a landing page for my bakery', 'a budget dashboard with charts', 'a quiz game for kids'];
const CAPABILITIES = ['Web preview', 'TypeScript preview', 'Python source', 'Rust source', 'Go source', 'C++ source', 'Node.js backend source', 'Responsive layouts', 'Project ZIP export', 'Local run guides'];
const NAV = [['Features', '#features'], ['How it works', '#how'], ['Evolve', '#evolve'], ['FAQ', '#faq']];
const FAQ = [
  ['Is SYNTH really free?', 'There is no SYNTH subscription required to start. SYNTH uses services configured for the workspace; availability, limits and any charges depend on the connected account. Optional SYNTH Image Master and voice tools follow the same account-specific limits.'],
  ['How does SYNTH learn?', 'SYNTHCORE builds a memory of short lessons from ratings and sessions, plus lessons shared by other agents. The SYNTH Learning Studio reviews lessons before they are added to prompts, so you stay in control.'],
  ['Are my prompts private?', 'Assistant and SYNTHCODE requests are processed by the external AI services configured for this workspace. If the workspace owner enables an optional free-model fallback, text may also pass through an upstream model service whose retention and training policies vary. Avoid sharing sensitive information.'],
  ['Are my images stored?', 'Images may be processed by an external AI service to answer your request and are not stored by SYNTH. Logs only record that an image was attached. Avoid sharing confidential information.'],
  ['What can I build?', 'Use Web for multi-file browser pages and apps, or TypeScript for a browser preview that transpiles one plain .ts file without full type-checking or package imports. Python, Rust, Go, C++ and Node.js backend modes generate downloadable source projects and local run instructions only; SYNTHCODE does not compile, test, run, host or deploy those projects.'],
  ['Do I need an account?', 'No. Open the workspace and start.'],
  ['What are the new image and voice features?', 'SYNTH Image Master provides optional image creation and voice transcription when enabled in workspace settings. These features use a connected external service and are subject to that account’s limits and terms.'],
  ['Will SYNTH remember my appearance settings?', 'Yes. Theme, accent, typography, text size and chat appearance preferences are saved in local storage in this browser.'],
];

export default function Landing() {
  const root = useRef(null), box = useRef(null);
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [mode, setMode] = useState('build');
  const [text, setText] = useState('');
  const [ph, setPh] = useState(0);

  useEffect(() => {
    const el = root.current;
    let raf = 0;
    const tick = () => {
      raf = 0;
      const y = el.scrollTop, max = el.scrollHeight - el.clientHeight, vh = el.clientHeight;
      el.style.setProperty('--sy', y);
      el.style.setProperty('--prog', max > 0 ? y / max : 0);
      setScrolled(y > 24);
      el.querySelectorAll('[data-progress]').forEach((n) => {
        const r = n.getBoundingClientRect();
        n.style.setProperty('--p', Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.9 + r.height * 0.3))).toFixed(3));
      });
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    el.addEventListener('scroll', on, { passive: true });
    window.addEventListener('resize', on);
    tick();
    return () => { el.removeEventListener('scroll', on); window.removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  useEffect(() => { const t = setInterval(() => setPh((p) => (p + 1) % HOLD.length), 3200); return () => clearInterval(t); }, []);

  const go = () => { const q = text.trim(); router.push('/app?tab=' + (mode === 'ask' ? 'chat' : 'build') + (q ? '&q=' + encodeURIComponent(q) : '')); };
  const pick = (t) => { setMode(t.k === 'ask' ? 'ask' : 'build'); setText(t.p); setTimeout(() => { const b = box.current; if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }, 0); };

  return (
    <div className="ld" ref={root}>
      <div className="progress" />

      <header className={'nav' + (scrolled ? ' scrolled' : '') + (menu ? ' open' : '')}>
        <Link href="/" className="logo"><img src="/logo-mark.png" alt="" /><span>SYNTH</span></Link>
        <nav className="links" aria-label="Main">{NAV.map(([n, h]) => <a key={n} href={h} onClick={() => setMenu(false)}>{n}</a>)}<Link href="/dev-updates" onClick={() => setMenu(false)}>Dev updates</Link></nav>
        <div className="navcta">
          <Link href="/app" className="btn solid">Open workspace</Link>
          <button className="menubtn" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <Close /> : <Menu />}</button>
        </div>
      </header>

      <CapabilityBanner variant="landing" />

      {/* HERO */}
      <section className="hero">
        <div className="blobs" aria-hidden="true"><i className="b1" /><i className="b2" /><i className="b3" /><i className="b4" /></div>
        <div className="dots" aria-hidden="true" />
        <div className="heroin">
          <Reveal variant="blur"><p className="eyebrow"><ShinyText>Think · Build · Evolve</ShinyText></p></Reveal>
          <Reveal variant="blur" delay={80}><h1>What will you build today?</h1></Reveal>
          <Reveal variant="blur" delay={160}><p className="sub">Chat, preview responsive browser projects, or export source projects with SYNTHCODE. Personalize your workspace and explore learning insights in the SYNTH Learning Studio.</p></Reveal>
          <Reveal variant="scale" delay={240}>
            <div className="box">
              <textarea ref={box} rows={3} value={text} onChange={(e) => setText(e.target.value)} aria-label="What do you want to build?"
                placeholder={(mode === 'ask' ? 'Ask SYNTH anything, e.g. ' : 'Let\u2019s build ') + HOLD[ph] + '\u2026'}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } }} />
              <div className="boxfoot">
                <div className="modes" role="group" aria-label="Mode">
                  <button className={mode === 'build' ? 'on' : ''} onClick={() => setMode('build')}>Build</button>
                  <button className={mode === 'ask' ? 'on' : ''} onClick={() => setMode('ask')}>Ask</button>
                </div>
                <button className="btn go" onClick={go}>{mode === 'ask' ? 'Ask now' : 'Build now'} <Arrow /></button>
              </div>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <div className="tiles">{TILES.map((t) => <button key={t.k} className={'tile' + ((t.k === 'ask') === (mode === 'ask') && text === t.p ? ' on' : '')} onClick={() => pick(t)}><span><t.I width="26" height="26" /></span>{t.t}</button>)}</div>
            <p className="from">or start from <Link href="/app?tab=build" className="pillink">A screenshot</Link><Link href="/app?tab=build" className="pillink">A blank page</Link><Link href="/app?tab=chat" className="pillink">A question</Link></p>
          </Reveal>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="strip">
        <Reveal><p className="cap">SYNTH routes each task to an available engine and recovers automatically when a service is busy.</p></Reveal>
        <Marquee items={CAPABILITIES} />
      </section>

      {/* PILLARS */}
      <section className="sec center" id="features">
        <Reveal><h2>Empowering <span className="gt">builders and thinkers</span></h2></Reveal>
        <Reveal delay={100}><p className="lead">One workspace to ask, make and improve. No SYNTH account required; optional services follow their account-specific limits.</p></Reveal>
        <div className="beam" data-progress><i /><b className="orb" /></div>
        <div className="grid3">
          {[['Think', 'SYNTH ASSISTANT', 'Ask questions, share screenshots and get clearly formatted answers and code.', Chat],
            ['Build', 'SYNTHCODE', 'Preview Web and TypeScript projects, or export Python, Rust, Go, C++ and Node.js backend source with a local run guide.', Build],
            ['Evolve', 'Learning loop', 'Ratings and sessions become lessons you approve, so SYNTH keeps getting better at your work.', Flask]].map(([k, t, d, I], i) => (
            <Reveal key={k} delay={i * 120} variant="up"><Card className="pillar"><span className="pi"><I width="24" height="24" /></span><small>{k}</small><h3>{t}</h3><p>{d}</p></Card></Reveal>
          ))}
        </div>
      </section>

      {/* DEMO */}
      <section className="sec">
        <Reveal><h2 className="left">Watch it <span className="gt">build</span></h2></Reveal>
        <Reveal delay={100}><p className="lead left">From one sentence to a working page, streamed live.</p></Reveal>
        <Reveal variant="scale" delay={150}><DemoWindow /></Reveal>
      </section>

      {/* HOW */}
      <section className="sec" id="how">
        <Reveal><h2 className="center">From idea to <span className="gt">live app</span></h2></Reveal>
        <Reveal delay={100}><p className="lead center">Four steps, all in one place.</p></Reveal>
        <Reveal variant="up" delay={150}><Flow /></Reveal>
      </section>

      {/* BENTO */}
      <section className="sec">
        <Reveal><h2 className="center">Everything in <span className="gt">one space</span></h2></Reveal>
        <div className="bento">
          {[['b4', 'Previews and source projects', 'Stream and refine browser projects, or export multi-file Python, Rust, Go, C++ and backend source packages.', <MockBuilder />],
            ['b2', 'Reads images', 'Screenshots, charts and sketches in, working pages out.', <MockVision />],
            ['b2', 'Never stuck', 'If one engine is busy, SYNTH tries the next available option.', <MockFallback />],
            ['b2', 'Learns from use', 'Lessons from sessions and other agents, approved by you.', <MockLearn />],
            ['b2', 'You see everything', 'The SYNTH Learning Studio shows ratings, focus areas and reviewed lessons.', <MockAdmin />],
            ['b6', 'Responsive everywhere', 'The workspace and every page you build adapt to phone, tablet and desktop.', <MockDevices />]].map(([c, t, d, v], i) => (
            <Reveal key={t} className={'bc ' + c} delay={(i % 3) * 100} variant="up"><Card className="bcard"><div className="bvis">{v}</div><h3>{t}</h3><p>{d}</p></Card></Reveal>
          ))}
        </div>
      </section>

      {/* EVOLVE */}
      <section className="sec evolve" id="evolve">
        <Reveal variant="left"><EvolveLoop /></Reveal>
        <div>
          <Reveal><h2 className="left">An assistant that <span className="gt">evolves</span></h2></Reveal>
          <Reveal delay={100}><p className="lead left">SYNTH&apos;s learning memory grows with every approved lesson.</p></Reveal>
          <ol className="steps4">
            {[['Use', 'Every chat and build is logged, with emails and numbers stripped.'], ['Rate', 'Helpful or not helpful. Errors count against it.'], ['Learn', 'A daily job turns patterns into lessons and flags weak areas.'], ['Approve', 'You review lessons before they ever reach a prompt.']].map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 110} variant="right"><b>{t}</b><span>{d}</span></Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* STATS */}
      <section className="sec stats">
        {[[0, '$', '', 'SYNTH subscription required'], [3, '', '', 'SYNTH experiences in one workspace'], [4, '', '', 'images per message'], [24, '', 'h', 'learning cycle']].map(([n, p, s, l], i) => (
          <Reveal key={l} delay={i * 100} className="stat"><b><CountUp to={n} prefix={p} suffix={s} /></b><span>{l}</span></Reveal>
        ))}
      </section>

      {/* FAQ */}
      <section className="sec narrow" id="faq">
        <Reveal><h2 className="center">Questions</h2></Reveal>
        {FAQ.map(([q, a], i) => (
          <Reveal key={q} delay={i * 60}><details className="faq"><summary>{q}</summary><p>{a}</p></details></Reveal>
        ))}
      </section>

      {/* CTA */}
      <section className="sec">
        <Reveal variant="scale">
          <div className="cta">
            <div className="blobs" aria-hidden="true"><i className="b1" /><i className="b2" /></div>
            <h2>Ready to <span className="gt2">build</span>?</h2>
            <p>Open the workspace and make something in the next minute.</p>
            <Link href="/app" className="btn big">Open SYNTH workspace <Arrow /></Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="foot">
        <div className="fcols">
          <div><Link href="/" className="logo"><img src="/logo-mark.png" alt="" /><span>SYNTH</span></Link><p>Think. Build. Evolve.</p></div>
          <div><h5>Product</h5><Link href="/app?tab=chat">SYNTH ASSISTANT</Link><Link href="/app?tab=build">SYNTHCODE</Link><a href="#features">Features</a></div>
          <div><h5>Learn</h5><a href="#how">How it works</a><a href="#evolve">How it evolves</a><a href="#faq">FAQ</a><Link href="/dev-updates">Dev updates</Link></div>
        </div>
        <p className="fine">Requests and ratings are logged to help SYNTH improve. Please don&apos;t enter personal or confidential data.</p>
        <Wordmark text="SYNTH" />
      </footer>
    </div>
  );
}
