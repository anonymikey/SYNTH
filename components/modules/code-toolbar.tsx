"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { iconFor } from "@/lib/icons";
import type { ProjectInfo } from "@/lib/project/use-project";

interface CodeToolbarProps {
  project: ProjectInfo | null;
  showExplorer: boolean;
  showPreview: boolean;
  showForge: boolean;
  onToggleExplorer: () => void;
  onTogglePreview: () => void;
  onToggleForge: () => void;
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
}

export function CodeToolbar({
  project,
  showExplorer,
  showPreview,
  showForge,
  onToggleExplorer,
  onTogglePreview,
  onToggleForge,
  onToggleSidebar,
  onNewChat,
}: CodeToolbarProps) {
  const ProjectIcon = iconFor(project?.adapterType === "github" ? "gitBranch" : "code");
  const FilesIcon = iconFor("files");
  const PreviewIcon = iconFor("panelRight");
  const ForgeIcon = iconFor("sparkles");
  const PlusIcon = iconFor("plus");

  return (
    <div className="flex h-9 shrink-0 items-center gap-1 border-b border-border/60 bg-background/95 px-2 backdrop-blur-sm">
      {/* Sidebar toggle */}
      {onToggleSidebar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onToggleSidebar}
            >
              <FilesIcon className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle sidebar</TooltipContent>
        </Tooltip>
      )}

      {/* Project identity */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex size-5 shrink-0 items-center justify-center rounded bg-synth-cyan/10 text-synth-cyan">
          <ProjectIcon className="size-3" />
        </div>
        <span className="truncate text-[11px] font-semibold text-foreground">
          {project?.name ?? "SYNTH Code"}
        </span>
        {project?.adapterType && (
          <Badge
            variant="outline"
            className={`hidden shrink-0 text-[7px] uppercase tracking-wider sm:inline-flex ${
              project.adapterType === "local"
                ? "border-synth-success/25 text-synth-success"
                : project.adapterType === "github"
                  ? "border-blue-500/25 text-blue-400"
                  : "border-synth-violet/25 text-synth-violet"
            }`}
          >
            {project.adapterType}
          </Badge>
        )}
      </div>

      {/* Project metadata */}
      {project && (
        <div className="hidden items-center gap-1.5 text-[9px] text-muted-foreground md:flex">
          <Separator orientation="vertical" className="mx-1 h-3" />
          {project.github ? (
            <>
              <span className="font-mono">{project.github.owner}/{project.github.repo}</span>
              <span className="text-muted-foreground/40">·</span>
              <span className="font-mono text-blue-400/80">{project.github.ref}</span>
            </>
          ) : (
            <>
              <span>{project.language}</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{project.fileCount} files</span>
            </>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* New chat button */}
      {onNewChat && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-[9px] text-muted-foreground hover:text-foreground"
              onClick={onNewChat}
            >
              <PlusIcon className="size-3" />
              <span className="hidden sm:inline">New Chat</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Start new conversation</TooltipContent>
        </Tooltip>
      )}

      <Separator orientation="vertical" className="mx-0.5 h-3" />

      {/* Panel toggles */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={showExplorer ? "default" : "ghost"}
              size="sm"
              className="h-6 gap-1 px-2 text-[10px]"
              onClick={onToggleExplorer}
            >
              <FilesIcon className="size-3" />
              <span className="hidden sm:inline">Explorer</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle file explorer</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={showPreview ? "default" : "ghost"}
              size="sm"
              className="h-6 gap-1 px-2 text-[10px]"
              onClick={onTogglePreview}
            >
              <PreviewIcon className="size-3" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle live preview</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={showForge ? "default" : "ghost"}
              size="sm"
              className="h-6 gap-1 px-2 text-[10px]"
              onClick={onToggleForge}
            >
              <ForgeIcon className="size-3" />
              <span className="hidden sm:inline">Forge</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle SYNTH Forge</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
