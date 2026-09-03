export const GENERATED_FUNCTION_METRICS_ANALYZER_FIXTURES =
  "src/package-checks/function-metrics/analyzer/fixtures/**";

export const workspaceFormatTargets = [
  ".codex/config.toml",
  ".oxlintrc.json",
  ".oxfmtrc.json",
  "mise.toml",
  "package.json",
  "pnpm-workspace.yaml",
  "scripts/test-evidence/ast-grep/sgconfig.yml",
  "scripts/test-evidence/supported-runner-profile.json",
  "scripts/test-evidence/ast-grep/rules/**/*.yml",
  "scripts/test-evidence/ast-grep/rule-tests/**/*.yml",
  "tsconfig.json",
  "tsconfig.product.json",
  "vibe-check.code-workspace",
  "src/**/*.ts",
  `!${GENERATED_FUNCTION_METRICS_ANALYZER_FIXTURES}`,
  "scripts/**/*.ts"
] as const;
