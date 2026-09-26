/** Only known private Check inputs may be excluded; other source paths stay shared. */
const privateCheckDirectories = [
  "command-check",
  "duplicate-detection",
  "file-metrics",
  "function-metrics",
  "json-document",
  "json-schema-validation",
  "json-validation",
  "maintenance-reminders",
  "markdown-link-validation",
  "markdown-lint",
  "secret-detection"
] as const;

type PrivateCheckDirectory = (typeof privateCheckDirectories)[number];

const productTestInputs = [
  "src/**",
  "scripts/project/gate/checks/test-execution/**",
  "scripts/test-evidence/discovery/**",
  "scripts/test-evidence/profile.ts",
  "scripts/test-evidence/relative-path.ts",
  "scripts/test-evidence/supported-runner-profile.json",
  "scripts/value-guards.ts",
  "package.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tsconfig*.json",
  "bunfig.toml",
  "mise.toml",
  "mise.lock"
] as const;

/** Required-only regions; execution lanes and their complete test lists are unchanged. */
export const PROJECT_GATE_PRODUCT_TEST_REGIONS = Object.freeze({
  "product-duplicate-detection-tests": productCheckTestRegion(["duplicate-detection"]),
  // The file-metrics constructor tests also execute jsonValidation and its document reader.
  "product-file-metrics-tests": productCheckTestRegion([
    "file-metrics",
    "json-document",
    "json-validation"
  ]),
  // Source identity evidence scans all src/** for archived Change reads, not just the analyzer.
  "product-function-metrics-tests": {
    include: [...productTestInputs, "licenses/lizard-1.24.0-provenance.json"],
    exclude: []
  },
  "product-json-tests": productCheckTestRegion([
    "json-document",
    "json-schema-validation",
    "json-validation"
  ]),
  "product-markdown-tests": productCheckTestRegion(["markdown-link-validation", "markdown-lint"]),
  "product-secret-detection-tests": productCheckTestRegion(["secret-detection"]),
  // host-environment and project-files are shared inputs, so they are never excluded.
  "product-supporting-check-tests": productCheckTestRegion([
    "command-check",
    "maintenance-reminders"
  ])
});

function productCheckTestRegion(inputDirectories: readonly PrivateCheckDirectory[]) {
  return {
    include: [...productTestInputs],
    exclude: privateCheckDirectories
      .filter((directory) => !inputDirectories.includes(directory))
      .map((directory) => `src/package-checks/${directory}/**`)
  };
}
