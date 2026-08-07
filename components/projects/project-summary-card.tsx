import { Card, CardContent } from "@/components/ui/card";
import type { ProjectSummary } from "@/types/workspace";

export function ProjectSummaryCard({ project }: { project: ProjectSummary }) {
  return <Card><CardContent className="p-3"><p className="text-sm font-semibold">{project.name}</p><p className="mt-1 text-xs text-muted-foreground">{project.framework} · {project.language}</p><p className="mt-3 font-mono text-[10px] text-muted-foreground">{project.branch} · {project.fileCount} files</p></CardContent></Card>;
}
