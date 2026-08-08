"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ModuleActionFeedback } from "@/components/modules/module-action-feedback";
import { useEngineAction } from "@/components/modules/use-engine-action";
import { plannerAgent } from "@/agents/definitions/planner";
import { synthAgentModule } from "@/modules/agent/agent-module";
import type { ModuleAction, WorkspaceModuleProps } from "@/components/modules/types";

export function AgentModule({ project, context, onAction }: WorkspaceModuleProps) {
  const [objective, setObjective] = useState("");
  const engine = useEngineAction({ project, context });

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextObjective = objective.trim();
    if (!nextObjective || engine.state === "loading") return;
    const action: ModuleAction = { id: "run-agent-plan", label: "Stage implementation plan", intent: "planning", payload: { agentId: plannerAgent.id, objective: nextObjective } };
    onAction?.(action);
    await engine.runAction(action);
  };

  return <div className="space-y-4"><Card className="border-synth-violet/20 bg-synth-violet/5"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold">Provider-neutral planning foundation</p><p className="mt-1 text-xs leading-5 text-muted-foreground">SYNTH Agent currently stages planning requests only. It cannot execute tools or modify files.</p></div><Badge variant="outline" className="w-fit border-synth-violet/25 text-[9px] uppercase tracking-[0.1em] text-synth-violet">{synthAgentModule.status}</Badge></CardContent></Card><Card><CardHeader className="gap-2 border-b border-border/70 pb-4"><CardTitle className="text-sm">Plan a workspace objective</CardTitle><p className="text-xs leading-5 text-muted-foreground">The request uses the existing planner profile and routes through the `planning` Engine intent.</p></CardHeader><CardContent className="space-y-3 p-4"><form className="flex flex-col gap-2 sm:flex-row" onSubmit={submit}><Input value={objective} onChange={(event) => setObjective(event.target.value)} placeholder="What should SYNTH help plan?" aria-label="SYNTH Agent objective" /><Button type="submit" disabled={!objective.trim() || engine.state === "loading"}>{engine.state === "loading" ? "Planning…" : "Stage plan"}</Button></form><p className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70">Agent profile: {plannerAgent.label} · tools disabled · local-first</p><ModuleActionFeedback state={engine.state} output={engine.output} error={engine.error} model={engine.model} /></CardContent></Card></div>;
}
