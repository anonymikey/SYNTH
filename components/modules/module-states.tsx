"use client";

import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { iconFor } from "@/lib/icons";
import { formatModuleStatus } from "@/components/modules/formatters";
import type { ModuleState } from "@/components/modules/types";

export function ModuleLoading({ label = "SYNTH module" }: { label?: string }) {
  return (
    <div className="space-y-4" role="status" aria-live="polite" aria-label={`Loading ${label}`}>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-44 w-full" />
      </div>
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

export function ModuleStateCard({
  state,
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: {
  state: ModuleState;
  title: string;
  description: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const Icon = icon ?? iconFor(state === "error" ? "circleHelp" : state === "coming-soon" ? "sparkles" : "info");
  const status = formatModuleStatus(state);

  return (
    <Card className="border-synth-violet/25 bg-synth-violet/5" role={state === "error" ? "alert" : "status"} aria-live="polite">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-synth-violet/10 text-synth-violet">
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{title}</p>
            <Badge variant="outline" className="font-mono text-[9px] uppercase tracking-[0.12em]">{status}</Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
        </div>
        {actionLabel && onAction && <Button variant="outline" onClick={onAction}>{actionLabel}</Button>}
      </CardContent>
    </Card>
  );
}

export function ModuleEmpty({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  return <ModuleStateCard state="empty" title={title} description={description} icon={iconFor("files")} actionLabel={actionLabel} onAction={onAction} />;
}

export function ModuleError({ title = "SYNTH could not load this view", description, onRetry }: { title?: string; description: string; onRetry?: () => void }) {
  return <ModuleStateCard state="error" title={title} description={description} icon={iconFor("circleHelp")} actionLabel={onRetry ? "Try again" : undefined} onAction={onRetry} />;
}

export function ModuleComingSoon({ title, description }: { title: string; description: string }) {
  return <ModuleStateCard state="coming-soon" title={title} description={description} icon={iconFor("sparkles")} />;
}
