// Provider health for the Learning Studio, from configuration and recent request diagnostics (newest first).
export function providerHealth(cfg, entries) {
  const stat = (provider) => {
    const served = entries.filter((entry) => entry.provider === provider && entry.status !== 'Failed');
    const failed = entries.reduce((count, entry) => count + (entry.fails || []).filter((failure) => failure.provider === provider).length, 0);
    return { served: served.length, failed, lastOk: served[0]?.ts || null };
  };
  const broken = (summary) => summary.failed >= 3 && summary.failed > summary.served;
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
    openrouter: { ...openrouter, ...or },
    spark: { ...spark, ...sp },
    cloudflare: { ...cloudflare, ...cf },
    unorouter: { ...unorouter, ...uno },
    apinex: { ...apinex, ...ap },
  };
}
