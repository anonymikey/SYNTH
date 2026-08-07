"use client";

import dynamic from "next/dynamic";
import { ModuleFrame } from "@/components/modules/module-frame";
import { ModuleLoading, ModuleStateCard } from "@/components/modules/module-states";
import { SYNTH_MODULES } from "@/lib/config/modules";
import { iconFor } from "@/lib/icons";
import type { ModuleRouterProps } from "@/components/modules/types";

const CodeModule = dynamic(() => import("@/components/modules/code-module").then((module) => module.CodeModule), { loading: () => <ModuleLoading label="SYNTH Code" /> });
const DocsModule = dynamic(() => import("@/components/modules/docs-module").then((module) => module.DocsModule), { loading: () => <ModuleLoading label="SYNTH Docs" /> });
const SearchModule = dynamic(() => import("@/components/modules/search-module").then((module) => module.SearchModule), { loading: () => <ModuleLoading label="SYNTH Search" /> });
const VisionModule = dynamic(() => import("@/components/modules/vision-module").then((module) => module.VisionModule), { loading: () => <ModuleLoading label="SYNTH Vision" /> });

export function ModuleRouter({ destination, onBackToAssistant, ...moduleProps }: ModuleRouterProps) {
  const definition = SYNTH_MODULES.find((module) => module.id === destination);
  const Icon = iconFor(definition?.icon ?? "dashboard");
  const isVision = destination === "vision";
  const title = definition?.label ?? "SYNTH module";
  const description = definition?.description ?? "A provider-neutral SYNTH workspace module.";

  let content: React.ReactNode;
  if (destination === "code") content = <CodeModule {...moduleProps} />;
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
