import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { workspaceFormatInvocation } from "../../development/format.ts";
import { lintInvocation } from "../../development/lint.ts";
import { typecheckInvocation } from "../../development/typecheck.ts";
import { defineConfig, type ProjectDefinition } from "@zxyycom/vibe-check";

import type { ProjectGateSelection } from "./runtime/controls.ts";
import { createDecisionRecordsCheck } from "./checks/decision-records.ts";
import { createDocsValidationCheck } from "./checks/docs-validation.ts";
import { defineProjectGateEntries, type ProjectGateEntry } from "./runtime/entries.ts";
import { projectGateCheckForSelection } from "./runtime/eligibility.ts";
import { createExternalConsumerMaterialCheck } from "./checks/external-consumer-material.ts";
import {
  createProjectGateCommonEntry,
  createProjectGateProcessEntry,
  type ProjectGateRuntime
} from "./checks/process-entry.ts";
import { createPreparedCandidateCheck } from "./checks/prepared-candidate.ts";
import {
  createRepositoryQualityChecks,
  type RepositoryQualityCheckOptions
} from "./checks/repository-quality.ts";
import { createTestEvidenceRuleTestsCheck } from "./checks/test-evidence/ast-grep-rule-tests-check.ts";
import { createTestEvidenceCheck } from "./checks/test-evidence/semantic-case-check.ts";
import {
  createProjectGateTestEntries,
  defineProjectGateTestChecks
} from "./checks/test-execution/entries.ts";
import { resolveProjectGateTestLanes } from "./checks/test-execution/lanes.ts";

const requiredAndFull = ["required", "full"] as const;
const documentationMaterialsMutex = ["project-gate-documentation-materials"] as const;
const packageLifecycleMutex = ["project-gate-package-lifecycle"] as const;
const packageAcceptanceTimeoutMs = 30_000;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const bytePreservedHistoricalV2RunSchema = "docs/schemas/historical/v2/vibe-check-run.schema.json";
const repositoryFileDefaults = {
  exclude: [
    "**/.git",
    "**/.git/**",
    "**/archive/**",
    "**/target/**",
    "**/node_modules/**",
    "**/.venv/**",
    "**/.uv-cache/**",
    "**/.ruff_cache/**",
    "**/dist/**",
    "**/build/**",
    "**/vendor/**",
    "**/generated/**",
    "**/fixtures/**",
    "**/.cache/**",
    "**/cache/**",
    "**/artifacts/**",
    "**/.tmp/**",
    "**/.log/**"
  ],
  source: "filesystem"
} as const;
const areaFileDefaults = {
  exclude: repositoryFileDefaults.exclude,
  source: repositoryFileDefaults.source
} as const;
const repositoryFileCodeLines = {
  lowDecisionTokenAllowance: { maximumCodeLines: 500, maximumDecisionTokens: 10 },
  maximum: 300
} as const;
const repositoryFunctionLimits = {
  codeLines: {
    lowComplexityAllowance: { cyclomaticComplexityBelow: 5, maximum: 150 },
    maximum: 50
  },
  cyclomaticComplexity: { maximum: 10 },
  parameters: { maximum: 5 }
} as const;

/** Complete repository-quality policy owned by this Gate Definition. */
export const PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS = {
  duplicateDetection: {
    codeAreas: {
      "docs-specs": {
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "docs/examples/**", "docs/schemas/**"],
          include: ["docs/**/*.md", "changes/**/*.md"]
        },
        minimumLines: 3,
        minimumTokens: 150
      },
      "product-source": {
        files: { ...areaFileDefaults, include: ["src/**/*.ts"] },
        minimumLines: 3,
        minimumTokens: 75
      },
      "schemas-examples": {
        files: {
          ...areaFileDefaults,
          include: ["docs/schemas/**", "docs/examples/**"]
        },
        minimumLines: 3,
        minimumTokens: 150
      },
      "script-tests": {
        files: { ...areaFileDefaults, include: ["scripts/**/*.test.ts"] },
        minimumLines: 3,
        minimumTokens: 100
      },
      "script-tooling": {
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "scripts/**/*.test.ts"],
          include: ["scripts/**/*.ts"]
        },
        minimumLines: 3,
        minimumTokens: 75
      }
    },
    findingPolicy: "non-blocking"
  },
  fileMetrics: {
    codeAreas: {
      "docs-specs": {
        codeLines: repositoryFileCodeLines,
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "docs/examples/**", "docs/schemas/**"],
          include: ["docs/**/*.md", "changes/**/*.md"]
        }
      },
      "product-source": {
        codeLines: repositoryFileCodeLines,
        files: { ...areaFileDefaults, include: ["src/**/*.ts"] }
      },
      "schemas-examples": {
        codeLines: repositoryFileCodeLines,
        files: { ...areaFileDefaults, include: ["docs/schemas/**", "docs/examples/**"] }
      },
      "script-tooling": {
        codeLines: repositoryFileCodeLines,
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "scripts/**/*.test.ts"],
          include: ["scripts/**/*.ts"]
        }
      }
    },
    findingPolicy: "non-blocking",
    findingWaivers: [
      {
        identity: { metric: "code-lines", path: bytePreservedHistoricalV2RunSchema },
        reason: "Historical v2 schema bytes and URN must remain unchanged."
      }
    ]
  },
  functionMetrics: {
    codeAreas: {
      "product-source": {
        files: { ...areaFileDefaults, include: ["src/**/*.ts"] },
        limits: repositoryFunctionLimits
      },
      "script-tooling": {
        files: {
          ...areaFileDefaults,
          exclude: [...areaFileDefaults.exclude, "scripts/**/*.test.ts"],
          include: ["scripts/**/*.ts"]
        },
        limits: repositoryFunctionLimits
      }
    },
    findingPolicy: "non-blocking"
  },
  markdownLinkValidation: {
    files: {
      ...areaFileDefaults,
      include: ["docs/**/*.md", "changes/**/*.md"]
    },
    findingPolicy: "non-blocking"
  }
} as const satisfies RepositoryQualityCheckOptions;

/** Complete configuration for the Gate's test execution Checks. */
const PROJECT_GATE_TEST_CHECKS = defineProjectGateTestChecks([
  {
    checkId: "tests-package-supporting",
    displayName: "Bun package calculation and material tests",
    lane: "packageSupporting",
    tags: ["scripts", "tests"]
  },
  {
    checkId: "tests-package-candidate",
    displayName: "Bun package candidate lifecycle acceptance",
    lane: "packageCandidate",
    mutex: packageLifecycleMutex,
    tags: ["package-tests", "tests"],
    timeoutMs: packageAcceptanceTimeoutMs
  },
  {
    candidateInput: "artifact",
    checkId: "tests-package-artifact",
    displayName: "Bun package artifact acceptance",
    lane: "packageArtifact",
    tags: ["package-tests", "tests"],
    timeoutMs: packageAcceptanceTimeoutMs
  },
  {
    candidateInput: "external-consumer",
    checkId: "tests-package-consumer-types",
    displayName: "Bun external package consumer type acceptance",
    lane: "packageConsumerTypes",
    tags: ["package-tests", "tests"],
    timeoutMs: packageAcceptanceTimeoutMs
  },
  {
    candidateInput: "external-consumer",
    checkId: "tests-package-consumer-docs",
    displayName: "Bun external package consumer documentation acceptance",
    lane: "packageConsumerDocs",
    tags: ["package-tests", "tests"],
    timeoutMs: packageAcceptanceTimeoutMs
  },
  {
    candidateInput: "external-consumer",
    checkId: "tests-package-consumer-runtime",
    displayName: "Bun external package consumer runtime acceptance",
    lane: "packageConsumerRuntime",
    tags: ["package-tests", "tests"],
    timeoutMs: packageAcceptanceTimeoutMs
  },
  {
    checkId: "tests-product-duplicate-detection",
    displayName: "Bun Product duplicate detection tests",
    lane: "productDuplicateDetection",
    tags: ["product", "tests"]
  },
  {
    checkId: "tests-product-file-metrics",
    displayName: "Bun Product file metrics tests",
    lane: "productFileMetrics",
    tags: ["product", "tests"]
  },
  {
    checkId: "tests-product-function-metrics",
    displayName: "Bun Product function metrics tests",
    lane: "productFunctionMetrics",
    tags: ["product", "tests"]
  },
  {
    checkId: "tests-product-json",
    displayName: "Bun Product JSON tests",
    lane: "productJsonChecks",
    tags: ["product", "tests"]
  },
  {
    checkId: "tests-product-markdown-links",
    displayName: "Bun Product Markdown link tests",
    lane: "productMarkdownLinks",
    tags: ["product", "tests"]
  },
  {
    checkId: "tests-product-supporting-checks",
    displayName: "Bun Product supporting Check tests",
    lane: "productSupportingChecks",
    tags: ["product", "tests"]
  },
  {
    checkId: "tests-product-runtime",
    displayName: "Bun Product runtime tests",
    lane: "productRuntime",
    tags: ["product", "tests"]
  },
  {
    checkId: "tests-scripts-project",
    displayName: "Bun Project tooling tests",
    lane: "scriptsProject",
    tags: ["scripts", "tests"]
  },
  {
    checkId: "tests-scripts-test-evidence",
    displayName: "Bun Test Evidence tooling tests",
    lane: "scriptsTestEvidence",
    tags: ["scripts", "tests"]
  },
  {
    checkId: "tests-scripts-validation",
    displayName: "Bun validation tooling tests",
    lane: "scriptsValidation",
    mutex: documentationMaterialsMutex,
    tags: ["scripts", "tests"]
  },
  {
    checkId: "tests-scripts-tooling",
    displayName: "Bun ordinary script tooling tests",
    lane: "scriptsTooling",
    tags: ["scripts", "tests"]
  }
]);

export type { ProjectGateRuntime } from "./checks/process-entry.ts";

/** Creates this invocation's project-private ordinary Check entries. */
export function createProjectGateEntries(runtime: ProjectGateRuntime): readonly ProjectGateEntry[] {
  const testLanes = resolveProjectGateTestLanes(repositoryRoot);
  const preparedCandidate = createPreparedCandidateCheck(runtime.preparedCandidate);
  const repositoryQuality = createRepositoryQualityChecks(PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS);
  const externalConsumer = createExternalConsumerMaterialCheck({
    invocationLogDirectory: runtime.invocationLogDirectory,
    lease: runtime.externalConsumerLease,
    preparedCandidateCheckId: preparedCandidate.checkId,
    timeoutMs: packageAcceptanceTimeoutMs
  });
  return defineProjectGateEntries([
    createProjectGateProcessEntry({
      invocation: typecheckInvocation("product"),
      checkId: "typecheck-product",
      displayName: "TypeScript product typecheck and import boundary",
      profiles: requiredAndFull,
      tags: ["product"],
      runtime
    }),
    createProjectGateProcessEntry({
      invocation: lintInvocation("product"),
      checkId: "lint-product",
      displayName: "TypeScript product lint",
      profiles: requiredAndFull,
      tags: ["product"],
      runtime
    }),
    createProjectGateProcessEntry({
      invocation: typecheckInvocation("scripts"),
      checkId: "typecheck-scripts",
      displayName: "TypeScript script typecheck",
      profiles: requiredAndFull,
      tags: ["scripts"],
      runtime
    }),
    createProjectGateProcessEntry({
      invocation: lintInvocation("scripts"),
      checkId: "lint-scripts",
      displayName: "TypeScript script lint",
      profiles: requiredAndFull,
      tags: ["scripts"],
      runtime
    }),
    createProjectGateProcessEntry({
      invocation: workspaceFormatInvocation("check"),
      checkId: "format-check",
      displayName: "Source format",
      profiles: requiredAndFull,
      tags: ["format"],
      runtime
    }),
    commonEntry(preparedCandidate, ["tests"]),
    commonEntry(
      Object.freeze({ ...externalConsumer, mutex: Object.freeze([...packageLifecycleMutex]) }),
      ["package-tests", "tests"]
    ),
    ...createProjectGateTestEntries({
      definitions: PROJECT_GATE_TEST_CHECKS,
      externalConsumer,
      lanes: testLanes,
      preparedCandidate,
      profiles: requiredAndFull,
      repositoryRoot,
      runtime
    }),
    commonEntry(repositoryQuality.duplicateDetection, ["quality"]),
    commonEntry(repositoryQuality.fileMetrics, ["quality"]),
    commonEntry(repositoryQuality.functionMetrics, ["quality"]),
    commonEntry(repositoryQuality.markdownLinkValidation, ["quality"]),
    commonEntry(
      createDocsValidationCheck({
        checkId: "docs-json-validator",
        displayName: "Docs JSON validator",
        task: "json"
      }),
      ["docs"]
    ),
    commonEntry(
      createDocsValidationCheck({
        checkId: "docs-schema-validator",
        displayName: "Docs schema validator",
        task: "schema"
      }),
      ["docs"],
      documentationMaterialsMutex
    ),
    commonEntry(
      createDocsValidationCheck({
        checkId: "docs-example-validator",
        displayName: "Docs example validator",
        task: "examples"
      }),
      ["docs"],
      documentationMaterialsMutex
    ),
    commonEntry(
      createDocsValidationCheck({
        checkId: "docs-links-validator",
        displayName: "Documentation path existence validation",
        task: "links"
      }),
      ["docs"]
    ),
    commonEntry(createDecisionRecordsCheck(), ["catalog"]),
    commonEntry(createTestEvidenceCheck(), ["catalog", "tests"]),
    commonEntry(createTestEvidenceRuleTestsCheck(runtime.invocationLogDirectory), [
      "catalog",
      "tests"
    ]),
    createProjectGateProcessEntry({
      invocation: { args: ["diff", "--check"], command: "git", cwd: repositoryRoot },
      checkId: "git-diff-whitespace",
      displayName: "Git diff whitespace",
      profiles: requiredAndFull,
      tags: ["git"],
      runtime
    })
  ]);
}

/** Projects entry eligibility into one ordinary Project Definition. */
export function createProjectGateDefinition(
  entries: readonly ProjectGateEntry[],
  selection: ProjectGateSelection
): ProjectDefinition {
  return defineConfig({
    checks: entries.map((entry) => projectGateCheckForSelection(entry, selection)),
    outputs: {
      diagnosticLogging: { enabled: false },
      machinePublication: { enabled: false },
      progressRendering: { enabled: true }
    },
    scheduler: { maxParallel: 3 }
  });
}

function commonEntry(
  check: import("@zxyycom/vibe-check").Check,
  tags: readonly import("./runtime/catalog.ts").ProjectGateTag[],
  mutex?: readonly string[]
): ProjectGateEntry {
  return createProjectGateCommonEntry(check, requiredAndFull, tags, mutex);
}
