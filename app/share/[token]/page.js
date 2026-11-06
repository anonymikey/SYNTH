import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTemp } from '../../../lib/db.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const metadata = {
  title: 'Shared SYNTH response',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

export default async function SharedResponsePage({ params }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) notFound();
  const shared = await getTemp('share:' + token);
  if (!shared?.response || shared.expiresAt <= Date.now()) notFound();
  return (
    <main className="shared-response-page">
      <div className="shared-response-card">
        <p className="shared-response-eyebrow">SYNTH · SHARED RESPONSE</p>
        <h1>One response, shared intentionally.</h1>
        <pre>{shared.response}</pre>
        <p className="shared-response-expiry">This link contains only this response and expires after 24 hours. The original prompt and conversation are not included.</p>
        <Link className="shared-response-home" href="/">Explore SYNTH</Link>
      </div>
    </main>
  );
}
