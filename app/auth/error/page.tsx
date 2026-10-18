import Link from "next/link";
export default function AuthErrorPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5">
      <section className="flex max-w-md flex-col gap-4 rounded-2xl border border-border bg-card p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-synth-cyan">SYNTH Auth</p>
        <h1 className="font-heading text-2xl font-bold">Authentication Status</h1>
        <p className="text-sm leading-6 text-muted-foreground">Session expired or auth services are running in local demo mode.</p>
        <div className="flex flex-col gap-2 pt-2">
          <Link href="/app" className="rounded-lg bg-synth-cyan px-4 py-2 text-center text-sm font-semibold text-black transition hover:brightness-110">Launch Workspace in Local Mode</Link>
          <Link href="/auth/login" className="text-center text-sm text-synth-cyan hover:underline">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
