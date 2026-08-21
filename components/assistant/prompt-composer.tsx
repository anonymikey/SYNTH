"use client";

import { useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AgentModeSelect } from "@/components/assistant/agent-mode-select";
import { iconFor } from "@/lib/icons";
import type { ModelInfo } from "@/lib/ai/types";
import type { AgentMode } from "@/types/workspace";

export interface ComposerAttachment {
  id: string;
  name: string;
  kind: "file" | "image";
  size: number;
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
  models: ModelInfo[];
  onModelChange: (modelId: string) => void;
  attachments: ComposerAttachment[];
  onAddAttachments: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
}

function ComposerButton({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  const Icon = iconFor(icon);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground hover:text-synth-cyan"
          aria-label={label}
          onClick={onClick}
        >
          <Icon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function PromptComposer({
  value,
  onChange,
  onSubmit,
  onStop,
  isStreaming,
  agentMode,
  onAgentModeChange,
  modelId,
  models,
  onModelChange,
  attachments,
  onAddAttachments,
  onRemoveAttachment,
}: PromptComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const SendIcon = iconFor("send");
  const StopIcon = iconFor("x");
  const XIcon = iconFor("x");

  const readFiles = (files: FileList | File[]) => {
    const nextFiles = Array.from(files);
    if (nextFiles.length) onAddAttachments(nextFiles);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter for newline
    if (event.key === "Enter" && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
      event.preventDefault();
      onSubmit();
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
        <Select value={modelId} onValueChange={onModelChange}>
          <SelectTrigger size="sm" className="max-w-[155px] border-transparent bg-transparent font-mono text-[10px] text-muted-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Textarea */}
      <div className="p-3">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask SYNTH anything…"
          aria-label="Ask SYNTH Assistant"
          className="min-h-[4.5rem] resize-none border-0 bg-transparent px-1 py-1 text-sm shadow-none focus-visible:ring-0 md:text-base"
          disabled={isStreaming}
          rows={3}
        />

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
          <div className="flex items-center gap-0.5">
            <ComposerButton label="Attach a file" icon="paperclip" onClick={() => fileInputRef.current?.click()} />
            <ComposerButton label="Add an image" icon="imagePlus" onClick={() => imageInputRef.current?.click()} />
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
        Enter to send · Shift+Enter for newline · Drop files to attach
      </div>
    </Card>
  );
}
