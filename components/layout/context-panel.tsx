"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { iconFor } from "@/lib/icons";
import type { ChatContextView, ProjectSummary } from "@/types/workspace";

export function ContextPanel({ project, context, onClose }: { project: ProjectSummary; context: ChatContextView; onClose?: () => void }) {
  const [activeTab, setActiveTab] = useState("context");
  const PanelIcon = iconFor("panelRight");
  const FileIcon = iconFor("fileCode");
  const PinIcon = iconFor("mapIcon");
  const ShieldIcon = iconFor("shield");
  const ActivityIcon = iconFor("activity");

  return (
    <aside className="flex h-full min-h-0 w-full flex-col border-l border-border bg-background/70" aria-label="SYNTH project context panel">
      {/* Header */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
        <div>
          <p className="font-heading text-sm font-bold tracking-[-0.03em]">SYNTH Context</p>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {context.recentFiles.length} files · {context.knowledge.length} knowledge
          </p>
        </div>
        <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-synth-cyan" onClick={onClose} aria-label="Hide context panel">
          <PanelIcon className="size-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0 flex-1">
        <div className="border-b border-border px-3 pt-2">
          <TabsList variant="line" className="grid w-full grid-cols-4">
            <TabsTrigger value="context" className="text-[10px]">Context</TabsTrigger>
            <TabsTrigger value="files" className="text-[10px]">Files</TabsTrigger>
            <TabsTrigger value="agent" className="text-[10px]">Agent</TabsTrigger>
            <TabsTrigger value="activity" className="text-[10px]">Activity</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="h-[calc(100%-3rem)] min-h-0">
          {/* Context Tab */}
          <TabsContent value="context" className="m-0 space-y-5 p-4">
            <ProjectSection project={project} />

            {/* Knowledge */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pinned knowledge</h2>
                <PinIcon className="size-3.5 text-synth-violet" />
              </div>
              {context.knowledge.length > 0 ? (
                <div className="space-y-2">
                  {context.knowledge.map((item) => (
                    <Card key={item.id} className="border-border bg-card/70">
                      <CardContent className="p-3">
                        <Button variant="ghost" className="h-auto w-full justify-start gap-2 p-0 text-left hover:bg-transparent" onClick={() => toast.success(`${item.title} added to active context`)}>
                          <PinIcon className="mt-0.5 size-3.5 shrink-0 text-synth-violet" />
                          <span>
                            <span className="block text-[11px] font-medium">{item.title}</span>
                            <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{item.summary}</span>
                          </span>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <EmptyState icon="pin" message="No pinned knowledge yet" hint="Pin documents to include them in SYNTH context" />
              )}
            </section>

            {/* Suggested actions */}
            <section>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Suggested actions</h2>
                <span className="font-mono text-[9px] text-muted-foreground">context aware</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {["Review changes", "Run checks", "Map modules", "Find docs"].map((label, index) => (
                  <Button key={label} variant="outline" className="h-auto justify-start px-2.5 py-2 text-left text-[10px] text-muted-foreground hover:border-synth-cyan/40 hover:text-foreground" onClick={() => onContextAction(label)}>
                    <span className={`mr-1.5 size-1.5 rounded-full ${index % 2 ? "bg-synth-success" : "bg-synth-cyan"}`} />
                    {label}
                  </Button>
                ))}
              </div>
            </section>
          </TabsContent>

          {/* Files Tab */}
          <TabsContent value="files" className="m-0 space-y-4 p-4">
            <SectionHeading
              label="Recent files"
              action={<Button variant="link" size="xs" className="h-auto p-0 font-mono text-[9px] text-synth-cyan" onClick={() => toast.info("Project browser opened in mock mode")}>View all</Button>}
            />
            {context.recentFiles.length > 0 ? (
              <div className="space-y-1">
                {context.recentFiles.map((file, index) => (
                  <Button key={file.path} variant="ghost" className={`h-auto w-full justify-start gap-2 px-2.5 py-2 text-left ${index === 0 ? "border border-synth-cyan/20 bg-synth-cyan/5" : ""}`} onClick={() => toast.success(`${file.path} selected in SYNTH context`)}>
                    <FileIcon className={`size-4 shrink-0 ${index === 0 ? "text-synth-cyan" : "text-muted-foreground"}`} />
                    <span className="min-w-0 flex-1 truncate text-[11px]">{file.path}</span>
                    <span className="font-mono text-[9px] text-muted-foreground">{file.updatedAt}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <EmptyState icon="files" message="No recent files" hint="Open files in SYNTH Code to see them here" />
            )}
          </TabsContent>

          {/* Agent Tab */}
          <TabsContent value="agent" className="m-0 space-y-4 p-4">
            <AgentStatusPanel Icon={ShieldIcon} />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="m-0 space-y-3 p-4">
            <SectionHeading label="Workspace activity" action={<ActivityIcon className="size-3.5 text-synth-success" />} />
            <div className="space-y-2">
              {[
                { text: "Context assembled from recent files", time: "2m ago" },
                { text: "SYNTH Engine routed conversation intent", time: "5m ago" },
                { text: "Provider health check completed", time: "12m ago" },
              ].map((activity, index) => (
                <div key={index} className="flex gap-3 rounded-lg border border-border bg-card/60 p-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-synth-success" />
                  <div>
                    <p className="text-[11px] leading-4">{activity.text}</p>
                    <p className="mt-1 font-mono text-[9px] text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </aside>
  );
}

function onContextAction(label: string) {
  toast.success(`${label} added to the SYNTH prompt queue`);
}

function ProjectSection({ project }: { project: ProjectSummary }) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Current project</h2>
        <span className="font-mono text-[9px] text-synth-success">{project.syncState}</span>
      </div>
      <Card className="border-border bg-card/70">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-synth-cyan/10 text-synth-cyan">
              <span className="font-heading font-bold">S</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">{project.name}</p>
              <p className="font-mono text-[9px] text-muted-foreground">{project.framework} · {project.language}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-2 font-mono text-[9px] text-muted-foreground">
            <span>{project.branch}</span>
            <span>{project.fileCount} files</span>
            <span>{project.version}</span>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function AgentStatusPanel({ Icon }: { Icon: ReturnType<typeof iconFor> }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Agent status</h2>
        <span className="font-mono text-[9px] text-synth-success">standby</span>
      </div>
      <Card className="border-border bg-card/70">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-lg bg-synth-violet/10 text-synth-violet">
              <Icon className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold">Assistant core</p>
              <p className="font-mono text-[9px] text-muted-foreground">engine router online</p>
            </div>
            <span className="size-1.5 rounded-full bg-synth-success shadow-[0_0_9px_var(--synth-success)]" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Memory</p>
              <p className="mt-1 text-xs font-semibold">—</p>
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Status</p>
              <p className="mt-1 text-xs font-semibold text-synth-success">ready</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function EmptyState({ icon, message, hint }: { icon: string; message: string; hint: string }) {
  const EmptyIcon = iconFor(icon);
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center">
      <EmptyIcon className="mb-2 size-6 text-muted-foreground/30" />
      <p className="text-[11px] font-medium text-muted-foreground">{message}</p>
      <p className="mt-1 text-[10px] text-muted-foreground/60">{hint}</p>
    </div>
  );
}

function SectionHeading({ label, action }: { label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</h2>
      {action}
    </div>
  );
}
