import type { VisionModuleDefinition } from "@/modules/vision/types";

export const synthVisionModule: VisionModuleDefinition = {
  id: "vision",
  label: "SYNTH Vision",
  status: "available",
  capabilities: { generation: true, understanding: false, editing: false },
};
