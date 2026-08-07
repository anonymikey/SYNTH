"use client";

import type { ProjectSummary } from "@/types/workspace";
import { Button } from "@/components/ui/button";

export function ProjectSwitcher({ project, onSelect }: { project: ProjectSummary; onSelect?: () => void }) {
  return <Button variant="outline" onClick={onSelect} className="max-w-full justify-start truncate text-xs"><span className="truncate">{project.name}</span></Button>;
}
