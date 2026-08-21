"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/components/theme/theme-provider";
import { iconFor } from "@/lib/icons";
import type { ProviderHealth } from "@/lib/ai/types";

function useProviderStatus() {
  const [health, setHealth] = useState<ProviderHealth[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch("/api/ai/health");
        if (!res.ok || !active) return;
        const data = await res.json();
        const providers: ProviderHealth[] = data.providers ?? [];
        setHealth(providers);
        const anyConnected = providers.some((p) => p.status === "connected" || p.providerId === "mock");
        setConnected(anyConnected);
      } catch {
        if (active) setConnected(false);
      }
    };
    check();
    const interval = setInterval(check, 30_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const primaryProvider = health.find((p) => p.status === "connected" && p.providerId === "openrouter")
    ?? health.find((p) => p.status === "connected")
    ?? health.find((p) => p.providerId === "mock");

  const modelLabel = primaryProvider?.model ?? "No model";
  const providerLabel = primaryProvider?.providerId === "openrouter"
    ? "OpenRouter"
    : primaryProvider?.providerId === "ollama"
      ? "Ollama"
      : primaryProvider?.providerId === "mock"
        ? "Demo"
        : "—";

  return { connected, modelLabel, providerLabel };
}

interface WorkspaceHeaderProps {
  onContextToggle: () => void;
  onOpenCommand: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
}

export function WorkspaceHeader({ onContextToggle, onOpenCommand, onOpenNotifications, onOpenSettings, onOpenAbout }: WorkspaceHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { connected, modelLabel, providerLabel } = useProviderStatus();
  const [workspace, setWorkspace] = useState("ANONYMIKE/LABS");
  const FolderIcon = iconFor("folders");
  const ChevronIcon = iconFor("chevronDown");
  const ActivityIcon = iconFor("activity");
  const SettingsIcon = iconFor("settings");
  const BellIcon = iconFor("bell");
  const SunIcon = iconFor(theme === "dark" ? "sun" : "moon");
  const PanelIcon = iconFor("panelRight");

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:px-5" aria-label="SYNTH workspace toolbar">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-synth-cyan md:hidden" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="max-w-[220px] gap-2 border-border bg-card/60 text-xs font-semibold hover:border-synth-cyan/40">
              <FolderIcon className="size-4 shrink-0 text-synth-cyan" aria-hidden="true" />
              <span className="truncate">{workspace}</span>
              <ChevronIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Switch active workspace</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => { setWorkspace("ANONYMIKE/LABS"); toast.success("ANONYMIKE/LABS workspace selected"); }}>
              <FolderIcon className="size-4 text-synth-cyan" aria-hidden="true" /> ANONYMIKE/LABS
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setWorkspace("SYNTH Sandbox"); toast.success("SYNTH Sandbox workspace selected"); }}>
              <ActivityIcon className="size-4 text-synth-violet" aria-hidden="true" /> SYNTH Sandbox
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="hidden min-w-0 items-center gap-2 sm:flex">
          <span className="h-4 w-px bg-border" />
          <span className="truncate text-[11px] text-muted-foreground">SYNTH Assistant <span className="font-mono text-[10px] text-muted-foreground/60">/ default</span></span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        <Button variant="outline" size="sm" className="hidden border-border bg-card/60 font-mono text-[10px] text-muted-foreground hover:text-synth-cyan sm:inline-flex" onClick={onOpenCommand}>
          Search SYNTH <span className="ml-2 text-[9px]">⌘ K</span>
        </Button>
        <div className="hidden items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 lg:flex">
          <span className={`size-2 rounded-full ${connected ? "bg-synth-success shadow-[0_0_12px_var(--synth-success)]" : "bg-destructive"}`} />
          <span className={`font-mono text-[9px] font-semibold uppercase tracking-[0.14em] ${connected ? "text-synth-success" : "text-destructive"}`}>
            {connected ? "Connected" : "Offline"}
          </span>
          <span className="size-1 rounded-full bg-muted-foreground/60" />
          <span className="font-mono text-[9px] text-muted-foreground">{providerLabel} / {modelLabel}</span>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-sm" className="relative border-border bg-card/60 text-muted-foreground hover:text-synth-cyan" aria-label="Open notifications" onClick={onOpenNotifications}>
              <BellIcon className="size-4" aria-hidden="true" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-synth-violet" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>
        <Button variant="outline" size="icon-sm" className="border-border bg-card/60 text-muted-foreground hover:text-synth-cyan" aria-label="Toggle theme" onClick={toggleTheme}>
          <SunIcon className="size-4" aria-hidden="true" />
        </Button>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-sm" className="border-border bg-card/60 text-muted-foreground hover:text-synth-cyan md:hidden" aria-label="Toggle context panel" onClick={onContextToggle}>
              <PanelIcon className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Context panel</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-9 rounded-full p-0" aria-label="Open ANONYMIKE profile menu">
              <Avatar className="size-8 border border-synth-cyan/35 bg-synth-cyan/10">
                <AvatarFallback className="bg-transparent font-mono text-[10px] text-synth-cyan">AM</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-xs">ANONYMIKE</p>
              <p className="font-mono text-[9px] font-normal uppercase tracking-[0.12em] text-muted-foreground">SYNTH creator profile</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onOpenSettings}><SettingsIcon className="size-4" aria-hidden="true" /> Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={onOpenAbout}><ActivityIcon className="size-4" aria-hidden="true" /> About SYNTH</DropdownMenuItem>
            <DropdownMenuItem className="gap-3" onSelect={(event) => event.preventDefault()}>
              <SunIcon className="size-4" aria-hidden="true" /> Light mode
              <Switch className="ml-auto" checked={theme === "light"} onCheckedChange={() => toggleTheme()} aria-label="Light mode" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
