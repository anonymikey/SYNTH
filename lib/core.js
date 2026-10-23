// SYNTHCORE: the knowledge SYNTH accumulates from real use. Models are NOT retrained; this records which model
// handled which task, how reliably, how fast, how users rated it, and which lessons it authored.
import { hincr, hall, putTemp, getTemp } from './db';

const KEY = 'core:stats'; // fields: "<task>|<node>|<metric>", metric = n | fail | fb | ms | up | down

// task key -> [label, lane]
export const TASKS = {
  general: ['General questions', 'chat'],
  writing: ['Writing and drafting', 'chat'],
  'coding-help': ['Coding help in chat', 'chat'],
  summary: ['Summarising', 'chat'],
  translation: ['Translation', 'chat'],
  analysis: ['Analysis and reasoning', 'chat'],
  'image-reading': ['Reading images', 'vision'],
  'new-build': ['Building new pages', 'code'],
  'edit-build': ['Editing pages', 'code'],
};
// Targets for 100% readiness. Adjust to taste.
export const TARGET = { served: 1000, perTask: 30, ratings: 50, lessons: 50 };

const RULES = [
  ['translation', /\btranslat/i],
  ['summary', /\b(summar|tl;?dr|key points|shorten)/i],
  ['coding-help', /\b(code|function|bug|error|exception|stack ?trace|regex|sql|python|javascript|typescript|react|css|html|api|compile|debug)\b/i],
  ['writing', /\b(write|draft|email|letter|essay|poem|story|rewrite|proofread|cover letter|caption)\b/i],
  ['analysis', /\b(analy[sz]e|compare|calculate|solve|equation|data|pros and cons|evaluate)\b/i],
];
export function classify(text, { mode, hasImg, edit }) {
  if (mode === 'build') return edit ? 'edit-build' : 'new-build';
  if (hasImg) return 'image-reading';
  const t = String(text || '').slice(0, 600);
  for (const [k, re] of RULES) if (re.test(t)) return k;
  return 'general';
}

export async function record({ tid, task, via, ms, fallback }) {
  try {
    const k = `${task}|${via}|`;
    await Promise.all([
      hincr(KEY, k + 'n'), hincr(KEY, k + 'ms', ms), fallback ? hincr(KEY, k + 'fb') : null,
      putTemp('sp:' + tid, { via, task }),
    ].filter(Boolean));
  } catch {}
}
export async function recordFail(task, label) { try { await hincr(KEY, `${task}|${label}|fail`); } catch {} }

// Adjusts up/down counters when a rating changes (prev/next are -1, 0 or 1).
export async function rating(tid, prev, next) {
  try {
    const s = await getTemp('sp:' + tid);
    if (!s) return;
    const k = `${s.task}|${s.via}|`;
    const ops = [];
    if (prev === 1) ops.push(hincr(KEY, k + 'up', -1));
    if (prev === -1) ops.push(hincr(KEY, k + 'down', -1));
    if (next === 1) ops.push(hincr(KEY, k + 'up', 1));
    if (next === -1) ops.push(hincr(KEY, k + 'down', 1));
    await Promise.all(ops);
  } catch {}
}

export async function summary(allLessons = []) {
  const h = await hall(KEY);
  const models = {};
  const tasks = Object.fromEntries(Object.keys(TASKS).map((k) => [k, 0]));
  let served = 0, up = 0, down = 0;
  for (const [f, raw] of Object.entries(h)) {
    const parts = f.split('|');
    if (parts.length < 3) continue;
    const task = parts[0], metric = parts[parts.length - 1], via = parts.slice(1, -1).join('|');
    const v = Math.max(0, Number(raw) || 0);
    const m = (models[via] ||= { id: via, served: 0, fail: 0, fb: 0, ms: 0, up: 0, down: 0, tasks: {} });
    const t = (m.tasks[task] ||= { n: 0, fail: 0 });
    if (metric === 'n') { m.served += v; t.n += v; served += v; if (task in tasks) tasks[task] += v; }
    else if (metric === 'fail') { m.fail += v; t.fail += v; }
    else if (metric === 'fb') m.fb += v;
    else if (metric === 'ms') m.ms += v;
    else if (metric === 'up') { m.up += v; up += v; }
    else if (metric === 'down') { m.down += v; down += v; }
  }
  const authored = {};
  allLessons.forEach((l) => { if (l.by) authored[l.by] = (authored[l.by] || 0) + 1; });

  const rows = Object.values(models).map((m) => {
    const abilities = Object.entries(m.tasks)
      .filter(([k, t]) => TASKS[k] && t.n >= 5 && t.n / (t.n + t.fail) >= 0.7)
      .map(([k, t]) => ({ task: k, label: TASKS[k][0], n: t.n, pct: Math.round((100 * t.n) / (t.n + t.fail)), strong: t.n >= 25 && t.n / (t.n + t.fail) >= 0.9 }))
      .sort((a, b) => b.n - a.n);
    const rated = m.up + m.down;
    return {
      id: m.id, served: m.served, fail: m.fail, fallbacks: m.fb,
      share: served ? Math.round((1000 * m.served) / served) / 10 : 0,
      success: m.served + m.fail ? Math.round((100 * m.served) / (m.served + m.fail)) : null,
      helpful: rated ? Math.round((100 * m.up) / rated) : null, ratings: rated,
      avgMs: m.served ? Math.round(m.ms / m.served) : null,
      lessons: authored[m.id] || 0, abilities,
    };
  }).sort((a, b) => b.served - a.served || b.fail - a.fail);

  const rated = up + down;
  const approvedN = allLessons.filter((l) => l.status === 'approved').length;
  const keys = Object.keys(TASKS);
  const coverage = keys.reduce((a, k) => a + Math.min(1, tasks[k] / TARGET.perTask), 0) / keys.length;
  const parts = [
    { name: 'Experience', weight: 40, value: Math.min(1, served / TARGET.served), detail: `${served} of ${TARGET.served} successful tasks` },
    { name: 'Task coverage', weight: 30, value: coverage, detail: `${keys.filter((k) => tasks[k] >= TARGET.perTask).length} of ${keys.length} task types have ${TARGET.perTask}+ samples` },
    { name: 'Quality', weight: 20, value: rated ? (up / rated) * Math.min(1, rated / TARGET.ratings) : 0, detail: rated ? `${Math.round((100 * up) / rated)}% helpful over ${rated} ratings (full weight at ${TARGET.ratings})` : 'No ratings yet' },
    { name: 'Knowledge', weight: 10, value: Math.min(1, approvedN / TARGET.lessons), detail: `${approvedN} of ${TARGET.lessons} approved lessons` },
  ];
  const pct = Math.round(parts.reduce((a, p) => a + p.weight * p.value, 0));
  return {
    models: rows.slice(0, 30),
    tasks: keys.map((k) => ({ key: k, label: TASKS[k][0], lane: TASKS[k][1], n: tasks[k], pct: Math.round(100 * Math.min(1, tasks[k] / TARGET.perTask)) })),
    readiness: { pct, label: pct < 25 ? 'Collecting data' : pct < 60 ? 'Learning' : pct < 90 ? 'Maturing' : 'Ready to launch', parts: parts.map((p) => ({ name: p.name, weight: p.weight, pct: Math.round(100 * p.value), detail: p.detail })) },
    totals: { served, rated, helpful: rated ? Math.round((100 * up) / rated) : null },
    targets: TARGET,
  };
}
