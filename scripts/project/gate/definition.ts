import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { PreparedPackageCandidate } from "../../package/candidate/prepare.ts";
import { workspaceFormatInvocation } from "../../development/format.ts";
import { workspaceFormatTargets } from "../../development/format-targets.ts";
import { lintInvocation } from "../../development/lint.ts";
import { typecheckInvocation } from "../../development/typecheck.ts";
import type { ProcessInvocation } from "../../process-execution/command.ts";
import {
  commandCheck,
  createLearnedCriticalPathStrategy,
  defineConfig,
  jsonSchemaValidation,
  jsonValidation,
  type ProjectDefinition,
  type RunControls,
  type SchedulerGraphSnapshot
} from "@zxyycom/vibe-check";

import type { ProjectGateResultContributor } from "./runtime/result-contributor.ts";
import { evaluateProjectGatePerformance } from "./runtime/performance-observation.ts";
import { createDecisionRecordsCheck } from "./checks/decision-records.ts";
import { createMaterialValidationCheck } from "./checks/materials-validation.ts";
import {
  validateRepositoryMaterialExamples,
  validateRepositoryMaterialLinks,
  validateRepositoryMaterialSchemaPublication
} from "../../validation/repository-material/workflow.ts";
import { REPOSITORY_MATERIAL_JSON_MAXIMUM_BYTES } from "../../validation/repository-material/task-contract.ts";
import { defineProjectGateEntries, type ProjectGateEntry } from "./runtime/entries.ts";
import {
  PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS,
  projectGateFlagControlledCheck
} from "./runtime/eligibility.ts";
import { PROJECT_GATE_SELECTION } from "./runtime/catalog.ts";
import {
  createExternalConsumerMaterialCheck,
  type ExternalConsumerMaterialLease
} from "./checks/external-consumer-material.ts";
import { createProjectGateCommandEntry } from "./checks/entry-factories.ts";
import { createPreparedCandidateCheck } from "./checks/prepared-candidate.ts";
import {
  createRepositoryQualityChecks,
  PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS
} from "./checks/repository-quality.ts";
import { createOxfmtFailureProjection } from "./checks/oxfmt-failure-records.ts";
import { createOxlintFailureProjection } from "./checks/oxlint-failure-records.ts";
import type { ProcessFailureProjection } from "./checks/process/failure-projection.ts";
import { settleProjectGateCommand } from "./checks/command-result.ts";
import { createTestEvidenceRuleTestsCheck } from "./checks/test-evidence/ast-grep-rule-tests-check.ts";
import { createTestEvidenceCheck } from "./checks/test-evidence/semantic-case-check.ts";
import { createProjectGateTestEntries } from "./checks/test-execution/entries.ts";
import { createProjectGateTestCheckDefinitions } from "./checks/test-execution/checks.ts";
import { resolveProjectGateTestLanes } from "./checks/test-execution/lanes.ts";

const repositoryMaterialsMutex = ["project-gate-repository-materials"] as const;
const packageLifecycleMutex = ["project-gate-package-lifecycle"] as const;
const packageAcceptanceTimeoutMs = 30_000;
const projectGateCommandTimeoutMs = 30_000;
const gateCommandOutputByteLimit = 1024 * 1024;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const projectGateBunTestRunnerResourceClaims = Object.freeze({
  "project-gate-bun-test-runners": 1
});
const projectGateRepositoryScanResourceClaims = Object.freeze({
  "project-gate-repository-scans": 1
});

/** Reuses the public strict JSON Check for repository-owned JSON material. */
function createRepositoryJsonMaterialCheck() {
  return jsonValidation({
    checkId: "materials-json-validator",
    files: { include: ["docs/**/*.json"] },
    maximumBytes: REPOSITORY_MATERIAL_JSON_MAXIMUM_BYTES
  });
}

/** Reuses the public Schema Check for the registered schemas and report-example bindings. */
function createRepositorySchemaMaterialCheck() {
  return jsonSchemaValidation({
    bindings: [
      "diagnostic-report",
      "empty-scope-report",
      "gate-failing-report",
      "passing-report"
    ].map((id) => ({
      id,
      instancePath: `docs/examples/json/${id}.json`,
      schemaId: "https://vibe-check.local/schemas/vibe-check-report.schema.json"
    })),
    checkId: "materials-schema-validator",
    files: { include: ["docs/schemas/**/*.json", "docs/examples/json/*-report.json"] },
    maximumBytes: REPOSITORY_MATERIAL_JSON_MAXIMUM_BYTES,
    schemas: [
      {
        id: "urn:vibe-check:schema:record:v4",
        path: "docs/schemas/vibe-check-record.schema.json"
      },
      {
        id: "https://vibe-check.local/schemas/vibe-check-report.schema.json",
        path: "docs/schemas/vibe-check-report.schema.json"
      },
      { id: "urn:vibe-check:schema:run:v4", path: "docs/schemas/vibe-check-run.schema.json" },
      {
        id: "urn:vibe-check:schema:record:v2",
        path: "docs/schemas/historical/v2/vibe-check-record.schema.json"
      },
      {
        id: "urn:vibe-check:schema:run:v2",
        path: "docs/schemas/historical/v2/vibe-check-run.schema.json"
      }
    ]
  });
}

/**
 * Project-owned post-processing run after one candidate-backed Product result.
 *
 * This trusted repository function returns a synchronous or asynchronous
 * restricted contribution; the adapter constructs the sole final Gate result.
 */

/** Run-level configuration kept beside the central Check composition manifest. */
export const PROJECT_GATE_RUN_CONFIG = Object.freeze({
  resultContributor: evaluateProjectGatePerformance satisfies ProjectGateResultContributor,
  definitionOutputs: Object.freeze({
    diagnosticLogging: Object.freeze({ enabled: false }),
    machinePublication: Object.freeze({ enabled: false }),
    progressRendering: Object.freeze({ enabled: true })
  }),
  invocationOutputs: Object.freeze({
    diagnosticLogging: Object.freeze({ enabled: true }),
    machinePublication: Object.freeze({ enabled: true })
  }),
  selection: PROJECT_GATE_SELECTION,
  scheduler: Object.freeze({
    admissionPolicy: Object.freeze({
      kind: "custom" as const,
      strategy: createLearnedCriticalPathStrategy({
        identityForTask: (task: SchedulerGraphSnapshot["tasks"][number]) => ({
          gateStrategy: "v1",
          taskId: task.taskId
        }),
        stateDirectory: resolve(repositoryRoot, ".cache/vibe-check/scheduler-history")
      })
    }),
    maxParallel: 3,
    resourceCapacities: Object.freeze({
      "project-gate-bun-test-runners": 2,
      "project-gate-repository-scans": 2
    })
  })
});

const projectGateTestChecks = createProjectGateTestCheckDefinitions({
  repositoryMaterialsMutex,
  packageAcceptanceTimeoutMs
});

/** Runtime material bound to one Project Gate invocation. */
export interface ProjectGateRuntime {
  readonly externalConsumerLease: ExternalConsumerMaterialLease;
  readonly preparedCandidate: PreparedPackageCandidate;
}

interface LintProductCheckInput {
  readonly failureProjection: ProcessFailureProjection;
  readonly invocation: Pick<ProcessInvocation, "args" | "command" | "cwd">;
}

/** Uses Product command lifecycle while retaining Gate-owned oxlint failure projection. */
export function createLintProductCheck(input?: LintProductCheckInput) {
  const invocation = input?.invocation ?? lintInvocation("product", "json");
  const failureProjection =
    input?.failureProjection ??
    createOxlintFailureProjection({
      scope: "product",
      workspaceRoot: repositoryRoot
    });
  return commandCheck({
    arguments: invocation.args,
    checkId: "lint-product",
    displayName: "TypeScript product lint",
    environment: { mode: "inherit" },
    executable: invocation.command,
    output: { mode: "transcript" },
    outputByteLimit: gateCommandOutputByteLimit,
    timeoutMs: projectGateCommandTimeoutMs,
    workingDirectory: invocation.cwd,
    afterCommand: {
      execute: (context) =>
        settleProjectGateCommand({
          command: invocation.command,
          context,
          failureProjection
        })
    }
  });
}

/** Declares the complete Gate in execution-independent display order. */
export function createProjectGateEntries(runtime: ProjectGateRuntime): readonly ProjectGateEntry[] {
  const testLanes = resolveProjectGateTestLanes(repositoryRoot);
  const preparedCandidate = createPreparedCandidateCheck(runtime.preparedCandidate);
  const repositoryQuality = createRepositoryQualityChecks(PROJECT_GATE_REPOSITORY_QUALITY_OPTIONS);
  const externalConsumer = createExternalConsumerMaterialCheck({
    lease: runtime.externalConsumerLease,
    preparedCandidateCheckId: preparedCandidate.checkId,
    timeoutMs: packageAcceptanceTimeoutMs
  });
  return defineProjectGateEntries([
    createProjectGateCommandEntry({
      invocation: typecheckInvocation("product"),
      checkId: "typecheck-product",
      displayName: "TypeScript product typecheck and import boundary",
      presets: ["typecheck"],
      required: true
    }),
    {
      check: createLintProductCheck(),
      presets: ["lint"],
      required: true
    },
    createProjectGateCommandEntry({
      invocation: typecheckInvocation("scripts"),
      checkId: "typecheck-scripts",
      displayName: "TypeScript script typecheck",
      presets: ["typecheck"],
      required: true
    }),
    createProjectGateCommandEntry({
      failureProjection: createOxlintFailureProjection({
        scope: "scripts",
        workspaceRoot: repositoryRoot
      }),
      invocation: lintInvocation("scripts", "json"),
      checkId: "lint-scripts",
      displayName: "TypeScript script lint",
      presets: ["lint"],
      required: true
    }),
    createProjectGateCommandEntry({
      failureProjection: createOxfmtFailureProjection({
        targets: workspaceFormatTargets,
        workspaceRoot: repositoryRoot
      }),
      invocation: workspaceFormatInvocation("list-different"),
      checkId: "format-check",
      displayName: "Source format",
      presets: [],
      required: true
    }),
    { check: preparedCandidate, presets: [], required: true },
    {
      check: externalConsumer,
      mutex: packageLifecycleMutex,
      presets: [],
      required: false
    },
    ...createProjectGateTestEntries({
      definitions: projectGateTestChecks,
      externalConsumer,
      lanes: testLanes,
      preparedCandidate,
      repositoryRoot,
      resourceClaims: projectGateBunTestRunnerResourceClaims
    }),
    {
      check: repositoryQuality.duplicateDetection,
      presets: ["quality"],
      required: true,
      resourceClaims: projectGateRepositoryScanResourceClaims
    },
    {
      check: repositoryQuality.fileMetrics,
      presets: ["quality"],
      required: true,
      resourceClaims: projectGateRepositoryScanResourceClaims
    },
    {
      check: repositoryQuality.functionMetrics,
      presets: ["quality"],
      required: true,
      resourceClaims: projectGateRepositoryScanResourceClaims
    },
    {
      check: repositoryQuality.markdownLint,
      presets: ["materials", "quality"],
      required: true,
      resourceClaims: projectGateRepositoryScanResourceClaims
    },
    {
      check: repositoryQuality.markdownLinkValidation,
      presets: ["materials", "quality"],
      required: true,
      resourceClaims: projectGateRepositoryScanResourceClaims
    },
    {
      check: createRepositoryJsonMaterialCheck(),
      presets: ["materials"],
      required: true
    },
    {
      check: createRepositorySchemaMaterialCheck(),
      mutex: repositoryMaterialsMutex,
      presets: ["materials"],
      required: true
    },
    {
      check: createMaterialValidationCheck({
        checkId: "materials-schema-publication-validator",
        displayName: "Repository schema publication material validator",
        focusedCommand: "bun run validate -- materials schema",
        validate: validateRepositoryMaterialSchemaPublication
      }),
      mutex: repositoryMaterialsMutex,
      presets: ["materials"],
      required: true
    },
    {
      check: createMaterialValidationCheck({
        checkId: "materials-examples-validator",
        displayName: "Repository publication and machine example material validator",
        focusedCommand: "bun run validate -- materials examples",
        validate: validateRepositoryMaterialExamples
      }),
      mutex: repositoryMaterialsMutex,
      presets: ["materials"],
      required: true
    },
    {
      check: createMaterialValidationCheck({
        checkId: "materials-links-validator",
        displayName: "Repository material link validation",
        focusedCommand: "bun run validate -- materials links",
        validate: validateRepositoryMaterialLinks
      }),
      presets: ["materials"],
      required: true
    },
    {
      check: createDecisionRecordsCheck(),
      presets: [],
      required: true
    },
    {
      check: createTestEvidenceCheck(),
      presets: ["test"],
      required: true
    },
    {
      check: createTestEvidenceRuleTestsCheck(),
      presets: ["test"],
      required: true
    },
    createProjectGateCommandEntry({
      invocation: {
        args: ["diff", "--check"],
        command: "git",
        cwd: repositoryRoot
      },
      checkId: "git-diff-whitespace",
      displayName: "Git diff whitespace",
      presets: [],
      required: true
    })
  ]);
}

/** Projects the central entry manifest into one ordinary Project Definition. */
export function createProjectGateDefinition(
  entries: readonly ProjectGateEntry[]
): ProjectDefinition {
  return defineConfig({
    checks: entries.map(projectGateFlagControlledCheck),
    changes: {
      source: {
        compareWith: "HEAD~1"
      },
      flags: PROJECT_GATE_INCREMENTAL_CHANGE_REGIONS
    },
    outputs: PROJECT_GATE_RUN_CONFIG.definitionOutputs,
    scheduler: PROJECT_GATE_RUN_CONFIG.scheduler
  });
}

/** Projects the Product-owned output directories for this exact Gate invocation root. */
export function projectGateOutputOverrides(invocationLogDirectory: string) {
  const diagnosticDirectory = relative(repositoryRoot, invocationLogDirectory);
  const machineDirectory = relative(repositoryRoot, join(invocationLogDirectory, "machine"));
  return Object.freeze({
    diagnosticLogging: {
      ...PROJECT_GATE_RUN_CONFIG.invocationOutputs.diagnosticLogging,
      directory: diagnosticDirectory
    },
    machinePublication: {
      ...PROJECT_GATE_RUN_CONFIG.invocationOutputs.machinePublication,
      directory: machineDirectory
    }
  });
}

/** Grants Product only the invocation-local paths owned by its output and executable Check boundaries. */
export function projectGateInvocationOutputControls(
  invocationLogDirectory: string
): Pick<
  RunControls,
  "checkArtifactBaseDirectory" | "diagnosticLogFileNaming" | "outputs" | "progressLogFile"
> {
  return Object.freeze({
    checkArtifactBaseDirectory: join(invocationLogDirectory, "checks"),
    diagnosticLogFileNaming: "channel",
    outputs: projectGateOutputOverrides(invocationLogDirectory),
    progressLogFile: join(invocationLogDirectory, "progress.log")
  });
}
