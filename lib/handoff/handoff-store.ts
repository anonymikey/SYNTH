import type { SynthHandoff } from "@/lib/handoff/types";
import { ConsoleAuditLogger } from "@/lib/ai/audit-logger";

const STORAGE_KEY = "synth_active_handoff";

let memoryHandoff: SynthHandoff | null = null;

export const HandoffStore = {
  set(handoff: SynthHandoff): void {
    memoryHandoff = handoff;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(handoff));
      } catch {
        // Ignore quota/storage errors
      }
      window.dispatchEvent(new CustomEvent("synth:handoff", { detail: handoff }));
    }
  },

  get(): SynthHandoff | null {
    if (memoryHandoff) return memoryHandoff;
    if (typeof window !== "undefined") {
      try {
        const stored = window.sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          memoryHandoff = JSON.parse(stored) as SynthHandoff;
          return memoryHandoff;
        }
      } catch {
        return null;
      }
    }
    return null;
  },

  consume(expectedDestination?: string): SynthHandoff | null {
    const current = this.get();
    if (!current) return null;
    if (expectedDestination && current.destination !== expectedDestination) {
      return null;
    }
    // Clear storage after consumption
    this.clear();
    return current;
  },

  clear(): void {
    memoryHandoff = null;
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  },

  executeHandoff(handoff: SynthHandoff): void {
    ConsoleAuditLogger.capability_handoff?.({
      source: handoff.source,
      destination: handoff.destination,
      intent: handoff.intent,
      status: "executed",
      timestamp: new Date().toISOString(),
    });
    this.set(handoff);
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("synth:navigate", {
          detail: {
            destination: handoff.destination,
            handoff,
          },
        })
      );
    }
  },
};
