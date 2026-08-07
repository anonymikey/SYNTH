export interface SkillDefinition {
  id: string;
  label: string;
  description: string;
  instructions: string[];
  contextRequirements: string[];
  enabled: boolean;
}

export interface SkillContext {
  projectId?: string;
  intent?: string;
  selectedFile?: string;
}
