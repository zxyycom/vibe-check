export const PROJECT_GATE_PROFILES = ["required", "full"] as const;
export type ProjectGateProfile = (typeof PROJECT_GATE_PROFILES)[number];

export const PROJECT_GATE_TAGS = [
  "catalog",
  "docs",
  "format",
  "git",
  "product",
  "quality",
  "scripts",
  "tests"
] as const;
export type ProjectGateTag = (typeof PROJECT_GATE_TAGS)[number];
