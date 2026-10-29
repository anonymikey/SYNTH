import Link from 'next/link';

// Shown when /dev-updates/<slug> has no matching entry (the detail page calls notFound()).
export default function DevUpdateNotFound() {
    return (
        <section className="du-hero">
            <p className="du-eyebrow">404</p>
            <h1>That update does not exist</h1>
            <p className="du-lead">It may have been renamed or removed.</p>
            <Link href="/dev-updates" className="du-btn">See all updates <span aria-hidden="true">→</span></Link>
        </section>
    );
}
