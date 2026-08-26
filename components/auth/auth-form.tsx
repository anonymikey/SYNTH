"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function safeError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) return "Invalid email or password.";
  if (lower.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (lower.includes("password") && lower.includes("characters")) return "Choose a stronger password.";
  if (lower.includes("rate limit") || lower.includes("too many")) return "Too many attempts. Please try again later.";
  return "Something went wrong. Please try again.";
}

export function AuthForm({ mode }: { mode: "login" | "signup" | "forgot" | "reset" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage(""); setPending(true);
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        window.location.assign("/app");
      } else if (mode === "signup") {
        if (password !== confirmation) throw new Error("Passwords do not match");
        const { data, error: authError } = await supabase.auth.signUp({ email, password, options: { data: { display_name: displayName }, emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback` } });
        if (authError) throw authError;
        setMessage(data.session ? "Account created. Redirecting…" : "Check your email to confirm your SYNTH account.");
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback?next=/auth/reset-password` });
        if (authError) throw authError;
        setMessage("If an account exists for that email, a reset link is on its way.");
      } else {
        if (password !== confirmation) throw new Error("Passwords do not match");
        const { error: authError } = await supabase.auth.updateUser({ password });
        if (authError) throw authError;
        setMessage("Password updated. You can now sign in.");
      }
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : "";
      setError(text === "Passwords do not match" ? text : safeError(text));
    } finally { setPending(false); }
  }

  const titles = { login: "Welcome back", signup: "Create your workspace", forgot: "Recover access", reset: "Set a new password" };
  const descriptions = { login: "Sign in to continue building with SYNTH.", signup: "A focused AI workspace for people who ship.", forgot: "Enter your email and we’ll send a secure reset link.", reset: "Choose a strong password for your account." };
  const submitLabels = { login: "Sign in", signup: "Create account", forgot: "Send reset link", reset: "Update password" };
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-12 synth-grid">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card/90 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
        <Link href="/" className="font-heading text-sm font-bold tracking-[0.18em] text-synth-cyan">SYNTH</Link>
        <div className="mt-10 flex flex-col gap-2"><h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">{titles[mode]}</h1><p className="text-sm leading-6 text-muted-foreground">{descriptions[mode]}</p></div>
        <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
          {mode === "signup" && <label className="flex flex-col gap-2 text-sm font-medium">Display name<Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} required autoComplete="name" /></label>}
          {mode !== "reset" && <label className="flex flex-col gap-2 text-sm font-medium">Email<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></label>}
          {mode !== "forgot" && <label className="flex flex-col gap-2 text-sm font-medium">Password<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>}
          {(mode === "signup" || mode === "reset") && <label className="flex flex-col gap-2 text-sm font-medium">Confirm password<Input type="password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required minLength={8} autoComplete="new-password" /></label>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-synth-success">{message}</p>}
          <Button type="submit" disabled={pending} className="mt-2 h-11 bg-synth-cyan font-bold text-primary-foreground hover:brightness-110">{pending ? "Working…" : submitLabels[mode]}</Button>
        </form>
        <div className="mt-7 flex flex-col gap-3 text-center text-sm text-muted-foreground">
          {mode === "login" && <><Link href="/auth/forgot-password" className="text-synth-cyan hover:underline">Forgot password?</Link><span>New to SYNTH? <Link href="/auth/signup" className="text-foreground hover:text-synth-cyan">Create an account</Link></span></>}
          {mode === "signup" && <span>Already have an account? <Link href="/auth/login" className="text-foreground hover:text-synth-cyan">Sign in</Link></span>}
          {(mode === "forgot" || mode === "reset") && <Link href="/auth/login" className="text-synth-cyan hover:underline">Back to sign in</Link>}
        </div>
      </section>
    </main>
  );
}
