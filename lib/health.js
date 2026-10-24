// Provider health for the admin panel, from the configuration and the recent SYNTHSPARK diagnostics log (newest first).
export function providerHealth(cfg, entries) {
  const stat = (p) => {
    const served = entries.filter((e) => e.provider === p && e.status !== 'Failed');
    const failed = entries.reduce((n, e) => n + (e.fails || []).filter((f) => f.provider === p).length, 0);
    return { served: served.length, failed, lastOk: served[0]?.ts || null };
  };
  const broken = (s) => s.failed >= 3 && s.failed > s.served;
  const or = stat('openrouter'), sp = stat('spark');
  const notes = [...cfg.notes];

  const openrouter = cfg.openrouter === 'ok'
    ? (broken(or) ? { state: 'warn', label: 'OK, recent errors', tone: 'warn' } : { state: 'ok', label: 'OK', tone: 'ok' })
    : { state: 'missing', label: 'Missing', tone: cfg.active.length ? 'warn' : 'bad' };
  const spark = cfg.spark === 'disabled' ? { state: 'disabled', label: 'Disabled', tone: 'neutral' }
    : cfg.spark === 'missing' ? { state: 'missing', label: 'Missing', tone: 'warn' }
    : broken(sp) ? { state: 'warn', label: 'Enabled, failing', tone: 'warn' }
    : { state: 'enabled', label: 'Enabled', tone: 'ok' };
  if (spark.state === 'warn') notes.push(cfg.active.includes('openrouter') ? 'SPARK is failing right now. SYNTH is switching to OpenRouter automatically.' : 'SPARK is failing right now and OpenRouter is not available.');

  return { order: cfg.order, active: cfg.active, notes, openrouter: { ...openrouter, ...or }, spark: { ...spark, ...sp } };
}
