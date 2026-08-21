"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/components/theme/theme-provider";
import { iconFor } from "@/lib/icons";
import { useProviderHealth } from "@/lib/hooks/use-provider-health";

function useProviderStatus() {
  const { health, connected } = useProviderHealth();

  const openrouterHealth = health.find((p) => p.providerId === "openrouter");
  const ollamaHealth = health.find((p) => p.providerId === "ollama");
  const mockHealth = health.find((p) => p.providerId === "mock");

  const primaryProvider = openrouterHealth?.status === "connected"
    ? openrouterHealth
    : ollamaHealth?.status === "connected"
      ? ollamaHealth
      : mockHealth;

  const modelLabel = primaryProvider?.model ?? "auto";
  const providerLabel = "SYNTH";

  return { connected, modelLabel, providerLabel };
}

interface WorkspaceHeaderProps {
  /** Current destination for breadcrumb display */
  destination?: string;
  onContextToggle: () => void;
  onOpenCommand: () => void;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
  onOpenAbout: () => void;
}

const DEST_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  assistant: "SYNTH Assistant",
  code: "SYNTH Code",
  agent: "SYNTH Agent",
  docs: "SYNTH Docs",
  search: "SYNTH Search",
  vision: "SYNTH Vision",
  settings: "Settings",
  history: "History",
  projects: "Projects",
  knowledge: "Knowledge",
  skills: "Skills",
  plugins: "Plugins",
};

export function WorkspaceHeader({ destination = "assistant", onContextToggle, onOpenCommand, onOpenNotifications, onOpenSettings, onOpenAbout }: WorkspaceHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { connected, providerLabel } = useProviderStatus();
  const [workspace, setWorkspace] = useState("ANONYMIKE/LABS");
  const FolderIcon = iconFor("folders");
  const ChevronIcon = iconFor("chevronDown");
  const ActivityIcon = iconFor("activity");
  const SettingsIcon = iconFor("settings");
  const BellIcon = iconFor("bell");
  const SunIcon = iconFor(theme === "dark" ? "sun" : "moon");
  const PanelIcon = iconFor("panelRight");

  const destLabel = DEST_LABELS[destination] ?? "SYNTH";

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-3 backdrop-blur-xl sm:px-5" aria-label="SYNTH workspace toolbar">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-synth-cyan md:hidden" />

        {/* Workspace selector — hidden on mobile for dashboard */}
        <div className="hidden items-center gap-2 sm:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="max-w-[200px] gap-1.5 border-border bg-card/60 text-[11px] font-semibold hover:border-synth-cyan/40">
                <FolderIcon className="size-3.5 shrink-0 text-synth-cyan" aria-hidden="true" />
                <span className="truncate">{workspace}</span>
                <ChevronIcon className="size-3 text-muted-foreground" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Switch workspace</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => { setWorkspace("ANONYMIKE/LABS"); toast.success("ANONYMIKE/LABS selected"); }}>
                <FolderIcon className="size-4 text-synth-cyan" aria-hidden="true" /> ANONYMIKE/LABS
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setWorkspace("SYNTH Sandbox"); toast.success("SYNTH Sandbox selected"); }}>
                <ActivityIcon className="size-4 text-synth-violet" aria-hidden="true" /> SYNTH Sandbox
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="h-3.5 w-px bg-border" />
          <span className="truncate text-[11px] text-muted-foreground">{destLabel}</span>
        </div>

        {/* Mobile: just show the current page name */}
        <span className="truncate text-[11px] font-medium text-foreground sm:hidden">{destLabel}</span>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        {/* Search — hidden on small mobile */}
        <Button variant="outline" size="sm" className="hidden border-border bg-card/60 font-mono text-[10px] text-muted-foreground hover:text-synth-cyan sm:inline-flex" onClick={onOpenCommand}>
          Search <span className="ml-1.5 text-[9px]">⌘K</span>
        </Button>

        {/* Provider status — hidden on mobile */}
        <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 lg:flex">
          <span className={`size-1.5 rounded-full ${connected ? "bg-synth-success shadow-[0_0_8px_var(--synth-success)]" : "bg-destructive"}`} />
          <span className={`font-mono text-[8px] font-semibold uppercase tracking-[0.12em] ${connected ? "text-synth-success" : "text-destructive"}`}>
            {connected ? "Online" : "Offline"}
          </span>
          <span className="font-mono text-[8px] text-muted-foreground">{providerLabel}</span>
        </div>

        {/* Notifications */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-sm" className="relative border-border bg-card/60 text-muted-foreground hover:text-synth-cyan" aria-label="Notifications" onClick={onOpenNotifications}>
              <BellIcon className="size-4" aria-hidden="true" />
              <span className="absolute right-1 top-1 size-1 rounded-full bg-synth-violet" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <Button variant="outline" size="icon-sm" className="border-border bg-card/60 text-muted-foreground hover:text-synth-cyan" aria-label="Toggle theme" onClick={toggleTheme}>
          <SunIcon className="size-4" aria-hidden="true" />
        </Button>

        {/* Context panel toggle — hidden on mobile */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon-sm" className="hidden border-border bg-card/60 text-muted-foreground hover:text-synth-cyan md:inline-flex" aria-label="Toggle context panel" onClick={onContextToggle}>
              <PanelIcon className="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Context panel</TooltipContent>
        </Tooltip>

        {/* Profile menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 rounded-full p-0" aria-label="Open profile menu">
              <Avatar className="size-8 border border-synth-cyan/35 bg-synth-cyan/10">
                <AvatarFallback className="bg-transparent font-mono text-[10px] text-synth-cyan">AM</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="text-xs">ANONYMIKE</p>
              <p className="font-mono text-[9px] font-normal uppercase tracking-[0.12em] text-muted-foreground">Creator</p>
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
