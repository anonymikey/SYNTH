"use client";

import { ModuleFrame } from "@/components/modules/module-frame";
import { ModuleStateCard } from "@/components/modules/module-states";
import { SYNTH_MODULES } from "@/lib/config/modules";
import { iconFor } from "@/lib/icons";
import type { ModuleRouterProps } from "@/components/modules/types";

/* Direct imports — avoids Turbopack dynamic-chunk sharing issues with lib/icons */
import { AgentModule } from "@/components/modules/agent-module";
import { CodeModule } from "@/components/modules/code-module";
import { DocsModule } from "@/components/modules/docs-module";
import { SearchModule } from "@/components/modules/search-module";
import { VisionModule } from "@/components/modules/vision-module";

export function ModuleRouter({ destination, onBackToAssistant, ...moduleProps }: ModuleRouterProps) {
  const definition = SYNTH_MODULES.find((module) => module.id === destination);
  const Icon = iconFor(definition?.icon ?? "dashboard");
  const isVision = destination === "vision";
  const title = definition?.label ?? "SYNTH module";
  const description = definition?.description ?? "A provider-neutral SYNTH workspace module.";

  /* Code gets its own full-bleed IDE layout — no ModuleFrame wrapper */
  if (destination === "code") {
    return (
      <section className="relative flex h-full min-h-0 min-w-0 w-full flex-1 overflow-hidden">
        <CodeModule {...moduleProps} />
      </section>
    );
  }

  let content: React.ReactNode;
  if (destination === "agent") content = <AgentModule {...moduleProps} />;
  else if (destination === "docs") content = <DocsModule {...moduleProps} />;
  else if (destination === "search") content = <SearchModule {...moduleProps} />;
  else if (destination === "vision") content = <VisionModule {...moduleProps} />;
  else content = <ModuleStateCard state="coming-soon" title={`${title} is staged`} description="This module has a navigation seam, but its capability contract is not connected yet." />;

  return (
    <ModuleFrame
      icon={Icon}
      eyebrow={isVision ? "Roadmap preview" : "Module workspace"}
      title={title}
      description={description}
      onBackToAssistant={onBackToAssistant}
    >
      {content}
    </ModuleFrame>
  );
}
