const WINDOW_MS = 15 * 60 * 1000;
const FUTURE_SKEW_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const HISTORY_DAYS = 90;
const MAX_RETAINED_EVENTS = 500;
const MAX_MEASURED_MS = 300_000;
const KNOWN_OUTCOMES = new Set(['Success', 'Fallback', 'Failed']);

const SERVICE_DEFINITIONS = [
  { id: 'assistant', label: 'SYNTH Assistant', metricLabel: 'Avg. time to first response', matches: (event) => event.serviceId === 'assistant' },
  { id: 'synthcode', label: 'SYNTHCODE', metricLabel: 'Avg. time to first response', matches: (event) => event.serviceId === 'synthcode' },
  { id: 'image', label: 'Image creation', metricLabel: 'Avg. processing time', matches: (event) => event.serviceId === 'image' },
  { id: 'voice', label: 'Voice transcription', metricLabel: 'Avg. processing time', matches: (event) => event.serviceId === 'voice' },
];

function dayKey(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function emptyCounts() {
  return { total: 0, success: 0, fallback: 0, failed: 0, measuredMs: 0, measuredCount: 0 };
}

function addEvent(counts, event) {
  counts.total += 1;
  counts[event.outcome] += 1;
  const hasMeasuredDuration = event.ms !== null;
  const hasFirstResponse = event.serviceId === 'image' || event.serviceId === 'voice' || event.outcome !== 'failed';
  if (hasMeasuredDuration && hasFirstResponse) {
    counts.measuredMs += event.ms;
    counts.measuredCount += 1;
  }
}

function average(counts) {
  return counts.measuredCount ? Math.round(counts.measuredMs / counts.measuredCount) : null;
}

function stateFor(counts) {
  if (!counts.total) return 'unknown';
  const responded = counts.success + counts.fallback;
  if (counts.failed >= 3 && counts.failed > responded) return 'outage';
  if (counts.failed || counts.fallback) return 'degraded';
  return 'operational';
}

function normalizeEvent(entry, now) {
  if (!entry || !KNOWN_OUTCOMES.has(entry.status)) return null;
  const ts = Number(entry.ts);
  if (!Number.isFinite(ts) || ts <= 0 || ts > now + FUTURE_SKEW_MS) return null;
  let serviceId = '';
  if (entry.task === 'image-generation') serviceId = 'image';
  else if (entry.task === 'speech-to-text') serviceId = 'voice';
  else if (entry.mode === 'build') serviceId = 'synthcode';
  else if (entry.mode === 'chat') serviceId = 'assistant';
  if (!serviceId) return null;
  const msValue = Number(entry.ms);
  const ms = Number.isFinite(msValue) && msValue >= 0 ? Math.min(MAX_MEASURED_MS, Math.round(msValue)) : null;
  return { serviceId, ts, outcome: entry.status.toLowerCase(), ms };
}

function publicCounts(counts) {
  const responded = counts.success + counts.fallback;
  return {
    requests: counts.total,
    responded,
    direct: counts.success,
    recovered: counts.fallback,
    failed: counts.failed,
    responseRatePct: counts.total ? Math.round((responded / counts.total) * 100) : null,
    averageMs: average(counts),
  };
}

export function aggregateStatus(entries = [], now = Date.now()) {
  const reference = Number.isFinite(Number(now)) ? Number(now) : Date.now();
  const rawEntries = Array.isArray(entries) ? entries.slice(0, MAX_RETAINED_EVENTS) : [];
  const events = rawEntries.map((entry) => normalizeEvent(entry, reference)).filter(Boolean);
  const firstDay = Date.UTC(new Date(reference).getUTCFullYear(), new Date(reference).getUTCMonth(), new Date(reference).getUTCDate()) - (HISTORY_DAYS - 1) * DAY_MS;
  const days = Array.from({ length: HISTORY_DAYS }, (_, index) => dayKey(firstDay + index * DAY_MS));
  const lowerBound = reference - WINDOW_MS;
  const recentEvents = events.filter((event) => event.ts >= lowerBound && event.ts <= reference + FUTURE_SKEW_MS);
  const services = SERVICE_DEFINITIONS.map((definition) => {
    const matching = events.filter((event) => definition.matches(event));
    const recent = matching.filter((event) => event.ts >= lowerBound && event.ts <= reference + FUTURE_SKEW_MS);
    const currentCounts = recent.reduce((counts, event) => { addEvent(counts, event); return counts; }, emptyCounts());
    const daily = new Map(days.map((date) => [date, emptyCounts()]));
    for (const event of matching) {
      const key = dayKey(event.ts);
      const counts = daily.get(key);
      if (counts) addEvent(counts, event);
    }
    const latest = matching.reduce((latestTs, event) => Math.max(latestTs, event.ts), 0);
    const state = stateFor(currentCounts);
    return {
      id: definition.id,
      label: definition.label,
      metricLabel: definition.metricLabel,
      state,
      current: { ...publicCounts(currentCounts), state, lastRoutedAt: latest || null },
      history: days.map((date) => {
        const counts = daily.get(date);
        return { date, state: stateFor(counts), ...publicCounts(counts) };
      }),
    };
  });
  const totalCounts = recentEvents.reduce((counts, event) => { addEvent(counts, event); return counts; }, emptyCounts());
  const activeStates = services.map((service) => service.state).filter((state) => state !== 'unknown');
  const overallState = activeStates.includes('outage') ? 'outage'
    : activeStates.includes('degraded') ? 'degraded'
      : activeStates.includes('operational') ? 'operational' : 'unknown';
  const validTimestamps = events.map((event) => event.ts);
  return {
    generatedAt: reference,
    windowMinutes: 15,
    historyDays: HISTORY_DAYS,
    coverage: {
      recordsAnalyzed: rawEntries.length,
      mayBeTruncated: rawEntries.length >= MAX_RETAINED_EVENTS,
      oldestRecordAt: validTimestamps.length ? Math.min(...validTimestamps) : null,
      limit: MAX_RETAINED_EVENTS,
    },
    overall: { state: overallState, ...publicCounts(totalCounts) },
    services,
  };
}
