"use client";

import { forwardRef, useRef, useState, useImperativeHandle } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AgentModeSelect } from "@/components/assistant/agent-mode-select";
import { TextType } from "@/components/ui/text-type";
import { iconFor } from "@/lib/icons";
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
  onSubmit: () => void;
  onStop: () => void;
  isStreaming: boolean;
  agentMode: AgentMode;
  onAgentModeChange: (mode: AgentMode) => void;
  modelId: string;
  models: SynthModelView[];
  routing?: SynthRoutingPreset[];
  onModelChange: (modelId: string) => void;
  attachments: ComposerAttachment[];
  onAddAttachments: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
}

const ATTACHMENT_OPTIONS = [
  { id: "file", label: "Attach", icon: "paperclip", description: "Upload a file" },
  { id: "image", label: "Images", icon: "image", description: "Upload an image" },
] as const;

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
      attachments,
      onAddAttachments,
      onRemoveAttachment,
    },
    ref
  ) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [attachMenuOpen, setAttachMenuOpen] = useState(false);
    const SendIcon = iconFor("send");
    const StopIcon = iconFor("x");
    const XIcon = iconFor("x");
    const PlusIcon = iconFor("plus");

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    const readFiles = (files: FileList | File[]) => {
      const nextFiles = Array.from(files);
      if (nextFiles.length) onAddAttachments(nextFiles);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Shift+Enter inserts newline (default behavior)
      if (event.key === "Enter" && event.shiftKey) return;

      // Enter (without Shift) sends — this covers both bare Enter and Cmd/Ctrl+Enter
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onSubmit();
        return;
      }
    };

    return (
      <Card
        className="glass-panel overflow-hidden rounded-2xl p-0"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          readFiles(event.dataTransfer.files);
        }}
      >
        {/* Top bar: agent mode + model selector */}
        <div className="flex items-center justify-between gap-3 border-b border-border/80 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <AgentModeSelect value={agentMode} onChange={onAgentModeChange} />
            <span className="hidden h-3 w-px bg-border sm:block" />
            <span className="hidden text-[10px] text-muted-foreground/60 sm:inline">provider-neutral</span>
          </div>
          <ModelSelectInline modelId={modelId} models={models} routing={routing} onChange={onModelChange} />
        </div>

        {/* Textarea */}
        <div className="p-3">
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder=""
              aria-label="Ask SYNTH Assistant"
              className="min-h-[4.5rem] resize-none border-0 bg-transparent px-1 py-1 text-sm shadow-none focus-visible:ring-0 md:text-base"
              disabled={isStreaming}
              rows={3}
            />
            {!value && !isStreaming && (
              <div className="pointer-events-none absolute left-1 top-1 text-sm text-muted-foreground/50 md:text-base">
                <TextType
                  text={[
                    "Ask SYNTH anything…",
                    "Describe your code problem…",
                    "What should I build today?",
                    "Explain this codebase…",
                  ]}
                  typingSpeed={65}
                  deletingSpeed={35}
                  pauseDuration={2000}
                  showCursor
                  cursorCharacter="|"
                />
              </div>
            )}
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Selected attachments">
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

          {/* Actions row */}
          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="relative flex items-center gap-0.5">
              {/* Expandable + button */}
              <div className="relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant={attachMenuOpen ? "default" : "ghost"}
                      size="icon-sm"
                      className={`text-muted-foreground hover:text-synth-cyan ${attachMenuOpen ? "bg-synth-cyan/10 text-synth-cyan" : ""}`}
                      onClick={() => setAttachMenuOpen((prev) => !prev)}
                      aria-label="Add attachment"
                      aria-expanded={attachMenuOpen}
                    >
                      {attachMenuOpen ? <XIcon className="size-4" /> : <PlusIcon className="size-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{attachMenuOpen ? "Close menu" : "Attach files"}</TooltipContent>
                </Tooltip>

                {/* Dropdown menu */}
                {attachMenuOpen && (
                  <div className="absolute bottom-full left-0 z-50 mb-2 w-56 overflow-hidden rounded-xl border border-border bg-card/95 shadow-xl backdrop-blur-sm">
                    <div className="p-1.5">
                      {ATTACHMENT_OPTIONS.map((option) => {
                        const OptIcon = iconFor(option.icon);
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60"
                            onClick={() => {
                              if (option.id === "file") fileInputRef.current?.click();
                              else if (option.id === "image") imageInputRef.current?.click();
                              setAttachMenuOpen(false);
                            }}
                          >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-synth-cyan/10 text-synth-cyan">
                              <OptIcon className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-medium text-foreground">{option.label}</span>
                              <span className="block text-[10px] text-muted-foreground">{option.description}</span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

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
              <input
                ref={imageInputRef}
                className="hidden"
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => {
                  if (event.target.files) readFiles(event.target.files);
                  event.currentTarget.value = "";
                }}
                aria-label="Attach images"
              />
            </div>

            {isStreaming ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
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
                    size="icon"
                    className="bg-synth-cyan text-slate-950 hover:bg-synth-cyan/85"
                    onClick={onSubmit}
                    disabled={!value.trim()}
                    aria-label="Send prompt"
                  >
                    <SendIcon className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send · Enter</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Footer hint */}
        <div className="border-t border-border/70 px-4 py-2 font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground/60">
          Enter to send · ⇧+Enter for newline · Drop files to attach
        </div>
      </Card>
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
      <SelectTrigger size="sm" className="max-w-[155px] border-transparent bg-transparent font-mono text-[10px] text-muted-foreground">
        <SelectValue aria-label={displayLabel}>
          <span className="truncate">{displayLabel}</span>
          {selectedModel?.free && <span className="ml-1 text-synth-success">free</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="max-h-[280px]">
        {routing && routing.length > 0 && (
          <>
            {routing.map((preset) => (
              <SelectItem key={preset.id} value={preset.id} disabled={!preset.available}>
                <span>{preset.label}</span>
              </SelectItem>
            ))}
            <div className="my-1 h-px bg-border/60" />
          </>
        )}
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id} disabled={!model.available}>
            <div className="flex items-center gap-2">
              <span className="truncate">{model.label}</span>
              {model.free && <span className="shrink-0 font-mono text-[8px] text-synth-success">free</span>}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
