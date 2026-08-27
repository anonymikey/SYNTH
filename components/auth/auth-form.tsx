"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const sourceImage = "/synth-auth-portal.png";

function safeError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) return "Invalid email or password.";
  if (lower.includes("email not confirmed")) return "Please confirm your email before signing in.";
  if (lower.includes("password") && lower.includes("characters")) return "Choose a stronger password.";
  if (lower.includes("rate limit") || lower.includes("too many")) return "Too many attempts. Please try again later.";
  return "Something went wrong. Please try again.";
}

export function AuthForm({ mode }: { mode: "login" | "signup" | "forgot" | "reset" }) {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setPending(true);
    const supabase = createClient();
    try {
      if (mode === "login") {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        window.location.assign("/app");
      } else if (mode === "signup") {
        if (password !== confirmation) throw new Error("Passwords do not match");
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback`,
          },
        });
        if (authError) throw authError;
        setMessage(data.session ? "Account created. Redirecting…" : "Check your email to confirm your SYNTH account.");
      } else if (mode === "forgot") {
        const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ?? `${window.location.origin}/auth/callback?next=/auth/reset-password`,
        });
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
    } finally {
      setPending(false);
    }
  }

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isRecovery = mode === "forgot" || mode === "reset";
  const title = isLogin ? "Welcome back" : isSignup ? "Create your account" : mode === "forgot" ? "Recover access" : "Set a new password";
  const description = isLogin ? "Sign in to continue building with SYNTH." : isSignup ? "Start turning ambitious ideas into shipped work." : mode === "forgot" ? "Enter your email and we’ll send a secure reset link." : "Choose a strong password for your account.";

  return (
    <main className="min-h-screen bg-background p-0 sm:p-4 lg:p-6">
      <section className="mx-auto flex min-h-screen max-w-7xl overflow-hidden border border-border bg-[var(--auth-panel)] shadow-2xl sm:min-h-[calc(100vh-2rem)] sm:rounded-3xl lg:min-h-[calc(100vh-3rem)]">
        <div className="relative hidden min-h-full flex-1 overflow-hidden bg-synth-surface-elevated md:block">
          <img src={sourceImage} alt="A creative mind exploring a luminous virtual world" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />
          <Link href="/" aria-label="Back to SYNTH home" className="focus-ring absolute left-7 top-7 z-10 flex size-11 items-center justify-center rounded-full border border-white/20 bg-background/35 text-white backdrop-blur-md transition hover:bg-background/60">
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div className="absolute bottom-8 left-8 right-8 z-10 text-white">
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold tracking-[0.2em]"><Sparkles aria-hidden="true" className="text-[var(--auth-accent)]" /> SYNTH</div>
            <p className="max-w-md font-heading text-3xl font-semibold leading-tight">Build clearly. Think expansively. Ship what matters.</p>
          </div>
        </div>

        <div className="flex w-full items-center justify-center bg-[var(--auth-panel)] px-6 py-10 font-sans text-[var(--auth-foreground)] [color-scheme:light] sm:px-12 md:w-1/2 md:px-10 lg:px-14 [&_input]:!border-[var(--auth-border)] [&_input]:!bg-[var(--auth-panel)] [&_input]:!text-[var(--auth-foreground)] [&_input]:placeholder:!text-[var(--auth-muted)]">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden"><Link href="/" className="font-heading text-sm font-bold tracking-[0.2em] text-[var(--auth-accent)]">SYNTH</Link></div>
            {!isRecovery && <p className="mb-3 text-sm text-[var(--auth-muted)]">{isLogin ? "Don’t have an account?" : "Already have an account?"} <Link href={isLogin ? "/auth/signup" : "/auth/login"} className="font-semibold text-[var(--auth-accent)] hover:underline">{isLogin ? "Sign up" : "Sign in"}</Link></p>}
            <h1 className="font-heading text-3xl font-bold tracking-tight text-[var(--auth-foreground)] sm:text-4xl">{title}</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--auth-muted)]">{description}</p>

            <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
              {isSignup && <label className="flex flex-col gap-2 text-sm font-medium text-[var(--auth-foreground)]">Display name<Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required autoComplete="name" placeholder="Your name" /></label>}
              {mode !== "reset" && <label className="flex flex-col gap-2 text-sm font-medium text-[var(--auth-foreground)]">Email address<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="you@example.com" /></label>}
              {mode !== "forgot" && <label className="flex flex-col gap-2 text-sm font-medium text-[var(--auth-foreground)]">Password<div className="relative"><Input type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={isLogin ? "current-password" : "new-password"} placeholder="Your password" className="pr-11" /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((current) => !current)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--auth-muted)] hover:text-[var(--auth-foreground)]">{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div></label>}
              {(isSignup || mode === "reset") && <label className="flex flex-col gap-2 text-sm font-medium text-[var(--auth-foreground)]">Confirm password<Input type={showPassword ? "text" : "password"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required minLength={8} autoComplete="new-password" placeholder="Repeat your password" /></label>}
              {isLogin && <div className="flex items-center justify-between gap-4 text-sm"><label className="flex items-center gap-2 text-[var(--auth-muted)]"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="size-4 accent-[var(--synth-cyan)]" /> Remember me</label><Link href="/auth/forgot-password" className="font-semibold text-[var(--auth-accent)] hover:underline">Forgot password?</Link></div>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {message && <p role="status" className="text-sm text-synth-success">{message}</p>}
              <Button type="submit" disabled={pending} className="mt-1 h-12 rounded-xl bg-[var(--auth-foreground)] font-semibold text-[var(--auth-panel)] hover:bg-[var(--auth-foreground)]/90">{pending ? "Working…" : isLogin ? "Sign in" : isSignup ? "Create account" : mode === "forgot" ? "Send reset link" : "Update password"}</Button>
            </form>

            <div className="mt-8 flex items-center gap-3 text-xs text-[var(--auth-muted)]"><span className="h-px flex-1 bg-border" /> <span>{isRecovery ? "SYNTH account recovery" : "Private workspace access"}</span> <span className="h-px flex-1 bg-border" /></div>
            {isRecovery && <Link href="/auth/login" className="mt-6 block text-center text-sm font-semibold text-[var(--auth-accent)] hover:underline">Back to sign in</Link>}
          </div>
        </div>
      </section>
    </main>
  );
}
