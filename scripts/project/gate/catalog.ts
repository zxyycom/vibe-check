export const PROJECT_GATE_PROFILES = ["required", "full"] as const;
export type ProjectGateProfile = (typeof PROJECT_GATE_PROFILES)[number];

export const PROJECT_GATE_TAGS = [
  "catalog",
  "docs",
  "format",
  "git",
  "package-tests",
  "product",
  "scripts",
  "tests"
] as const;
export type ProjectGateTag = (typeof PROJECT_GATE_TAGS)[number];

export const PROJECT_GATE_OPT_IN_TAGS = [
  "package-tests"
] as const satisfies readonly ProjectGateTag[];
export type ProjectGateOptInTag = (typeof PROJECT_GATE_OPT_IN_TAGS)[number];
