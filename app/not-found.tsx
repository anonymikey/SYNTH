import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="font-heading text-4xl font-bold">404</h1>
      <p className="mt-2 text-sm text-muted-foreground">Page not found.</p>
      <Link href="/" className="mt-4 text-sm text-synth-cyan hover:underline">
        Return home
      </Link>
    </div>
  );
}
