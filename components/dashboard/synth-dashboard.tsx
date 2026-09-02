"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { iconFor } from "@/lib/icons";
import { relativeTime } from "@/lib/dates";
import { useProviderHealth } from "@/lib/hooks/use-provider-health";
import { SYNTH_MODULES, type ModuleDefinition } from "@/lib/config/modules";
import { DEFAULT_PROJECT } from "@/lib/config/workspace";
import type { ConversationSummary } from "@/modules/conversation/types";

interface SynthDashboardProps {
  conversations: ConversationSummary[];
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onNavigateToModule: (module: ModuleDefinition) => void;
}

export function SynthDashboard({
  conversations,
  onSelectConversation,
  onNewChat,
  onNavigateToModule,
}: SynthDashboardProps) {
  const { health } = useProviderHealth();

  const openrouterHealth = health.find((p) => p.providerId === "openrouter");
  const connected = openrouterHealth?.status === "connected" || health.some((p) => p.status === "connected");

  const pinnedConversations = useMemo(
    () => conversations.filter((c) => c.pinned).slice(0, 5),
    [conversations]
  );
  const recentConversations = useMemo(
    () => conversations.filter((c) => !c.pinned).slice(0, 6),
    [conversations]
  );

  const primaryModules = SYNTH_MODULES.filter((m) => m.status === "active").slice(0, 3);
  const secondaryModules = SYNTH_MODULES.filter((m) => m.status !== "active").slice(0, 3);

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      {/* Subtle grid background */}
      <div className="synth-grid pointer-events-none absolute inset-0 opacity-20" />

      <div className="relative mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-10">
        {/* ── Section A: Welcome ── */}
        <section className="mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-heading text-xl font-extrabold tracking-[-0.04em] sm:text-2xl lg:text-3xl">
                Welcome to <span className="text-synth-cyan">SYNTH</span>
              </h1>
              <p className="mt-1.5 text-xs leading-5 text-muted-foreground sm:text-sm">
                Your intelligent development workspace.
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`size-1.5 rounded-full sm:size-2 ${connected ? "bg-synth-success shadow-[0_0_10px_var(--synth-success)]" : "bg-muted-foreground/40"}`} />
                <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground sm:text-[10px]">
                  {connected ? "SYNTH Ultra · Ready" : "Providers offline"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-synth-cyan text-slate-950 hover:bg-synth-cyan/85"
                onClick={onNewChat}
              >
                <span className="mr-1 text-lg leading-none">+</span>
                New Chat
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-border"
                onClick={() => onNavigateToModule(SYNTH_MODULES.find((m) => m.id === "code")!)}
              >
                Open Project
              </Button>
            </div>
          </div>
        </section>

        {/* ── Section B: Workspace Modules ── */}
        <section className="mb-6 sm:mb-10">
          <SectionHeading label="Workspaces" />
          <div className="mt-2 grid grid-cols-1 gap-2 sm:mt-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
            {primaryModules.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                onClick={() => onNavigateToModule(module)}
              />
            ))}
          </div>
          {secondaryModules.length > 0 && (
            <div className="mt-2 grid grid-cols-1 gap-2 sm:mt-3 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {secondaryModules.map((module) => (
                <ModuleCard
                  key={module.id}
                  module={module}
                  onClick={() => onNavigateToModule(module)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Section C: Recent Activity ── */}
        <section className="mb-6 sm:mb-10">
          <SectionHeading
            label="Recent Activity"
            count={conversations.length}
          />
          <div className="mt-2 space-y-1.5 sm:mt-3 sm:space-y-2">
            {/* Pinned conversations */}
            {pinnedConversations.length > 0 && (
              <>
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-synth-violet/70">
                  {(() => { const Ic = iconFor("mapIcon"); return <Ic className="size-3" />; })()}
                  Pinned
                </p>
                {pinnedConversations.map((conv) => (
                  <ActivityRow
                    key={conv.id}
                    conv={conv}
                    onSelect={() => onSelectConversation(conv.id)}
                  />
                ))}
              </>
            )}

            {/* Recent conversations */}
            {recentConversations.length > 0 && (
              <>
                {pinnedConversations.length > 0 && (
                  <div className="my-2 h-px bg-border/60" />
                )}
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/50">
                  {(() => { const Ic = iconFor("history"); return <Ic className="size-3" />; })()}
                  Recent
                </p>
                {recentConversations.map((conv) => (
                  <ActivityRow
                    key={conv.id}
                    conv={conv}
                    onSelect={() => onSelectConversation(conv.id)}
                  />
                ))}
              </>
            )}

            {/* Empty state */}
            {conversations.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center gap-2 py-8 text-center">
                  {(() => { const Ic = iconFor("messageCircle"); return <Ic className="size-6 text-muted-foreground/30" />; })()}
                  <p className="text-sm text-muted-foreground">No conversations yet</p>
                  <p className="text-xs text-muted-foreground/60">
                    Start a new chat to begin building with SYNTH
                  </p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={onNewChat}>
                    Start a conversation
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        {/* ── Section D: Project ── */}
        <section className="mb-6 sm:mb-10">
          <SectionHeading label="Current Project" />
          <Card className="mt-2 sm:mt-3">
            <CardContent className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
              <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-synth-cyan/10">
                <img src="/synth-logo.png" alt="" className="size-full object-cover" width={40} height={40} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{DEFAULT_PROJECT.name}</p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {DEFAULT_PROJECT.framework} · {DEFAULT_PROJECT.language} · {DEFAULT_PROJECT.branch}
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-[9px]">
                {DEFAULT_PROJECT.syncState}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-synth-cyan"
                onClick={() => onNavigateToModule(SYNTH_MODULES.find((m) => m.id === "code")!)}
              >
                Open
              </Button>
            </CardContent>
          </Card>
        </section>

        {/* Footer credit */}
        <div className="border-t border-border/60 pt-6 text-center">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/40">
            SYNTH · by ANONYMIKETECH
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function SectionHeading({ label, count }: { label: string; count?: number }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </h2>
      {count !== undefined && count > 0 && (
        <span className="rounded-full bg-muted/50 px-1.5 py-0.5 font-mono text-[8px] tabular-nums text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}

function ModuleCard({ module, onClick }: { module: ModuleDefinition; onClick: () => void }) {
  const Icon = iconFor(module.icon);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-start gap-2.5 rounded-xl border border-border/80 bg-card/70 p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-synth-cyan/30 hover:bg-card hover:shadow-md sm:gap-3 sm:p-4"
    >
      <div className={`flex size-8 shrink-0 items-center justify-center rounded-lg sm:size-9 ${
        module.id === "assistant" ? "bg-synth-cyan/10 text-synth-cyan" :
        module.id === "code" ? "bg-synth-cyan/10 text-synth-cyan" :
        module.id === "vision" ? "bg-synth-violet/10 text-synth-violet" :
        "bg-muted/50 text-muted-foreground"
      }`}>
        <Icon className="size-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-xs font-semibold sm:text-sm">{module.label.replace("SYNTH ", "")}</p>
          {module.status !== "active" && (
            <Badge variant="outline" className="shrink-0 bg-synth-violet/5 px-1.5 py-0 font-mono text-[8px] uppercase text-synth-violet">
              {module.status === "planned" ? "planned" : "soon"}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground sm:text-xs">{module.description}</p>
      </div>
    </button>
  );
}

function ActivityRow({ conv, onSelect }: { conv: ConversationSummary; onSelect: () => void }) {
  const HistoryIcon = iconFor("history");
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2.5 py-2 text-left transition-colors hover:border-border/60 hover:bg-card/60 sm:gap-3 sm:px-3 sm:py-2.5"
    >
      <HistoryIcon className="size-3.5 shrink-0 text-muted-foreground/40 group-hover:text-synth-cyan sm:size-4" />
      <span className="min-w-0 flex-1 truncate text-[13px] sm:text-sm">{conv.title}</span>
      {conv.messageCount > 0 && (
        <span className="shrink-0 font-mono text-[8px] text-muted-foreground/50 sm:text-[9px]">
          {conv.messageCount} msg{conv.messageCount !== 1 ? "s" : ""}
        </span>
      )}
      <span className="shrink-0 font-mono text-[8px] tabular-nums text-muted-foreground/40 sm:text-[9px]">
        {relativeTime(conv.updatedAt)}
      </span>
    </button>
  );
}
