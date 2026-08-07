import type { ProviderSelection } from "@/lib/ai/types";

export interface WorkspaceSettings {
  theme: "dark" | "light";
  provider: ProviderSelection;
  memoryEnabled: boolean;
  contextPanelOpen: boolean;
}
