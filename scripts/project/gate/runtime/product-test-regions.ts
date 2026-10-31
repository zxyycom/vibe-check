import {
  PROJECT_GATE_PRODUCT_CHECK_SCOPES,
  PROJECT_GATE_KNOWN_CHECK_DIRECTORIES,
  PROJECT_GATE_SHARED_CHECK_DIRECTORIES
} from "./scope-files.ts";

const knownCheckDirectories = PROJECT_GATE_KNOWN_CHECK_DIRECTORIES;
const privateCheckDirectories = knownCheckDirectories.filter(
  (directory) => !PROJECT_GATE_SHARED_CHECK_DIRECTORIES.includes(directory)
);
type CheckDirectory = (typeof knownCheckDirectories)[number];

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
  "scripts/project/gate/runtime/scope-files.ts",
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

/** Affected-input regions; execution lanes and their complete test lists are unchanged. */
export const PROJECT_GATE_PRODUCT_TEST_REGIONS = Object.freeze({
  "product-duplicate-detection-tests": productCheckTestRegion(
    PROJECT_GATE_PRODUCT_CHECK_SCOPES["product-duplicate-detection-tests"].directories
  ),
  // The constructor consumes JSON implementation/helpers, not the JSON test bodies.
  "product-file-metrics-tests": productCheckTestRegion(
    [
      ...PROJECT_GATE_PRODUCT_CHECK_SCOPES["product-file-metrics-tests"].directories,
      "json-document",
      "json-validation"
    ],
    PROJECT_GATE_PRODUCT_CHECK_SCOPES["product-file-metrics-tests"].directories
  ),
  // Source identity evidence scans all src/** for archived Change reads, not just the analyzer.
  "product-function-metrics-tests": {
    patterns: [...productTestInputs, "licenses/lizard-1.24.1-provenance.json"]
  },
  "product-json-tests": productCheckTestRegion(
    PROJECT_GATE_PRODUCT_CHECK_SCOPES["product-json-tests"].directories
  ),
  "product-markdown-tests": productCheckTestRegion(
    PROJECT_GATE_PRODUCT_CHECK_SCOPES["product-markdown-tests"].directories
  ),
  "product-secret-detection-tests": productCheckTestRegion(
    PROJECT_GATE_PRODUCT_CHECK_SCOPES["product-secret-detection-tests"].directories
  ),
  // host-environment/project-files implementation and helpers remain shared inputs.
  "product-supporting-check-tests": productCheckTestRegion(
    PROJECT_GATE_PRODUCT_CHECK_SCOPES["product-supporting-check-tests"].directories
  ),
  "product-core-and-tools": {
    patterns: [
      "src/**",
      "scripts/project/gate/runtime/scope-files.ts",
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
