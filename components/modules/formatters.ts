import type { ModuleState } from "@/components/modules/types";

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatLineNumber(line: number, width: number): string {
  return String(line).padStart(width, "0");
}

export function formatSearchCount(count: number): string {
  return `${count} ${count === 1 ? "result" : "results"}`;
}

export function formatModuleStatus(state: ModuleState): string {
  if (state === "coming-soon") return "Coming soon";
  if (state === "loading") return "Loading";
  if (state === "error") return "Error";
  if (state === "empty") return "Empty";
  return "Ready";
}
