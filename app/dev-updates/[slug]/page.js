import Link from 'next/link';
import { notFound } from 'next/navigation';
import { updates, getUpdate, formatDate } from '../data';

// Server component: it reads the slug from the URL and renders one update. Do not add "use client" to this file.
export function generateStaticParams() {
    return updates.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }) {
    const { slug } = await params;
    const u = getUpdate(slug);
    if (!u) return { title: 'Update not found | SYNTH' };
    return { title: `${u.title} | SYNTH dev updates`, description: u.summary };
}

export default async function DevUpdatePage({ params }) {
    const { slug } = await params;
    const u = getUpdate(slug);
    if (!u) notFound();

    const i = updates.indexOf(u);
    const newer = updates[i - 1], older = updates[i + 1];
    return (
        <article className="du-article">
            <Link href="/dev-updates" className="du-back"><span aria-hidden="true">←</span> All updates</Link>
            <div className="du-meta">
                <time dateTime={u.date}>{formatDate(u.date)}</time>
                <ul className="du-tags">{u.tags.map((t) => <li key={t}>{t}</li>)}</ul>
            </div>
            <h1>{u.title}</h1>
            <p className="du-lead">{u.summary}</p>
            <div className="du-body">{u.content.map((p, k) => <p key={k}>{p}</p>)}</div>
            <nav className="du-pager" aria-label="More updates">
                {newer ? <Link href={`/dev-updates/${newer.slug}`}><small>Newer</small><span>{newer.title}</span></Link> : <span />}
                {older ? <Link href={`/dev-updates/${older.slug}`} className="next"><small>Older</small><span>{older.title}</span></Link> : <span />}
            </nav>
        </article>
    );
}
