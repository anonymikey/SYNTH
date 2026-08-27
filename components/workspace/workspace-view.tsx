"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleRouter } from "@/components/modules/module-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { iconFor } from "@/lib/icons";
import { SYNTH_MODULES, WORKSPACE_AREAS, type ModuleDefinition } from "@/lib/config/modules";
import { DEFAULT_CONTEXT, DEFAULT_PROJECT } from "@/lib/config/workspace";
import { useTheme } from "@/components/theme/theme-provider";
import type { WorkspaceArea } from "@/components/workspace/workspace-view-types";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

export type WorkspaceDestination = "dashboard" | "assistant" | "settings" | ModuleDefinition["id"] | WorkspaceArea;

const AREA_LABELS: Record<WorkspaceArea, string> = {
  history: "Conversation History",
  projects: "Projects",
  knowledge: "Knowledge",
  skills: "Skills",
  plugins: "Plugins",
};

const AREA_DESCRIPTIONS: Record<WorkspaceArea, string> = {
  history: "Search, pin, rename, and remove your recent SYNTH conversations.",
  projects: "Manage the local workspaces that SYNTH can understand and assist with.",
  knowledge: "Browse pinned context and add sources for future retrieval workflows.",
  skills: "Enable reusable AI behaviors without coupling them to a provider.",
  plugins: "Manage application extensions separately from prompt-level skills.",
};

const areaActions: Record<WorkspaceArea, string[]> = {
  history: ["Search conversations", "Pin selected", "Clear archived"],
  projects: ["Create project", "Open project", "Archive project"],
  knowledge: ["Browse sources", "Search knowledge", "Add source"],
  skills: ["Browse skills", "Enable skill", "Disable skill"],
  plugins: ["Browse plugins", "Install plugin", "Configure plugin"],
};

export function WorkspaceView({ destination, onBackToAssistant }: { destination: WorkspaceDestination; onBackToAssistant: () => void }) {
  const [query, setQuery] = useState("");
  const [history, setHistory] = useState(["Plan the provider layer", "Explain the memory model", "Debug hydration error"]);
  const [skills, setSkills] = useState(["Coding", "Research", "Debugging"]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const selectedModule = SYNTH_MODULES.find((item) => item.id === destination);
  const area = WORKSPACE_AREAS.find((item) => item.id === destination);
  const filteredHistory = useMemo(() => history.filter((item) => item.toLowerCase().includes(query.toLowerCase())), [history, query]);
  const Icon = iconFor(selectedModule?.icon ?? area?.icon ?? (destination === "settings" ? "settings" : "dashboard"));

  if (selectedModule && selectedModule.id !== "assistant") {
    return <ModuleRouter destination={selectedModule.id} project={DEFAULT_PROJECT} context={DEFAULT_CONTEXT} onBackToAssistant={onBackToAssistant} onAction={(action) => toast.info(`${action.label} sent through the SYNTH ${action.intent} boundary`)} />;
  }

  if (selectedModule) {
    return <WorkspaceFrame icon={Icon} eyebrow="Roadmap preview" title={selectedModule.label} description={selectedModule.description} onBackToAssistant={onBackToAssistant}><Card className="border-synth-violet/25 bg-synth-violet/5"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-synth-violet/10 text-synth-violet"><Icon className="size-5" /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{selectedModule.label} is staged for the next phase</p><p className="mt-1 text-xs leading-5 text-muted-foreground">This destination is interactive now so your workspace never dead-ends. Use the action below to return to the active Assistant workspace.</p></div><Button variant="outline" onClick={() => toast.success(`${selectedModule.label} roadmap saved to your workspace`)}>Save roadmap</Button></CardContent></Card><WorkspaceActionGrid actions={["View module brief", "Open architecture notes", "Return to Assistant"]} onAction={(action) => action === "Return to Assistant" ? onBackToAssistant() : toast.info(`${action} is available as a SYNTH mock action`)} /></WorkspaceFrame>;
  }

  if (area) {
    return <WorkspaceFrame icon={Icon} eyebrow="Workspace area" title={AREA_LABELS[area.id]} description={AREA_DESCRIPTIONS[area.id]} onBackToAssistant={onBackToAssistant}><AreaWorkspace area={area.id} query={query} onQueryChange={setQuery} history={filteredHistory} setHistory={setHistory} skills={skills} setSkills={setSkills} onAction={(action) => toast.success(`${action} is ready in this local workspace`)} /></WorkspaceFrame>;
  }

  return <WorkspaceFrame icon={Icon} eyebrow="Workspace preferences" title="Settings" description="Tune the SYNTH workspace without changing its provider-neutral engine boundary." onBackToAssistant={onBackToAssistant}><Card><CardHeader><CardTitle className="text-sm">Appearance and notifications</CardTitle></CardHeader><CardContent className="space-y-4"><SettingRow label="Dark theme" description="Keep the neon IDE canvas in its default dark mode." control={<Switch checked={theme === "dark"} onCheckedChange={() => toggleTheme()} aria-label="Toggle dark theme" />} /><Separator /><SettingRow label="Workspace notifications" description="Show local engine and workspace activity feedback." control={<Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} aria-label="Toggle workspace notifications" />} /><Separator /><div className="rounded-lg border border-border bg-muted/20 p-3 text-xs text-muted-foreground"><p className="font-semibold text-foreground">About SYNTH</p><p className="mt-1 leading-5">SYNTH is built by ANONYMIKETECH and created by ANONYMIKE.</p></div><Separator /><div className="flex flex-col gap-3 rounded-xl border border-destructive/20 bg-destructive/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-destructive">Danger zone</p><p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Permanently remove your SYNTH account and all associated data.</p></div><DeleteAccountDialog /></div></CardContent></Card></WorkspaceFrame>;
}

function WorkspaceFrame({ icon: Icon, eyebrow, title, description, onBackToAssistant, children }: { icon: ReturnType<typeof iconFor>; eyebrow: string; title: string; description: string; onBackToAssistant: () => void; children: React.ReactNode }) {
  return <section className="relative min-h-0 flex-1 overflow-y-auto"><div className="synth-grid pointer-events-none absolute inset-0 opacity-30" /><div className="relative mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6 sm:py-12"><div className="flex items-start gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-synth-cyan/25 bg-synth-cyan/10 text-synth-cyan"><Icon className="size-5" /></div><div className="min-w-0 flex-1"><p className="font-mono text-[9px] uppercase tracking-[0.18em] text-synth-cyan">{eyebrow}</p><h1 className="mt-2 font-heading text-3xl font-extrabold tracking-[-0.05em] sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p></div><Button variant="ghost" onClick={onBackToAssistant}>Back to Assistant</Button></div>{children}</div></section>;
}

function AreaWorkspace({ area, query, onQueryChange, history, setHistory, skills, setSkills, onAction }: { area: WorkspaceArea; query: string; onQueryChange: (value: string) => void; history: string[]; setHistory: (items: string[]) => void; skills: string[]; setSkills: (items: string[]) => void; onAction: (action: string) => void }) {
  const [projectCreated, setProjectCreated] = useState(false);
  const items = area === "history" ? history : area === "skills" ? skills : area === "projects" ? [DEFAULT_PROJECT.name] : area === "knowledge" ? DEFAULT_CONTEXT.knowledge.map((item) => item.title) : ["Local provider registry", "SYNTH Engine bridge"];
  const filtered = items.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-5"><div className="flex flex-col gap-3 sm:flex-row"><Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={`Search ${AREA_LABELS[area].toLowerCase()}...`} aria-label={`Search ${AREA_LABELS[area]}`} /><WorkspaceActionGrid actions={areaActions[area]} onAction={onAction} compact /></div><Card><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle className="text-sm">{filtered.length} available</CardTitle><Badge variant="outline">local mock</Badge></div></CardHeader><CardContent className="space-y-2">{filtered.length ? filtered.map((item) => <div key={item} className="group flex items-center gap-3 rounded-lg border border-border bg-muted/20 p-3"><span className="size-2 rounded-full bg-synth-cyan/70" /><span className="min-w-0 flex-1 truncate text-sm">{item}</span><Button variant="ghost" size="sm" onClick={() => { if (area === "history") setHistory(history.filter((entry) => entry !== item)); if (area === "skills") setSkills(skills.filter((entry) => entry !== item)); onAction(`${item} updated`); }}>{area === "history" ? "Delete" : area === "skills" ? "Disable" : "Open"}</Button></div>) : <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No matching items. Try a different search or create a new local item.</div>}</CardContent></Card>{area === "projects" && <Button onClick={() => setProjectCreated(true)}>{projectCreated ? "Project draft created" : "Create project"}</Button>}</div>;
}

function WorkspaceActionGrid({ actions, onAction, compact = false }: { actions: string[]; onAction: (action: string) => void; compact?: boolean }) {
  return <div className={compact ? "flex flex-wrap gap-2" : "grid gap-3 sm:grid-cols-3"}>{actions.map((action) => <Button key={action} variant="outline" className={compact ? "text-xs" : "h-auto justify-start py-3 text-left text-xs"} onClick={() => onAction(action)}>{action}</Button>)}</div>;
}

function SettingRow({ label, description, control }: { label: string; description: string; control: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-medium">{label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div>{control}</div>;
}
