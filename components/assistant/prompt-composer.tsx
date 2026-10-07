"use client";

import { forwardRef, useRef, useImperativeHandle, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AgentModeSelect } from "@/components/assistant/agent-mode-select";
import { TextType } from "@/components/ui/text-type";
import { iconFor } from "@/lib/icons";
import { cn } from "@/lib/utils";
import type { SynthModelView, SynthRoutingPreset } from "@/modules/models/hooks/use-model-catalog";
import type { AgentMode } from "@/types/workspace";

export interface ComposerAttachment {
  id: string;
  name: string;
  kind: "file" | "image";
  size: number;
}

export interface PromptComposerHandle {
  focus: () => void;
}

interface PromptComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (promptOverride?: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  agentMode: AgentMode;
  onAgentModeChange: (mode: AgentMode) => void;
  modelId: string;
  models: SynthModelView[];
  routing?: SynthRoutingPreset[];
  onModelChange: (modelId: string) => void;
  onCodingModelSelected?: () => void;
  attachments: ComposerAttachment[];
  onAddAttachments: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
}

export const PromptComposer = forwardRef<PromptComposerHandle, PromptComposerProps>(
  function PromptComposer(
    {
      value,
      onChange,
      onSubmit,
      onStop,
      isStreaming,
      agentMode,
      onAgentModeChange,
      modelId,
      models,
      routing,
      onModelChange,
      onCodingModelSelected,
      attachments,
      onAddAttachments,
      onRemoveAttachment,
    },
    ref
  ) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isWebSearchActive, setIsWebSearchActive] = useState(false);
    const [plusMenuOpen, setPlusMenuOpen] = useState(false);

    const SendIcon = iconFor("send");
    const StopIcon = iconFor("x");
    const XIcon = iconFor("x");
    const GlobeIcon = iconFor("globe");
    const SparklesIcon = iconFor("sparkles");
    const CodeIcon = iconFor("code");
    const MicIcon = iconFor("mic");
    const PlusIcon = iconFor("plus");
    const ChevronRightIcon = iconFor("chevronRight");
    const ImageIcon = iconFor("image");
    const PaperclipIcon = iconFor("paperclip");
    const BrainIcon = iconFor("brain");

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    const readFiles = (files: FileList | File[]) => {
      const nextFiles = Array.from(files);
      if (nextFiles.length) onAddAttachments(nextFiles);
    };

    const handleSend = () => {
      const trimmed = value.trim();
      if (!trimmed || isStreaming) return;
      if (isWebSearchActive) {
        const enriched = `[Web search grounding active: Please ground your answer with up-to-date web results where applicable]\n\n${trimmed}`;
        onSubmit(enriched);
        setIsWebSearchActive(false);
      } else {
        onSubmit(trimmed);
      }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && event.shiftKey) return;
      if (
        event.key === "Enter" &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing &&
        event.keyCode !== 229
      ) {
        event.preventDefault();
        handleSend();
      }
    };

    const handleImprovePrompt = () => {
      const current = value.trim();
      if (!current) {
        onChange("Review the architecture, identify potential bottlenecks or edge cases, and propose concrete improvements with code examples.");
        toast.info("Added structured starter prompt");
      } else {
        const improved = `Please provide a rigorous, production-ready solution for the following request:\n\n${current}\n\nTechnical Requirements:\n- Provide clean, robust, and well-typed implementation\n- Explain architectural rationale and trade-offs\n- Consider edge cases, performance, and best practices`;
        onChange(improved);
        toast.success("Prompt improved with technical precision ✨");
      }
      setPlusMenuOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    };

    const toggleWebSearch = () => {
      setIsWebSearchActive((prev) => {
        const next = !prev;
        if (next) {
          toast.success("Web search active — answers will be grounded with live web results");
        } else {
          toast.info("Web search disabled");
        }
        return next;
      });
      setPlusMenuOpen(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    };

    return (
      <div className="relative w-full">
        {/* Main composer container */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/95 shadow-xl backdrop-blur-md transition-all focus-within:border-synth-cyan/50 focus-within:shadow-[0_0_20px_rgba(7,150,160,0.12)]"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            readFiles(event.dataTransfer.files);
          }}
        >
          {/* Active chips / Web Search / Attachments header */}
          {(attachments.length > 0 || isWebSearchActive) && (
            <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 px-3.5 pt-2.5 pb-2" aria-label="Active context and attachments">
              {/* Web search active chip */}
              {isWebSearchActive && (
                <Badge
                  variant="outline"
                  className="inline-flex items-center gap-1.5 rounded-full border-synth-cyan/40 bg-synth-cyan/10 px-2.5 py-0.5 font-mono text-[11px] font-medium text-synth-cyan shadow-[0_0_8px_rgba(7,150,160,0.18)] animate-in fade-in zoom-in-95"
                >
                  <GlobeIcon className="size-3 text-synth-cyan animate-pulse" />
                  <span>Web Search Active</span>
                  <button
                    type="button"
                    className="ml-0.5 rounded-full p-0.5 hover:bg-synth-cyan/20 text-synth-cyan/80 hover:text-synth-cyan"
                    onClick={() => {
                      setIsWebSearchActive(false);
                      toast.info("Web search disabled");
                    }}
                    aria-label="Disable web search"
                  >
                    <XIcon className="size-2.5" />
                  </button>
                </Badge>
              )}

              {/* Attachments */}
              {attachments.map((attachment) => (
                <Badge
                  key={attachment.id}
                  variant="outline"
                  className="gap-1.5 border-synth-cyan/25 bg-synth-cyan/5 text-[10px] text-synth-cyan"
                >
                  <span className="max-w-40 truncate">{attachment.name}</span>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-synth-cyan/15"
                    onClick={() => onRemoveAttachment(attachment.id)}
                    aria-label={`Remove ${attachment.name}`}
                  >
                    <XIcon className="size-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {/* Textarea — clean and 100% full width with no dropdowns blocking text */}
          <div className="px-3.5 sm:px-4 pt-3 sm:pt-3.5 pb-2">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder=""
                aria-label="Ask SYNTH anything"
                className="min-h-[52px] sm:min-h-[60px] w-full resize-none border-0 bg-transparent px-0 py-0 text-sm leading-relaxed text-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50 md:text-base"
                disabled={isStreaming}
                rows={2}
              />
              {!value && !isStreaming && (
                <div className="pointer-events-none absolute left-0 top-0 text-sm text-muted-foreground/50 md:text-base">
                  <TextType
                    text={["Ask anything...", "Search web, optimize prompt or analyze code..."]}
                    typingSpeed={65}
                    deletingSpeed={35}
                    pauseDuration={2400}
                    showCursor
                    cursorCharacter="|"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom action bar — completely below textarea, preventing text blocking */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 border-t border-border/40 bg-muted/15 px-2.5 sm:px-3.5 py-2 sm:py-2.5">
            {/* Left controls: Plus action menu + Agent Mode + Model Selection */}
            <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 sm:flex-none">
              {/* Expandable Plus (+) Action Menu (v0-style) */}
              <DropdownMenu open={plusMenuOpen} onOpenChange={setPlusMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className={cn(
                      "size-8 shrink-0 rounded-lg border border-border/60 bg-card/70 text-muted-foreground hover:border-synth-cyan/50 hover:bg-synth-cyan/10 hover:text-synth-cyan active:scale-95 transition-all",
                      plusMenuOpen && "border-synth-cyan/60 bg-synth-cyan/15 text-synth-cyan shadow-[0_0_8px_rgba(7,150,160,0.25)]"
                    )}
                    aria-label="Add tools, files and actions"
                  >
                    <PlusIcon className={cn("size-4 transition-transform duration-200", plusMenuOpen && "rotate-45")} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  align="start"
                  sideOffset={8}
                  className="w-[calc(100vw-32px)] max-w-xs sm:w-80 rounded-2xl border border-border/80 bg-popover/95 p-2 shadow-2xl backdrop-blur-xl"
                >
                  <div className="px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">
                    Tools & Context
                  </div>

                  {/* Search web */}
                  <DropdownMenuItem
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-muted/70",
                      isWebSearchActive && "bg-synth-cyan/10 text-synth-cyan"
                    )}
                    onSelect={toggleWebSearch}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-synth-cyan/30 bg-synth-cyan/15 text-synth-cyan">
                      <GlobeIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">Search web</span>
                      <span className="block text-[10px] text-muted-foreground">Ground with live search results</span>
                    </div>
                    {isWebSearchActive ? (
                      <Badge variant="outline" className="h-4 border-synth-cyan/40 bg-synth-cyan/20 px-1 font-mono text-[8px] font-bold text-synth-cyan">
                        ON
                      </Badge>
                    ) : (
                      <ChevronRightIcon className="size-3 text-muted-foreground/40 shrink-0" />
                    )}
                  </DropdownMenuItem>

                  {/* Improve prompt */}
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-muted/70"
                    onSelect={handleImprovePrompt}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-synth-violet/30 bg-synth-violet/15 text-synth-violet">
                      <SparklesIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">Improve prompt</span>
                      <span className="block text-[10px] text-muted-foreground">Optimize clarity & precision</span>
                    </div>
                    <Badge variant="outline" className="h-4 border-synth-violet/40 bg-synth-violet/10 px-1 font-mono text-[8px] text-synth-violet">
                      AI
                    </Badge>
                  </DropdownMenuItem>

                  {/* Upload from computer */}
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-muted/70"
                    onSelect={() => {
                      setPlusMenuOpen(false);
                      fileInputRef.current?.click();
                    }}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/60 text-muted-foreground">
                      <PaperclipIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">Upload from computer</span>
                      <span className="block text-[10px] text-muted-foreground">Files, images, documents</span>
                    </div>
                    <ChevronRightIcon className="size-3 text-muted-foreground/40 shrink-0" />
                  </DropdownMenuItem>

                  {/* Generate Images */}
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-muted/70"
                    onSelect={() => {
                      setPlusMenuOpen(false);
                      const prefix = value.trim() ? `${value.trim()}\n\nGenerate an image of: ` : "Generate a high-detail image of: ";
                      onChange(prefix);
                      setTimeout(() => textareaRef.current?.focus(), 50);
                    }}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/15 text-amber-400">
                      <ImageIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">Generate images</span>
                      <span className="block text-[10px] text-muted-foreground">Create visual mockups & assets</span>
                    </div>
                    <ChevronRightIcon className="size-3 text-muted-foreground/40 shrink-0" />
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 bg-border/60" />

                  {/* Code mode / Architect */}
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-muted/70"
                    onSelect={() => {
                      setPlusMenuOpen(false);
                      onAgentModeChange("architect");
                      onCodingModelSelected?.();
                      toast.success("Switched to Architect mode");
                    }}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                      <CodeIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">Code mode</span>
                      <span className="block text-[10px] text-muted-foreground">Architect & engineering focus</span>
                    </div>
                    <ChevronRightIcon className="size-3 text-muted-foreground/40 shrink-0" />
                  </DropdownMenuItem>

                  {/* Skills & Instructions */}
                  <DropdownMenuItem
                    className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors hover:bg-muted/70"
                    onSelect={() => {
                      setPlusMenuOpen(false);
                      const prefix = value.trim()
                        ? `${value.trim()}\n\n[Guidelines: Provide structured output, clean code, step-by-step reasoning]`
                        : "[Guidelines: Provide structured output, clean code, step-by-step reasoning]\n";
                      onChange(prefix);
                      setTimeout(() => textareaRef.current?.focus(), 50);
                    }}
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/15 text-sky-400">
                      <BrainIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="block font-medium text-foreground">Skills & Instructions</span>
                      <span className="block text-[10px] text-muted-foreground">Apply custom reasoning rules</span>
                    </div>
                    <ChevronRightIcon className="size-3 text-muted-foreground/40 shrink-0" />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Agent Mode dropdown (Assistant / Architect / etc.) */}
              <AgentModeSelect value={agentMode} onChange={onAgentModeChange} />

              {/* Model selection dropdown (Auto / Claude / GPT / etc.) */}
              <ModelSelectInline
                modelId={modelId}
                models={models}
                routing={routing}
                onChange={(nextId) => {
                  onModelChange(nextId);
                  const selected = models.find((model) => model.id === nextId);
                  if (selected?.category === "coding" || nextId === "coding") onCodingModelSelected?.();
                }}
              />

              <input
                ref={fileInputRef}
                className="hidden"
                type="file"
                multiple
                onChange={(event) => {
                  if (event.target.files) readFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
                aria-label="Attach files"
              />
            </div>

            {/* Right buttons: mic + send */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 text-muted-foreground/60 hover:text-foreground"
                    aria-label="Voice input"
                    onClick={() => toast.info("Voice input ready — speak to compose")}
                  >
                    <MicIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Voice input</TooltipContent>
              </Tooltip>

              {isStreaming ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon-sm"
                      className="size-8 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={onStop}
                      aria-label="Stop generating"
                    >
                      <StopIcon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Stop generating</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon-sm"
                      className="size-8 rounded-lg bg-synth-cyan text-slate-950 font-medium hover:bg-synth-cyan/85 active:scale-95 transition-transform disabled:opacity-40"
                      onClick={handleSend}
                      disabled={!value.trim()}
                      aria-label="Send prompt"
                    >
                      <SendIcon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send &middot; Enter</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

function ModelSelectInline({
  modelId,
  models,
  routing,
  onChange,
}: {
  modelId: string;
  models: SynthModelView[];
  routing?: SynthRoutingPreset[];
  onChange: (id: string) => void;
}) {
  const selectedModel = models.find((m) => m.id === modelId);
  const selectedRouting = routing?.find((r) => r.id === modelId);
  const displayLabel = selectedModel?.label ?? selectedRouting?.label ?? modelId;

  return (
    <Select value={modelId} onValueChange={onChange}>
      <SelectTrigger
        size="sm"
        className="h-8 max-w-[105px] xs:max-w-[115px] sm:max-w-[135px] shrink-0 rounded-lg border-border/60 bg-card/70 px-2 sm:px-2.5 font-mono text-[10px] sm:text-[11px] text-muted-foreground hover:border-border/80 hover:text-foreground transition-colors"
        aria-label={`Model: ${displayLabel}`}
      >
        <SelectValue aria-label={displayLabel}>
          <span className="truncate">{displayLabel}</span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start" className="max-h-[280px] w-56 rounded-xl border-border/80 bg-popover/98 p-1 shadow-2xl backdrop-blur-md">
        <div className="px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
          Model selection
        </div>
        {routing && routing.length > 0 && (
          <>
            {routing.map((preset) => (
              <SelectItem key={preset.id} value={preset.id} disabled={!preset.available} className="rounded-lg text-xs py-1.5">
                <span>{preset.label}</span>
              </SelectItem>
            ))}
            <div className="my-1 h-px bg-border/60" />
          </>
        )}
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id} disabled={!model.available} className="rounded-lg text-xs py-1.5">
            <div className="flex items-center justify-between gap-2 w-full">
              <span className="truncate">{model.label}</span>
              {model.free && <span className="shrink-0 font-mono text-[8px] text-synth-success">free</span>}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
