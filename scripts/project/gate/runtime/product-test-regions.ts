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
type CheckDirectory = PrivateCheckDirectory | "host-environment" | "project-files";

const knownCheckDirectories: readonly CheckDirectory[] = [
  ...privateCheckDirectories,
  "host-environment",
  "project-files"
];
// Only known owners' test bodies are independent inputs. Helpers and unknown paths
// retain the shared-source fallback, including after deletion or rename.
export const PROJECT_GATE_KNOWN_PRODUCT_TEST_DIRECTORIES = Object.freeze([
  ...knownCheckDirectories.map((directory) => `src/package-checks/${directory}`),
  "src/check",
  "src/check-settlement",
  "src/data-boundary",
  "src/machine-output",
  "src/package-tools",
  "src/project-definition",
  "src/project-run"
]);

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
  // The constructor consumes JSON implementation/helpers, not the JSON test bodies.
  "product-file-metrics-tests": productCheckTestRegion(
    ["file-metrics", "json-document", "json-validation"],
    ["file-metrics"]
  ),
  // Source identity evidence scans all src/** for archived Change reads, not just the analyzer.
  "product-function-metrics-tests": {
    patterns: [...productTestInputs, "licenses/lizard-1.24.1-provenance.json"]
  },
  "product-json-tests": productCheckTestRegion([
    "json-document",
    "json-schema-validation",
    "json-validation"
  ]),
  "product-markdown-tests": productCheckTestRegion(["markdown-link-validation", "markdown-lint"]),
  "product-secret-detection-tests": productCheckTestRegion(["secret-detection"]),
  // host-environment/project-files implementation and helpers remain shared inputs.
  "product-supporting-check-tests": productCheckTestRegion([
    "command-check",
    "maintenance-reminders",
    "host-environment",
    "project-files"
  ]),
  "product-runtime": {
    patterns: [
      "src/**",
      ...knownCheckDirectories.map((directory) => `!src/package-checks/${directory}/**/*.test.ts`)
    ]
  }
});

function productCheckTestRegion(
  inputDirectories: readonly CheckDirectory[],
  testDirectories: readonly CheckDirectory[] = inputDirectories
) {
  const ownedTestDirectories = testDirectories.map(
    (directory) => `src/package-checks/${directory}`
  );
  return {
    patterns: [
      ...productTestInputs,
      ...privateCheckDirectories
        .filter((directory) => !inputDirectories.includes(directory))
        .map((directory) => `!src/package-checks/${directory}/**`),
      ...PROJECT_GATE_KNOWN_PRODUCT_TEST_DIRECTORIES.filter(
        (directory) => !ownedTestDirectories.includes(directory)
      ).map((directory) => `!${directory}/**/*.test.ts`)
    ]
  };
}
