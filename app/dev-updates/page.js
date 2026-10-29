import Link from 'next/link';
import { updates, formatDate } from './data';

// Server component, so it can export metadata. Do not add "use client" to this file.
export const metadata = {
    title: 'Dev updates | SYNTH',
    description: 'What is new in SYNTH: features, fixes and the thinking behind them.',
};

export default function DevUpdatesPage() {
    return (
        <>
            <section className="du-hero">
                <p className="du-eyebrow">Dev updates</p>
                <h1>What we are building</h1>
                <p className="du-lead">Features, fixes and the thinking behind them, newest first.</p>
            </section>
            <section className="du-grid" aria-label="Updates">
                {updates.map((u) => (
                    <article key={u.slug} className="du-card">
                        <div className="du-meta">
                            <time dateTime={u.date}>{formatDate(u.date)}</time>
                            <ul className="du-tags">{u.tags.map((t) => <li key={t}>{t}</li>)}</ul>
                        </div>
                        <h2>{u.title}</h2>
                        <p>{u.summary}</p>
                        <Link href={`/dev-updates/${u.slug}`} className="du-btn">Read more <span aria-hidden="true">→</span></Link>
                    </article>
                ))}
            </section>
        </>
    );
}
