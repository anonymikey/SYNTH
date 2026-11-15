'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

const REFRESH_MS = 15_000;
const STATE_COPY = {
  operational: ['operational', 'Operational signal'],
  degraded: ['degraded', 'Recovery or failures observed'],
  outage: ['outage', 'Repeated route failures'],
  unknown: ['unknown', 'No recent activity'],
};

function formatTime(timestamp) {
  if (!Number.isFinite(Number(timestamp)) || Number(timestamp) <= 0) return '—';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' }).format(new Date(Number(timestamp)));
}

function formatDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ''))) return 'Unknown day';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`));
}

function formatDuration(ms) {
  if (ms == null || ms === '' || !Number.isFinite(Number(ms)) || Number(ms) < 0) return '—';
  return Number(ms) < 1000 ? `${Math.round(Number(ms))} ms` : `${(Number(ms) / 1000).toFixed(1)} s`;
}

function barDescription(bar) {
  const date = formatDate(bar.date);
  if (!bar.requests) return `${date}: no recorded requests; this is not an uptime check.`;
  const state = bar.state === 'operational' ? 'normal routed responses'
    : bar.state === 'degraded' ? 'fallback or failed routes observed'
      : bar.state === 'outage' ? 'repeated route failures observed' : 'no recent activity';
  return `${date}: ${state}. ${bar.requests} recorded routes; ${bar.direct} direct responses, ${bar.recovered} recovered responses, ${bar.failed} failed routes${bar.averageMs == null ? '.' : `; average ${formatDuration(bar.averageMs)}.`}`;
}

function StatusBadge({ state, label }) {
  const [tone, defaultLabel] = STATE_COPY[state] || STATE_COPY.unknown;
  return <span className={`status-badge status-${tone}`}><i aria-hidden="true" />{label || defaultLabel}</span>;
}

function StatusIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="status-refresh-icon"><path d="M16.5 7.5A6.8 6.8 0 0 0 4.8 5.3L3.2 7M3.2 7V3.8M3.2 7h3.2M3.5 12.5a6.8 6.8 0 0 0 11.7 2.2l1.6-1.7m0 0v3.2m0-3.2h-3.2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export default function StatusDashboard() {
  const [snapshot, setSnapshot] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestInFlight = useRef(false);
  const hasSnapshot = useRef(false);

  const refresh = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setRefreshing(true);
    try {
      const response = await fetch('/api/status', { cache: 'no-store' });
      if (!response.ok) throw new Error('unavailable');
      const next = await response.json();
      if (!Number.isFinite(Number(next.generatedAt)) || !Array.isArray(next.services) || !next.overall) throw new Error('invalid');
      setSnapshot(next);
      hasSnapshot.current = true;
      setError('');
    } catch {
      setError(hasSnapshot.current ? 'Live update failed. Showing the latest available snapshot.' : 'Live status data is temporarily unavailable.');
    } finally {
      requestInFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refreshIfVisible();
    const timer = window.setInterval(refreshIfVisible, REFRESH_MS);
    document.addEventListener('visibilitychange', refreshIfVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [refresh]);

  const overallState = snapshot?.overall?.state || 'unknown';
  const [overallTone, overallDefault] = STATE_COPY[overallState] || STATE_COPY.unknown;
  const overallLabel = snapshot
    ? (overallState === 'operational' ? 'Recent routed requests responded normally'
      : overallState === 'degraded' ? 'Some recent requests needed recovery'
        : overallState === 'outage' ? 'Repeated routed-request failures observed'
          : 'Waiting for recent routed requests')
    : 'Live status unavailable';
  const rows = snapshot?.services?.length ? snapshot.services : [];

  return (
    <main className="status-page">
      <div className="status-grain" aria-hidden="true" />
      <div className="status-shell">
        <header className="status-header">
          <Link href="/" className="status-brand" aria-label="SYNTH home">
            <img src="/logo-mark.png" alt="" width="44" height="44" />
            <span><b>SYNTH</b><small>THINK · BUILD · EVOLVE</small></span>
          </Link>
          <div className="status-header-actions">
            <Link className="status-home-link" href="/app">Open workspace</Link>
            <button className="status-refresh" type="button" onClick={refresh} disabled={refreshing}>
              <StatusIcon />{refreshing ? 'Updating…' : 'Refresh now'}
            </button>
          </div>
        </header>

        <section className="status-intro" aria-labelledby="status-title">
          <div>
            <p className="status-eyebrow"><span className="status-live-dot" />LIVE SERVICE SIGNALS</p>
            <h1 id="status-title">SYNTH system status</h1>
            <p className="status-lede">A live view of recent SYNTH request routing and service responses.</p>
          </div>
          <div className="status-updated" role="status" aria-live="polite">
            <span>{refreshing ? 'Refreshing snapshot' : 'Last updated'}</span>
            <b>{snapshot ? formatTime(snapshot.generatedAt) : 'Waiting for data'}</b>
            <small>Auto-refreshes every 15 seconds while this page is visible</small>
          </div>
        </section>

        <section className={`status-overall status-${overallTone}`} aria-live="polite" aria-atomic="true">
          <div className="status-overall-mark" aria-hidden="true"><i /><i /><i /></div>
          <div><span>Current observed status</span><h2>{overallLabel}</h2></div>
          <span className="status-overall-window">Last 15 minutes</span>
        </section>

        {error && <p className="status-error" role="status">{error}</p>}

        {snapshot && (
          <section className="status-metrics" aria-label="Recent routed request metrics">
            <article><span>Observed routes</span><b>{snapshot.overall.requests}</b><small>in the last 15 minutes</small></article>
            <article><span>Routed response rate</span><b>{snapshot.overall.responseRatePct == null ? '—' : `${snapshot.overall.responseRatePct}%`}</b><small>direct and recovered routes</small></article>
            <article><span>Direct responses</span><b>{snapshot.overall.direct}</b><small>without fallback</small></article>
            <article><span>Failed routes</span><b>{snapshot.overall.failed}</b><small>no response route recorded</small></article>
          </section>
        )}

        <div className="status-section-heading">
          <div><p className="status-eyebrow">SERVICE DETAIL</p><h2>Observed request health</h2></div>
          <span>Current signal · 15-minute window</span>
        </div>

        {!snapshot && (
          <div className="status-empty" role="status">
            <span className="status-empty-orb" aria-hidden="true" />
            <b>Waiting for shared service telemetry</b>
            <p>When persistent telemetry is available, this page will show real routed outcomes. It will not substitute a probe or assume a service is healthy.</p>
          </div>
        )}

        {snapshot && rows.map((service) => {
          const [tone, defaultLabel] = STATE_COPY[service.state] || STATE_COPY.unknown;
          const current = service.current || {};
          return (
            <article className="status-service-card" key={service.id} aria-labelledby={`status-service-${service.id}`}>
              <div className="status-service-top">
                <div className="status-service-name">
                  <span className={`status-service-glyph glyph-${service.id}`} aria-hidden="true"><i /></span>
                  <div><h3 id={`status-service-${service.id}`}>{service.label}</h3><span>Observed routed outcomes · last 15 min</span></div>
                </div>
                <StatusBadge state={service.state} label={service.state === 'operational' ? 'Operational signal' : defaultLabel} />
              </div>

              <div className="status-service-metrics">
                <div><span>Routes observed</span><b>{current.requests || 0}</b></div>
                <div><span>Routed response rate</span><b>{current.responseRatePct == null ? '—' : `${current.responseRatePct}%`}</b></div>
                <div><span>{service.metricLabel}</span><b>{formatDuration(current.averageMs)}</b></div>
                <div><span>Recovery routes</span><b>{current.recovered || 0}</b></div>
              </div>

              <div className="status-history-heading">
                <div><h4>90-day observed history</h4><p>Daily request outcomes from retained records</p></div>
                <span>{service.history?.reduce((sum, day) => sum + day.requests, 0) || 0} records shown</span>
              </div>
              <div className="status-history-viewport" aria-label={`${service.label} 90-day observed history; scroll horizontally on small screens`}>
                <div className="status-history-bars" role="list" aria-label={`${service.label} daily request outcomes for the past 90 days`}>
                  {(service.history || []).map((bar) => (
                    <span
                      key={bar.date}
                      className={`status-history-bar bar-${bar.state}`}
                      role="listitem"
                      tabIndex={0}
                      title={barDescription(bar)}
                      aria-label={barDescription(bar)}
                    />
                  ))}
                </div>
              </div>
              <div className="status-history-axis"><span>90 days ago</span><span><i className="legend-dot bar-operational" />Observed normal <i className="legend-dot bar-degraded" />Recovery or error <i className="legend-dot bar-outage" />Repeated failures <i className="legend-dot bar-unknown" />No record</span><span>Today · UTC</span></div>
              <p className="status-service-foot">Last routed request: {current.lastRoutedAt ? formatTime(current.lastRoutedAt) : 'No request recorded in retained history'}{current.requests ? ` · ${current.direct} direct, ${current.recovered} recovered, ${current.failed} failed` : ''}</p>
            </article>
          );
        })}

        <aside className="status-integrity-note">
          <span className="status-integrity-icon" aria-hidden="true">i</span>
          <div><b>How to read this page</b><p>Status comes from actual SYNTH routing records—no synthetic provider prompts are sent. The activity log retains at most 500 recent records, so older days may be incomplete. Chat and code averages measure time to the first provider stream from routes that returned one; failed routes have no first-response time. Image and voice averages measure task duration, including failed attempts. Gray bars mean no retained request data, not confirmed uptime. Supporting tools are not separately monitored here.</p></div>
        </aside>

        <footer className="status-footer">
          <Link href="/">SYNTH home</Link><span>·</span><Link href="/dev-updates">Dev updates</Link><span>·</span><span>Observed signals, not an SLA</span>
        </footer>
      </div>
    </main>
  );
}
