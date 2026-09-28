"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    const response = await fetch("/api/admin/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret }) });
    if (response.ok) router.replace("/admin/models"); else setError("Invalid administrator credentials.");
    setPending(false);
  }
  return <main className="flex min-h-screen items-center justify-center bg-muted/30 px-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>SYNTH Admin Access</CardTitle><CardDescription>Enter the administrator secret to access private operations.</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="flex flex-col gap-4"><Input autoFocus type="password" value={secret} onChange={(event) => setSecret(event.target.value)} aria-label="Administrator secret" autoComplete="current-password" /><Button type="submit" disabled={!secret || pending}>{pending ? "Verifying…" : "Continue"}</Button>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</form></CardContent></Card></main>;
}
