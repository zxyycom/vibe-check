export const foundationFormatTargets = [
  "scripts/tools/foundation/package.json",
  "scripts/tools/foundation/tsconfig.json",
  "scripts/tools/foundation/src/**/*.ts",
  "scripts/tools/foundation/test/**/*.ts"
] as const;

export const workspaceFormatTargets = [
  ".codex/config.toml",
  ".oxlintrc.json",
  ".oxfmtrc.json",
  "mise.toml",
  "package.json",
  "pnpm-workspace.yaml",
  "scripts/test-evidence/sgconfig.yml",
  "scripts/test-evidence/supported-runner-profile.json",
  "scripts/test-evidence/rules/**/*.yml",
  "scripts/test-evidence/rule-tests/**/*.yml",
  "scripts/tools/foundation/package.json",
  "scripts/tools/foundation/tsconfig.json",
  "tsconfig.json",
  "tsconfig.product.json",
  "vibe-check.code-workspace",
  "src/product/**/*.ts",
  "scripts/**/*.ts"
] as const;
