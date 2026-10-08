"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { iconFor } from "@/lib/icons";
import type { ProjectInfo } from "@/lib/project/use-project";

type CenterView = "editor" | "preview";

type ContextAction = "github" | "figma" | "upload" | "paste" | "mcp" | "plugin";

const contextActionFailures: Record<ContextAction, { label: string; stage: string; reason: string; nextAction: string }> = {
  github: {
    label: "GitHub import",
    stage: "action routing",
    reason: "This toolbar item has no GitHub import handler, so no API request or repository import occurred.",
    nextAction: "Sign in and connect GitHub through the existing import surface, then retry.",
  },
  figma: {
    label: "Figma import",
    stage: "action routing",
    reason: "No Figma import handler is connected to this toolbar item.",
    nextAction: "Use a supported source, or configure Figma access before retrying.",
  },
  upload: {
    label: "File upload",
    stage: "action routing",
    reason: "No file-picker/import handler is connected here; no file was opened or added to Explorer.",
    nextAction: "Retry only after the file-import path is connected.",
  },
  paste: {
    label: "Code paste",
    stage: "action routing",
    reason: "No paste-code handler is connected to this toolbar item; no text was sent.",
    nextAction: "Use Forge’s Add context → Paste Code action, then review and submit the text.",
  },
  mcp: {
    label: "MCP connection",
    stage: "connection setup",
    reason: "No MCP setup handler is connected here; no server was configured.",
    nextAction: "Connect an approved MCP server through a supported setup flow before retrying.",
  },
  plugin: {
    label: "Plugin setup",
    stage: "connection setup",
    reason: "No plugin setup handler is connected here; no capability was enabled.",
    nextAction: "Use an approved plugin setup flow before relying on a plugin.",
  },
};

function reportUnavailableContextAction(action: ContextAction) {
  const failure = contextActionFailures[action];
  toast.error(`${failure.label} failed`, {
    description: `Stage: ${failure.stage}. Reason: ${failure.reason} Next action: ${failure.nextAction}`,
  });
}

interface CodeToolbarProps {
  project: ProjectInfo | null;
  showExplorer: boolean;
  /** Currently unused — preview is toggled via centerView */
  showPreview?: boolean;
  showForge: boolean;
  centerView?: CenterView;
  onToggleExplorer: () => void;
  onTogglePreview: () => void;
  onToggleForge: () => void;
  onToggleSidebar?: () => void;
  onNewChat?: () => void;
}

export function CodeToolbar({
  project,
  showExplorer,
  showForge,
  centerView = "editor",
  onToggleExplorer,
  onTogglePreview,
  onToggleForge,
  onToggleSidebar,
  onNewChat,
}: CodeToolbarProps) {
  const ProjectIcon = iconFor(project?.adapterType === "github" ? "gitBranch" : "code");
  const FilesIcon = iconFor("files");
  const ForgeIcon = iconFor("sparkles");
  const PlusIcon = iconFor("plus");
  const ChevronIcon = iconFor("chevronDown");

  return (
    <div className="flex h-9 shrink-0 items-center gap-1.5 border-b border-white/[.07] bg-[#0b0d14]/95 px-3 backdrop-blur-sm">
      {/* Sidebar toggle */}
      {onToggleSidebar && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-6 shrink-0 text-white/40 hover:text-white/70"
              onClick={onToggleSidebar}
            >
              <FilesIcon className="size-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Toggle sidebar</TooltipContent>
        </Tooltip>
      )}

      {/* Project identity */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex size-4 shrink-0 items-center justify-center rounded bg-[#2dd4bf]/10 text-[#2dd4bf]">
          <ProjectIcon className="size-2.5" />
        </div>
        <span className="truncate text-[10px] font-semibold text-white/80">
          SYNTH Code
        </span>
        <ChevronIcon className="size-2.5 text-white/20" />
      </div>

      {/* Project metadata */}
      {project && (
        <div className="hidden items-center gap-1.5 text-[8px] text-white/25 md:flex">
          <Separator orientation="vertical" className="mx-0.5 h-2.5 bg-white/[0.06]" />
          {project.github ? (
            <>
              <span className="font-mono">{project.github.owner}/{project.github.repo}</span>
              <span className="text-white/10">·</span>
              <span className="font-mono text-blue-400/60">{project.github.ref}</span>
            </>
          ) : (
            <>
              <span>{project.language}</span>
              <span className="text-white/10">·</span>
              <span>{project.fileCount} files</span>
            </>
          )}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Center view tabs — Code | Preview | Diff */}
      <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.07] bg-[#11141d] p-0.5 shadow-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`px-2.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                centerView === "editor" ? "bg-white/[0.08] text-white/90" : "text-white/35 hover:text-white/60"
              }`}
              onClick={() => { if (centerView !== "editor") onTogglePreview(); }}
            >
              Code
            </button>
          </TooltipTrigger>
          <TooltipContent>Editor view</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`px-2.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                centerView === "preview" ? "bg-white/[0.08] text-white/90" : "text-white/35 hover:text-white/60"
              }`}
              onClick={() => { if (centerView !== "preview") onTogglePreview(); }}
            >
              Preview
            </button>
          </TooltipTrigger>
          <TooltipContent>Preview view</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="px-2.5 py-0.5 rounded text-[9px] font-medium text-white/25 hover:text-white/50 transition-colors cursor-not-allowed"
              disabled
            >
              Diff
            </button>
          </TooltipTrigger>
          <TooltipContent>Coming soon</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="mx-1 h-3 bg-white/[0.06]" />

      {/* Panel toggles */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                showExplorer ? "text-[#2dd4bf]/70 bg-[#2dd4bf]/[0.06]" : "text-white/30 hover:text-white/50"
              }`}
              onClick={onToggleExplorer}
            >
              <FilesIcon className="size-2.5" />
              <span className="hidden sm:inline">Explorer</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle file explorer</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors ${
                showForge ? "text-[#9670ff]/70 bg-[#9670ff]/[0.06]" : "text-white/30 hover:text-white/50"
              }`}
              onClick={onToggleForge}
            >
              <ForgeIcon className="size-2.5" />
              <span className="hidden sm:inline">Forge</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>Toggle SYNTH Forge</TooltipContent>
        </Tooltip>
      </div>

      <Separator orientation="vertical" className="mx-0.5 h-3 bg-white/[0.06]" />

      {/* Code context menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-5 gap-1 px-1.5 text-[9px] text-white/35 hover:text-white/60">
            <PlusIcon className="size-2.5" />
            <span className="hidden sm:inline">Add context</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">Project context</DropdownMenuLabel>
          <DropdownMenuItem onSelect={() => reportUnavailableContextAction("github")}>Import from GitHub</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => reportUnavailableContextAction("figma")}>Import from Figma</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => reportUnavailableContextAction("upload")}>Upload from computer</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => reportUnavailableContextAction("paste")}>Paste code</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => reportUnavailableContextAction("mcp")}>Connect MCP</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => reportUnavailableContextAction("plugin")}>Add plugin</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button type="button" variant="ghost" size="sm" className="h-5 gap-1 px-1.5 text-[9px] text-white/35 hover:text-white/60" onClick={onNewChat}>
            <PlusIcon className="size-2.5" />
            <span className="hidden sm:inline">New Chat</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Start new conversation</TooltipContent>
      </Tooltip>
    </div>
  );
}
