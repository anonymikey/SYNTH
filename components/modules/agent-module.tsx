"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModuleActionFeedback } from "@/components/modules/module-action-feedback";
import { useEngineAction } from "@/components/modules/use-engine-action";
import { AgentRegistry } from "@/agents/registry";
import { synthAgentModule } from "@/modules/agent/agent-module";
import type { ModuleAction, WorkspaceModuleProps } from "@/components/modules/types";

const DEFAULT_AGENT_ID = "planner";

export function AgentModule({ project, context, onAction }: WorkspaceModuleProps) {
  const [selectedAgentId, setSelectedAgentId] = useState(DEFAULT_AGENT_ID);
  const [task, setTask] = useState("");
  const agents = useMemo(() => AgentRegistry.list(), []);
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId) ?? agents[0] ?? null;
  const engine = useEngineAction({ project, context });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTask = task.trim();
    if (!selectedAgent || !nextTask || engine.state === "loading") return;

    const action: ModuleAction = {
      id: "run-agent-plan",
      label: `Plan with ${selectedAgent.label}`,
      intent: "planning",
      payload: { agentId: selectedAgent.id, task: nextTask },
    };

    onAction?.(action);
    await engine.runAction(action);
  };

  return (
    <div className="space-y-4">
      <Card className="border-synth-violet/20 bg-synth-violet/5">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Planning agents are enabled for this phase</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">SYNTH Agent remains planning-oriented and non-autonomous. It can stage structured plans without shell access, file mutation, or tool execution.</p>
          </div>
          <Badge variant="outline" className="w-fit border-synth-violet/25 text-[9px] uppercase tracking-[0.1em] text-synth-violet">{synthAgentModule.status}</Badge>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader className="border-b border-border/70 pb-4">
            <CardTitle className="text-sm">Registered agents</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3">
            {agents.length === 0 ? (
              <p className="text-xs leading-5 text-muted-foreground">No agents are registered yet.</p>
            ) : (
              agents.map((agent) => {
                const isSelected = agent.id === selectedAgent?.id;
                return (
                  <Button
                    key={agent.id}
                    type="button"
                    variant={isSelected ? "secondary" : "ghost"}
                    className={`h-auto min-h-14 w-full justify-start gap-3 px-3 py-2 text-left ${isSelected ? "border border-synth-violet/25 bg-synth-violet/5" : "text-muted-foreground"}`}
                    onClick={() => setSelectedAgentId(agent.id)}
                    aria-pressed={isSelected}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-synth-violet/10 text-synth-violet">{agent.label.slice(0, 1)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">{agent.label}</span>
                      <span className="mt-1 block text-[10px] leading-4 text-muted-foreground">{agent.mode}</span>
                    </span>
                  </Button>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-2 border-b border-border/70 pb-4">
            <CardTitle className="text-sm">Agent task</CardTitle>
            {selectedAgent && (
              <p className="text-xs leading-5 text-muted-foreground">{selectedAgent.description ?? "Structured, planning-only assistance for the active workspace."}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {selectedAgent ? (
              <>
                <div className="rounded-lg border border-border bg-muted/15 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{selectedAgent.label}</p>
                    <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em] text-synth-violet">{selectedAgent.enabled ? "enabled" : "standby"}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{selectedAgent.description ?? "Agent contract is defined but still intentionally planning-only."}</p>
                  {selectedAgent.capabilities && selectedAgent.capabilities.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedAgent.capabilities.map((capability) => (
                        <Badge key={capability} variant="outline" className="border-synth-violet/25 text-[9px] text-synth-violet">{capability}</Badge>
                      ))}
                    </div>
                  )}
                </div>

                <form className="space-y-3" onSubmit={submit}>
                  <Input
                    value={task}
                    onChange={(event) => setTask(event.target.value)}
                    placeholder="Describe the task or objective for this agent..."
                    aria-label="Agent task"
                  />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70">
                      {selectedAgent.id} · planning-only · tools disabled
                    </p>
                    <Button type="submit" disabled={!task.trim() || engine.state === "loading"} className="min-w-[130px]">
                      {engine.state === "loading" ? "Planning…" : "Run Agent"}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No agent is available for this workspace yet.</p>
            )}

            <ModuleActionFeedback state={engine.state} output={engine.output} error={engine.error} model={engine.model} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
