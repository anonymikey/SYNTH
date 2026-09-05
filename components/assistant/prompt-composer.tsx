"use client";

import { forwardRef, useRef, useImperativeHandle } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AgentModeSelect } from "@/components/assistant/agent-mode-select";
import { TextType } from "@/components/ui/text-type";
import { iconFor } from "@/lib/icons";
import { ResourceHubTrigger } from "@/components/workspace/resource-hub-trigger";
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
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const SendIcon = iconFor("send");
    const StopIcon = iconFor("x");
    const XIcon = iconFor("x");
    const GlobeIcon = iconFor("globe");
    const SparklesIcon = iconFor("sparkles");
    const CodeIcon = iconFor("code-2");
    const MicIcon = iconFor("mic");

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
    }));

    const readFiles = (files: FileList | File[]) => {
      const nextFiles = Array.from(files);
      if (nextFiles.length) onAddAttachments(nextFiles);
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
        onSubmit();
      }
    };

    const ACTION_BUTTONS = [
      { id: "globe", icon: GlobeIcon, label: "Search web", onClick: () => onChange(`${value}${value ? " " : ""}Search the web for `) },
      { id: "magic", icon: SparklesIcon, label: "Improve prompt", onClick: () => onChange(value ? `Improve this request while preserving the intent:\n\n${value}` : "Improve my next request") },
      { id: "code", icon: CodeIcon, label: "Code mode", onClick: () => onAgentModeChange("architect") },
    ] as const;

    return (
      <div className="relative w-full">
        {/* Main composer container */}
        <div
          className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-lg backdrop-blur-sm"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            readFiles(event.dataTransfer.files);
          }}
        >
          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-b border-border/50 px-4 pt-3" aria-label="Selected attachments">
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

          {/* Textarea */}
          <div className="px-4 pt-3">
            <div className="relative">
              <Textarea
                ref={textareaRef}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder=""
                aria-label="Ask SYNTH anything"
                className="min-h-[2.5rem] resize-none border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 md:text-base"
                disabled={isStreaming}
                rows={1}
              />
              {!value && !isStreaming && (
                <div className="pointer-events-none absolute left-0 top-0 text-sm text-muted-foreground/50 md:text-base">
                  <TextType
                    text={["Ask anything..."]}
                    typingSpeed={65}
                    deletingSpeed={35}
                    pauseDuration={2000}
                    showCursor
                    cursorCharacter="|"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Bottom action bar */}
          <div className="flex items-center justify-between border-t border-border/40 px-3 py-2">
            {/* Left action buttons */}
            <div className="flex items-center gap-1">
              <ResourceHubTrigger
                variant="icon"
                label="Add context"
                onFilesSelected={onAddAttachments}
                onCodePasted={(code) => onChange(`${value}${value ? "\n\n" : ""}${code}`)}
              />
              {ACTION_BUTTONS.map((btn) => (
                <Tooltip key={btn.id}>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="size-8 text-muted-foreground/60 hover:text-foreground"
                      onClick={btn.onClick}
                      aria-label={btn.label}
                    >
                      <btn.icon className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{btn.label}</TooltipContent>
                </Tooltip>
              ))}

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
            <div className="flex items-center gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="size-8 text-muted-foreground/60 hover:text-foreground"
                    aria-label="Voice input"
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
                      className="size-8 bg-synth-cyan text-slate-950 hover:bg-synth-cyan/85"
                      onClick={onSubmit}
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

        {/* Top-right controls (agent mode + model) */}
        <div className="absolute right-3 top-2 flex items-center gap-2">
          <AgentModeSelect value={agentMode} onChange={onAgentModeChange} />
          <ModelSelectInline modelId={modelId} models={models} routing={routing} onChange={onModelChange} />
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
      <SelectTrigger size="sm" className="max-w-[120px] border-transparent bg-transparent font-mono text-[10px] text-muted-foreground">
        <SelectValue aria-label={displayLabel}>
          <span className="truncate">{displayLabel}</span>
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
