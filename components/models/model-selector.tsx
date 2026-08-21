"use client";

import { Select, SelectContent, SelectItem, SelectLabel, SelectGroup, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ModelInfo } from "@/lib/ai/types";

interface ModelSelectorProps {
  models: ModelInfo[];
  value: string;
  onChange: (value: string) => void;
  routing?: Array<{ id: string; label: string; description: string; available: boolean }>;
}

export function ModelSelector({ models, value, onChange, routing }: ModelSelectorProps) {
  const selectedModel = models.find((m) => m.id === value);
  const displayLabel = selectedModel?.label ?? routing?.find((r) => r.id === value)?.label ?? value;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="max-w-[165px] border-transparent bg-transparent font-mono text-[10px] text-muted-foreground">
        <SelectValue aria-label={displayLabel}>
          <span className="truncate">{displayLabel}</span>
          {selectedModel?.free && <span className="ml-1 text-synth-success">free</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="max-h-[320px]">
        {/* Routing presets */}
        {routing && routing.length > 0 && (
          <>
            <SelectGroup>
              <SelectLabel className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Routing</SelectLabel>
              {routing.map((preset) => (
                <SelectItem key={preset.id} value={preset.id} disabled={!preset.available}>
                  <div className="flex items-center gap-2">
                    <span>{preset.label}</span>
                    {!preset.available && (
                      <span className="font-mono text-[8px] text-muted-foreground">unavailable</span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
          </>
        )}

        {/* Actual models */}
        <SelectGroup>
          <SelectLabel className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">Models</SelectLabel>
          {models.map((model) => (
            <SelectItem key={model.id} value={model.id} disabled={!model.enabled}>
              <div className="flex items-center gap-2">
                <span className="truncate">{model.label}</span>
                {model.free && <span className="shrink-0 font-mono text-[8px] text-synth-success">free</span>}
                {model.providerId === "mock" && <span className="shrink-0 font-mono text-[8px] text-muted-foreground">demo</span>}
              </div>
            </SelectItem>
          ))}
          {models.length === 0 && (
            <SelectItem value="__none" disabled>
              <span className="text-muted-foreground">No models available</span>
            </SelectItem>
          )}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
