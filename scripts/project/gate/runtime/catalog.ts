/** Closed focused selections exposed by the Project Gate command. */
export const PROJECT_GATE_PRESETS = Object.freeze([
  "docs",
  "lint",
  "quality",
  "test",
  "typecheck"
] as const);

export type ProjectGatePreset = (typeof PROJECT_GATE_PRESETS)[number];

/** Candidate-independent selection vocabulary shared by argv parsing and Definition projection. */
export const PROJECT_GATE_SELECTION = Object.freeze({
  complete: "all" as const,
  default: "required" as const,
  presets: PROJECT_GATE_PRESETS
});
