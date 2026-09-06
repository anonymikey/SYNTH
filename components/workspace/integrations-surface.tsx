"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { iconFor } from "@/lib/icons";

const GITHUB_AUTH_EVENT = "synth:github-authorized";
type Repo = { id: number; fullName: string; private: boolean; defaultBranch: string; description: string | null; updatedAt: string };

type IntegrationCardProps = { icon: string; name: string; description: string; status: "Connected" | "Available" | "Configuration required"; children?: React.ReactNode; action?: React.ReactNode };

function IntegrationCard({ icon, name, description, status, children, action }: IntegrationCardProps) {
  const Icon = iconFor(icon);
  const connected = status === "Connected";
  return <Card className="border-border/70 bg-card/80 transition-colors hover:border-synth-cyan/35">
    <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
      <div className="flex min-w-0 items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40"><Icon className="size-5 text-synth-cyan" strokeWidth={1.8} /></div><div className="min-w-0"><CardTitle className="text-sm">{name}</CardTitle><CardDescription className="mt-1 text-xs leading-5">{description}</CardDescription></div></div>
      <Badge variant="outline" className={connected ? "border-synth-cyan/40 bg-synth-cyan/10 text-synth-cyan" : "text-muted-foreground"}>{status}</Badge>
    </CardHeader>
    {children && <CardContent className="space-y-3 pt-0">{children}</CardContent>}
    {action && <CardContent className="pt-0">{action}</CardContent>}
  </Card>;
}

export function IntegrationsSurface() {
  const [githubConnected, setGithubConnected] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);

  const authorize = useCallback(async () => {
    const response = await fetch("/api/github/authorize");
    if (response.status === 401) { toast.error("Sign in to connect GitHub"); return; }
    if (!response.ok) { toast.error("GitHub authorization is unavailable"); return; }
    const { url } = await response.json() as { url: string };
    if (window.self !== window.top) window.open(url, "_blank", "noopener,noreferrer"); else window.location.href = url;
  }, []);

  const loadRepos = useCallback(async () => {
    setLoading(true);
    const response = await fetch(`/api/github/repos?q=${encodeURIComponent(query)}`);
    const data = await response.json() as { repositories?: Repo[]; needsAuthorization?: boolean };
    setLoading(false);
    if (data.needsAuthorization) { await authorize(); return; }
    if (!response.ok) { toast.error("Could not load GitHub repositories"); return; }
    setRepos(data.repositories ?? []);
    setGithubConnected(true);
  }, [authorize, query]);

  useEffect(() => {
    const onAuthorized = () => { setGithubConnected(true); void loadRepos(); };
    window.addEventListener(GITHUB_AUTH_EVENT, onAuthorized);
    return () => window.removeEventListener(GITHUB_AUTH_EVENT, onAuthorized);
  }, [loadRepos]);

  return <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
    <div className="space-y-2"><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-synth-cyan">Workspace settings</p><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Integrations</h1><p className="max-w-2xl text-sm leading-6 text-muted-foreground">Connect the services SYNTH can use to import context and extend your workspace. Tokens stay managed by the connection layer.</p></div>
    <Separator />
    <section className="space-y-3"><div><h2 className="text-sm font-semibold">Connected</h2><p className="mt-1 text-xs text-muted-foreground">Active connections available to your workspace.</p></div>
      <IntegrationCard icon="github" name="GitHub" description="Import repositories and inspect project context from your account." status={githubConnected ? "Connected" : "Available"}>
        <div className="flex flex-col gap-2 sm:flex-row"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search repositories" aria-label="Search GitHub repositories" /><Button onClick={loadRepos} disabled={loading}>{loading ? "Searching…" : githubConnected ? "Refresh repositories" : "Connect GitHub"}</Button></div>
        {repos.length > 0 && <div className="max-h-56 overflow-y-auto rounded-lg border border-border/70">{repos.map((repo) => <button key={repo.id} type="button" onClick={() => setSelectedRepo(repo)} className="flex w-full items-center justify-between gap-3 border-b border-border/60 px-3 py-2.5 text-left last:border-0 hover:bg-muted/30"><span className="min-w-0"><span className="block truncate text-xs font-medium">{repo.fullName}</span><span className="block truncate text-[11px] text-muted-foreground">{repo.description || `Default branch: ${repo.defaultBranch}`}</span></span><Badge variant="outline" className="shrink-0 text-[9px]">{repo.private ? "Private" : "Public"}</Badge></button>)}</div>}
        <Button variant="ghost" size="sm" className="px-0 text-xs text-muted-foreground hover:text-destructive" onClick={() => setDisconnectOpen(true)}>Disconnect GitHub</Button>
      </IntegrationCard>
    </section>
    <section className="space-y-3"><div><h2 className="text-sm font-semibold">Available</h2><p className="mt-1 text-xs text-muted-foreground">Connect these services when you need them.</p></div><div className="grid gap-4 md:grid-cols-2">
      <IntegrationCard icon="figma" name="Figma" description="Bring design files and links into project context." status="Available" action={<Button variant="outline" size="sm" onClick={() => toast.info("Figma connection setup is coming next")}>Connect Figma</Button>} />
      <IntegrationCard icon="network" name="MCP" description="Connect approved context servers with explicit tool permissions." status="Configuration required" action={<Button variant="outline" size="sm" onClick={() => toast.info("MCP configuration is required before connecting")}>Configure MCP</Button>} />
      <IntegrationCard icon="plug-zap" name="Plugins" description="Extend the workspace with reviewed capabilities." status="Available" action={<Button variant="outline" size="sm" onClick={() => toast.info("Plugin installation is coming next")}>Browse plugins</Button>} />
    </div></section>
    <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}><DialogContent><DialogHeader><DialogTitle>Disconnect GitHub?</DialogTitle><DialogDescription>This removes SYNTH&apos;s access to your GitHub account. Your imported project context remains unchanged.</DialogDescription></DialogHeader><DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button variant="destructive" onClick={() => { setGithubConnected(false); setRepos([]); setDisconnectOpen(false); toast.success("GitHub disconnected"); }}>Disconnect</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={Boolean(selectedRepo)} onOpenChange={(open) => !open && setSelectedRepo(null)}><DialogContent><DialogHeader><DialogTitle>Import repository</DialogTitle><DialogDescription>Review the repository before adding it as a SYNTH project.</DialogDescription></DialogHeader>{selectedRepo && <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm"><p className="font-medium">{selectedRepo.fullName}</p><p className="mt-1 text-xs text-muted-foreground">Branch: {selectedRepo.defaultBranch} · {selectedRepo.private ? "Private" : "Public"}</p></div>}<DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={() => { toast.success(`${selectedRepo?.fullName} is ready to import`); setSelectedRepo(null); }}>Import as SYNTH project</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}
