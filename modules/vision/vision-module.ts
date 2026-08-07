import type { VisionModuleDefinition } from "@/modules/vision/types";

export const synthVisionModule: VisionModuleDefinition = {
  id: "vision",
  label: "SYNTH Vision",
  status: "coming-soon",
  capabilities: { generation: false, understanding: false, editing: false },
};
