import Link from 'next/link';

// Shared frame for /dev-updates and every update page. A server component: no hooks, no event handlers.
export default function DevUpdatesLayout({ children }) {
    return (
        <div className="du">
            <header className="du-nav">
                <Link href="/" className="du-logo"><img src="/logo-mark.png" alt="" width="36" height="36" /><span>SYNTH</span></Link>
                <nav className="du-links" aria-label="Main">
                    <Link href="/">Home</Link>
                    <Link href="/dev-updates" className="on">Dev updates</Link>
                    <Link href="/app" className="du-cta">Open workspace</Link>
                </nav>
            </header>
            <main className="du-main">{children}</main>
            <footer className="du-foot">
                <Link href="/" className="du-logo"><img src="/logo-mark.png" alt="" width="30" height="30" /><span>SYNTH</span></Link>
                <p>Think. Build. Evolve.</p>
                <nav aria-label="Footer">
                    <Link href="/">Home</Link>
                    <Link href="/dev-updates">Dev updates</Link>
                    <Link href="/app">Open workspace</Link>
                </nav>
            </footer>
        </div>
    );
}
