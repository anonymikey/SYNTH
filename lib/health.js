// Provider health for the Learning Studio, based on live configuration and recent real task outcomes.
const HEALTH_WINDOW_MS = 15 * 60 * 1000;
const FUTURE_SKEW_MS = 60 * 1000;

export function providerHealth(cfg, entries = [], now = Date.now()) {
  const stat = (provider) => {
    const events = [];
    let served = 0;
    let failed = 0;
    let lastOk = null;
    let lastIssue = null;

    for (const entry of entries) {
      const ts = Number(entry.ts) || 0;
      if (entry.provider === provider && entry.status !== 'Failed') {
        served += 1;
        if (!lastOk || ts > lastOk) lastOk = ts;
        events.push({ type: 'success', ts });
      }
      for (const failure of entry.fails || []) {
        if (failure.provider !== provider) continue;
        failed += 1;
        if (!lastIssue || ts > lastIssue.ts) {
          lastIssue = { ts, status: Number(failure.status) || 0, message: String(failure.msg || '').slice(0, 180) };
        }
        events.push({ type: 'failure', ts, status: Number(failure.status) || 0, message: String(failure.msg || '').slice(0, 180) });
      }
    }

    const recentEvents = events
      .filter((event) => event.ts >= now - HEALTH_WINDOW_MS && event.ts <= now + FUTURE_SKEW_MS)
      .sort((a, b) => b.ts - a.ts || (a.type === 'success' ? -1 : 1));
    const recentServed = recentEvents.filter((event) => event.type === 'success').length;
    const recentFailed = recentEvents.filter((event) => event.type === 'failure').length;
    return {
      served,
      failed,
      lastOk,
      lastFailAt: lastIssue?.ts || null,
      lastError: lastIssue?.message || '',
      recentServed,
      recentFailed,
      lastActivity: recentEvents[0]?.ts || null,
      latestRecentEvent: recentEvents[0] || null,
    };
  };

  const broken = (summary) => summary.failed >= 3 && summary.failed > summary.served;
  const status = (provider) => {
    if (provider === 'openrouter') return cfg.openrouter;
    if (provider === 'spark') return cfg.spark;
    if (provider === 'cloudflare') return cfg.cloudflare;
    if (provider === 'unorouter') return cfg.unorouter || 'disabled';
    return cfg.apinex || 'disabled';
  };
  const live = (provider, summary) => {
    const configured = status(provider);
    if (configured === 'disabled') return { state: 'disabled', label: 'Off', tone: 'neutral' };
    if (configured === 'missing') return { state: 'missing', label: 'Needs setup', tone: cfg.active?.length ? 'warn' : 'bad' };
    if (!cfg.active?.includes(provider)) return { state: 'unrouted', label: 'Not in route', tone: 'neutral' };
    if (!summary.latestRecentEvent) return { state: 'idle', label: 'Ready · no recent traffic', tone: 'neutral' };
    if (summary.latestRecentEvent.type === 'success') return { state: 'healthy', label: 'Healthy', tone: 'ok' };
    if (summary.recentFailed >= 3 && summary.recentFailed > summary.recentServed) return { state: 'down', label: 'Down', tone: 'bad' };
    return { state: 'degraded', label: 'Degraded', tone: 'warn' };
  };

  const or = stat('openrouter');
  const sp = stat('spark');
  const cf = stat('cloudflare');
  const uno = stat('unorouter');
  const ap = stat('apinex');
  const notes = [...cfg.notes];

  const openrouter = cfg.openrouter === 'ok'
    ? (broken(or) ? { state: 'warn', label: 'OK, recent errors', tone: 'warn' } : { state: 'ok', label: 'OK', tone: 'ok' })
    : { state: 'missing', label: 'Missing', tone: cfg.active.length ? 'warn' : 'bad' };
  const spark = cfg.spark === 'disabled' ? { state: 'disabled', label: 'Disabled', tone: 'neutral' }
    : cfg.spark === 'missing' ? { state: 'missing', label: 'Missing', tone: 'warn' }
    : broken(sp) ? { state: 'warn', label: 'Enabled, failing', tone: 'warn' }
    : { state: 'enabled', label: 'Enabled', tone: 'ok' };
  const cloudflare = cfg.cloudflare === 'disabled' ? { state: 'disabled', label: 'Disabled', tone: 'neutral' }
    : cfg.cloudflare === 'missing' ? { state: 'missing', label: 'Missing configuration', tone: cfg.active.length ? 'warn' : 'bad' }
    : broken(cf) ? { state: 'warn', label: 'Enabled, recent errors', tone: 'warn' }
    : { state: 'enabled', label: 'Enabled', tone: 'ok' };
  const unorouter = !cfg.unorouter || cfg.unorouter === 'disabled' ? { state: 'disabled', label: 'Disabled', tone: 'neutral' }
    : cfg.unorouter === 'missing' ? { state: 'missing', label: 'Missing configuration', tone: cfg.active.length ? 'warn' : 'bad' }
    : broken(uno) ? { state: 'warn', label: 'Enabled, recent errors', tone: 'warn' }
    : { state: 'enabled', label: 'Enabled · free text only', tone: 'ok' };
  const apinex = !cfg.apinex || cfg.apinex === 'disabled' ? { state: 'disabled', label: 'Disabled', tone: 'neutral' }
    : cfg.apinex === 'missing' ? { state: 'missing', label: 'Missing configuration', tone: cfg.active.length ? 'warn' : 'bad' }
    : broken(ap) ? { state: 'warn', label: 'Enabled, recent errors', tone: 'warn' }
    : { state: 'enabled', label: 'Enabled · free text only', tone: 'ok' };

  if (spark.state === 'warn') notes.push(cfg.active.includes('openrouter') ? 'SPARK is failing right now. SYNTH will try another configured provider.' : 'SPARK is failing right now and no other provider is available.');
  if (cloudflare.state === 'warn') notes.push('Cloudflare Workers AI has recent failures. SYNTH will try the next configured provider.');
  if (unorouter.state === 'warn') notes.push('UnoRouter has recent free-model failures. SYNTH will honor rate-limit cooldowns and try another configured provider.');
  if (apinex.state === 'warn') notes.push('APInex has recent free-model failures. SYNTH will honor account-wide rate and quota cooldowns and try another configured service.');

  return {
    order: cfg.order,
    active: cfg.active,
    notes,
    openrouter: { ...openrouter, ...or, realtime: live('openrouter', or) },
    spark: { ...spark, ...sp, realtime: live('spark', sp) },
    cloudflare: { ...cloudflare, ...cf, realtime: live('cloudflare', cf) },
    unorouter: { ...unorouter, ...uno, realtime: live('unorouter', uno) },
    apinex: { ...apinex, ...ap, realtime: live('apinex', ap) },
  };
}
