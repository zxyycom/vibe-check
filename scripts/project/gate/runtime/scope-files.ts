/** Gate-owned file boundaries. Trigger dependencies and metric policy are separate consumers. */
export const PROJECT_GATE_PRODUCT_CHECK_SCOPES = {
  "product-duplicate-detection-tests": productCheckScope("productDuplicateDetection", [
    "duplicate-detection"
  ]),
  "product-file-metrics-tests": productCheckScope("productFileMetrics", ["file-metrics"]),
  "product-function-metrics-tests": productCheckScope("productFunctionMetrics", [
    "function-metrics"
  ]),
  "product-json-tests": productCheckScope("productJsonChecks", [
    "json-document",
    "json-schema-validation",
    "json-validation"
  ]),
  "product-markdown-tests": productCheckScope("productMarkdown", [
    "markdown-link-validation",
    "markdown-lint"
  ]),
  "product-secret-detection-tests": productCheckScope("productSecretDetection", [
    "secret-detection"
  ]),
  "product-supporting-check-tests": productCheckScope("productSupportingChecks", [
    "command-check",
    "host-environment",
    "maintenance-reminders",
    "project-files"
  ])
};

function productCheckScope<const Lane extends string, const Directories extends readonly string[]>(
  lane: Lane,
  directories: Directories
) {
  return { lane, directories, patterns: productCheckScopePatterns(directories) };
}

export const PROJECT_GATE_SHARED_CHECK_DIRECTORIES: readonly string[] = [
  "host-environment",
  "project-files"
];

export const PROJECT_GATE_KNOWN_CHECK_DIRECTORIES = Object.values(
  PROJECT_GATE_PRODUCT_CHECK_SCOPES
).flatMap(({ directories }) => [...directories]);

export function productCheckScopePatterns(directories: readonly string[]): readonly string[] {
  return directories.map((directory) => `src/package-checks/${directory}/**`);
}

/** Existing metric comparison groups: a domain must not silently redefine duplicate boundaries. */
export const PROJECT_GATE_METRIC_FILES = {
  "product-source": { patterns: ["src/**/*.ts"] },
  "script-tooling": { patterns: ["scripts/**/*.ts", "!scripts/**/*.test.ts"] },
  "script-tests": { patterns: ["scripts/**/*.test.ts"] },
  "docs-specs": { patterns: ["docs/**/*.md", "changes/**/*.md"] },
  "schemas-examples": { patterns: ["docs/schemas/**", "docs/examples/**"] }
} as const;

/** Explicit domains, not affected-input regions. Historical *-tests names remain valid. */
export const PROJECT_GATE_SCOPE_FILES = {
  ...PROJECT_GATE_PRODUCT_CHECK_SCOPES,
  "product-source": PROJECT_GATE_METRIC_FILES["product-source"],
  "script-source": { patterns: ["scripts/**/*.ts"] },
  "product-core-and-tools": {
    patterns: [
      ...PROJECT_GATE_METRIC_FILES["product-source"].patterns,
      ...productCheckScopePatterns(PROJECT_GATE_KNOWN_CHECK_DIRECTORIES).map((path) => `!${path}`)
    ]
  },
  "project-tests": { patterns: ["scripts/project/gate/**"] },
  "project-selection-tests": {
    patterns: ["scripts/project/gate/runtime/**", "scripts/project/gate/definition.ts"]
  },
  "package-tests": { patterns: ["scripts/package/**", "scripts/docs/**"] },
  "test-evidence-tests": { patterns: ["scripts/test-evidence/**"] },
  "validation-tests": { patterns: ["scripts/validation/**"] },
  "machine-artifact-tests": {
    patterns: [
      "scripts/validation/repository-material/machine-artifacts/**",
      "scripts/docs/machine-artifacts/**"
    ]
  },
  "layout-tests": {
    patterns: [
      "scripts/validation/repository-layout*.ts",
      "scripts/validation/import-boundaries.ts"
    ]
  },
  "package-tools-boundary-tests": {
    patterns: [
      "scripts/validation/package-tools-*.ts",
      "scripts/validation/function-metrics-analyzer-boundary.ts"
    ]
  },
  "script-tooling-tests": {
    patterns: [
      "scripts/**",
      "!scripts/project/gate/**",
      "!scripts/project/admission-workbench/**",
      "!scripts/package/**",
      "!scripts/test-evidence/**",
      "!scripts/validation/**"
    ]
  },
  documentation: {
    patterns: [...PROJECT_GATE_METRIC_FILES["docs-specs"].patterns, "README.md", "AGENTS.md"]
  },
  "markdown-lint-input": {
    patterns: [...PROJECT_GATE_METRIC_FILES["docs-specs"].patterns, "README.md", "AGENTS.md"]
  },
  "decision-input": { patterns: ["docs/decisions/**/*.md"] },
  "material-json-input": { patterns: ["docs/**/*.json"] },
  "material-schema-input": {
    patterns: ["docs/schemas/**", "docs/examples/historical/v1/*-report.json"]
  },
  "material-schema-publication-input": { patterns: ["docs/schemas/**"] },
  "material-examples-input": { patterns: ["docs/examples/artifacts/**"] }
} as const;

export type ProjectGateFileScope = keyof typeof PROJECT_GATE_SCOPE_FILES;
export type ProjectGateMetric = "duplicateDetection" | "fileMetrics" | "functionMetrics";

const documentScopes: readonly ProjectGateFileScope[] = [
  "documentation",
  "markdown-lint-input",
  "decision-input"
];
const materialScopes: readonly ProjectGateFileScope[] = [
  "material-json-input",
  "material-schema-input",
  "material-schema-publication-input",
  "material-examples-input"
];

/** Capability describes applicable measurement, not scanner thresholds or Check membership. */
export function projectGateMetricScopes(
  metric: ProjectGateMetric
): readonly ProjectGateFileScope[] {
  return Object.keys(PROJECT_GATE_SCOPE_FILES)
    .filter(isProjectGateFileScope)
    .filter((scope) => {
      if (scope === "material-examples-input") return false;
      if (documentScopes.includes(scope)) return metric === "fileMetrics";
      return !materialScopes.includes(scope) || metric !== "functionMetrics";
    });
}

export function isProjectGateFileScope(scope: string): scope is ProjectGateFileScope {
  return Object.hasOwn(PROJECT_GATE_SCOPE_FILES, scope);
}
