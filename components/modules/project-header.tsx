import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { iconFor } from "@/lib/icons";
import type { ProjectInfo } from "@/lib/project/use-project";

interface ProjectHeaderProps {
  project: ProjectInfo | null;
  recentFiles: string[];
  onSelectFile: (path: string) => void;
}

function sourceBadge(adapterType: string): { label: string; className: string } {
  switch (adapterType) {
    case "local":
      return { label: "LOCAL PROJECT", className: "border-synth-success/25 text-synth-success" };
    case "github":
      return { label: "GITHUB", className: "border-blue-500/25 text-blue-400" };
    case "demo":
    default:
      return { label: "DEMO PROJECT", className: "border-synth-violet/25 text-synth-violet" };
  }
}

export function ProjectHeader({ project, recentFiles, onSelectFile }: ProjectHeaderProps) {
  if (!project) return null;

  const badge = sourceBadge(project.adapterType);
  const github = project.github;

  return (
    <Card className="border-synth-cyan/20 bg-synth-cyan/5">
      <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-synth-cyan/10 text-synth-cyan">
            {project.adapterType === "github"
              ? iconFor("gitBranch")({ className: "size-4" })
              : iconFor("code-2")({ className: "size-4" })}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-semibold">{project.name}</p>
              <Badge variant="outline" className={`shrink-0 text-[8px] ${badge.className}`}>
                {badge.label}
              </Badge>
              {project.readOnly && (
                <Badge variant="outline" className="shrink-0 text-[8px] text-muted-foreground">
                  READ-ONLY
                </Badge>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {github ? (
                <>
                  <span className="font-mono">{github.owner}/{github.repo}</span>
                  <span>·</span>
                  <span className="font-mono text-blue-400/80">{github.ref}</span>
                  <span>·</span>
                  <a
                    href={github.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400/70 underline-offset-2 hover:underline hover:text-blue-400"
                  >
                    View on GitHub
                  </a>
                </>
              ) : (
                <>
                  <span>{project.language}</span>
                  <span>·</span>
                  <span>{project.framework}</span>
                  <span>·</span>
                  <span>{project.fileCount} files</span>
                  <span>·</span>
                  <span>{project.version}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {recentFiles.length > 0 && (
            <div className="hidden items-center gap-1 sm:flex">
              <span className="text-[9px] text-muted-foreground">Recent:</span>
              {recentFiles.slice(0, 3).map((filePath) => {
                const fileName = filePath.split("/").pop() ?? filePath;
                return (
                  <Button
                    key={filePath}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 gap-1 px-2 text-[9px]"
                    onClick={() => onSelectFile(filePath)}
                  >
                    {iconFor("clock")({ className: "size-2.5 text-muted-foreground/60" })}
                    {fileName}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
