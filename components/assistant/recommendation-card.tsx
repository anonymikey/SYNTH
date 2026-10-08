"use client";

import { ArrowRight, Sparkles, Code2, Image as ImageIcon, Bot, FolderGit2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SynthRecommendation } from "@/lib/handoff/types";

interface RecommendationCardProps {
  recommendation: SynthRecommendation;
  onAction: (recommendation: SynthRecommendation) => void;
}

export function RecommendationCard({ recommendation, onAction }: RecommendationCardProps) {
  const { destination, title, description, badge, actionLabel, agentSequence, handoff } = recommendation;

  const getIcon = () => {
    switch (destination) {
      case "vision":
        return <ImageIcon className="size-4 text-amber-400" />;
      case "code":
        return <Code2 className="size-4 text-synth-cyan" />;
      case "agent":
        return <Bot className="size-4 text-synth-violet" />;
      default:
        return <Sparkles className="size-4 text-synth-cyan" />;
    }
  };

  const getCardStyle = () => {
    switch (destination) {
      case "vision":
        return "border-amber-500/30 bg-amber-500/5 shadow-[0_0_20px_rgba(245,158,11,0.08)]";
      case "code":
        return "border-synth-cyan/35 bg-synth-cyan/5 shadow-[0_0_20px_rgba(7,150,160,0.08)]";
      case "agent":
        return "border-synth-violet/35 bg-synth-violet/5 shadow-[0_0_20px_rgba(109,66,217,0.08)]";
      default:
        return "border-border/80 bg-card/60";
    }
  };

  const hasAttachments = handoff.attachments && handoff.attachments.length > 0;
  const projectName = handoff.projectName;

  return (
    <div className={`mt-3.5 overflow-hidden rounded-xl border p-4 transition-all ${getCardStyle()}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/60">
            {getIcon()}
          </div>
          <span className="font-heading text-sm font-semibold text-foreground">
            {title}
          </span>
        </div>
        {badge && (
          <Badge
            variant="outline"
            className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground border-border/60"
          >
            {badge}
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>

      {/* Multi-agent sequence visualization */}
      {agentSequence && agentSequence.length > 0 && (
        <div className="mt-3 rounded-lg border border-border/50 bg-background/40 p-2.5">
          <span className="block font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80 mb-2">
            Specialist Sequence
          </span>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {agentSequence.map((step, idx) => (
              <div key={step} className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-synth-violet/30 bg-synth-violet/10 px-2 py-0.5 font-medium text-synth-violet">
                  <CheckCircle2 className="size-2.5" />
                  {step}
                </span>
                {idx < agentSequence.length - 1 && (
                  <ArrowRight className="size-3 text-muted-foreground/40 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Preservation Badges */}
      {(hasAttachments || projectName) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-border/30">
          {projectName && (
            <Badge variant="outline" className="gap-1 border-synth-cyan/30 bg-synth-cyan/5 text-[10px] text-synth-cyan">
              <FolderGit2 className="size-2.5" />
              <span>Project: {projectName} (preserved)</span>
            </Badge>
          )}
          {handoff.attachments.map((att) => (
            <Badge key={att.id} variant="outline" className="gap-1 border-border/60 bg-background/50 text-[10px] text-muted-foreground">
              {att.kind === "image" ? <ImageIcon className="size-2.5" /> : null}
              <span>{att.name} (preserved)</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Primary Action Button */}
      <div className="mt-3.5 flex items-center justify-between gap-3">
        <Button
          type="button"
          size="sm"
          className="gap-2 font-medium shadow-sm transition-transform active:scale-95"
          onClick={() => onAction(recommendation)}
        >
          <span>{actionLabel}</span>
          <ArrowRight className="size-3.5" />
        </Button>
        <span className="text-[10px] text-muted-foreground/70">
          Work continues with your context
        </span>
      </div>
    </div>
  );
}
