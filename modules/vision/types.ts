export interface VisionModuleDefinition {
  id: "vision";
  label: "SYNTH Vision";
  status: "available" | "coming-soon";
  capabilities: { generation: boolean; understanding: boolean; editing: boolean };
}
