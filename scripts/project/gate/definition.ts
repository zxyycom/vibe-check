import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { workspaceFormatInvocation } from "../../development/format.ts";
import { lintInvocation } from "../../development/lint.ts";
import { typecheckInvocation } from "../../development/typecheck.ts";
import {
  defineConfig,
  type CheckAggregation,
  type ProjectDefinition,
  type RunControls
} from "@zxyycom/vibe-check";

import type { ProjectGateAfterHook } from "./runtime/after-gate.ts";
import { observeProjectGatePerformance } from "./runtime/performance-observation.ts";
import { createDecisionRecordsCheck } from "./checks/decision-records.ts";
import { createDocsValidationCheck } from "./checks/docs-validation.ts";
import { defineProjectGateEntries, type ProjectGateEntry } from "./runtime/entries.ts";
import { projectGateFlagControlledCheck } from "./runtime/eligibility.ts";
import { PROJECT_GATE_SELECTION } from "./runtime/catalog.ts";
import { createExternalConsumerMaterialCheck } from "./checks/external-consumer-material.ts";
import {
  createProjectGateCommonEntry,
  createProjectGateProcessEntry,
  type ProjectGateRuntime
} from "./checks/process-entry.ts";
import { createPreparedCandidateCheck } from "./checks/prepared-candidate.ts";
import { createProjectGateRepositoryQualityChecks } from "./checks/repository-quality.ts";
import { createTestEvidenceRuleTestsCheck } from "./checks/test-evidence/ast-grep-rule-tests-check.ts";
import { createTestEvidenceCheck } from "./checks/test-evidence/semantic-case-check.ts";
import { createProjectGateTestEntries } from "./checks/test-execution/entries.ts";
import { createProjectGateTestCheckDefinitions } from "./checks/test-execution/checks.ts";
import { resolveProjectGateTestLanes } from "./checks/test-execution/lanes.ts";

const documentationMaterialsMutex = ["project-gate-documentation-materials"] as const;
const packageLifecycleMutex = ["project-gate-package-lifecycle"] as const;
const packageAcceptanceTimeoutMs = 30_000;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

/**
 * Project-owned post-processing run after one candidate-backed Product result.
 *
 * This is trusted repository code: it may use normal Bun/JavaScript capabilities,
 * must return the only final Gate result, and may be synchronous or asynchronous.
 */
export type { ProjectGateAfterHook } from "./runtime/after-gate.ts";

/** Default Gate post-processing keeps performance observation explicit in central configuration. */
export const afterGate: ProjectGateAfterHook = (initialResult, context) =>
  observeProjectGatePerformance(initialResult, context);

/** Run-level policy kept beside the central Check composition manifest. */
export const PROJECT_GATE_RUN_CONFIG = Object.freeze({
  aggregation: Object.freeze({
    empty: "failed" as const,
    mode: "all" as const,
    notApplicable: "fail" as const,
    unavailable: "propagate" as const
  }),
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
      kind: "learned-critical-path" as const,
      stateDirectory: ".cache/vibe-check/scheduler-history"
    }),
    maxParallel: 3
  })
});

const projectGateTestChecks = createProjectGateTestCheckDefinitions({
  documentationMaterialsMutex,
  packageAcceptanceTimeoutMs
});

export type { ProjectGateRuntime } from "./checks/process-entry.ts";

/** Creates this invocation's project-private ordinary Check entries. */
export function createProjectGateEntries(runtime: ProjectGateRuntime): readonly ProjectGateEntry[] {
  const testLanes = resolveProjectGateTestLanes(repositoryRoot);
  const preparedCandidate = createPreparedCandidateCheck(runtime.preparedCandidate);
  const repositoryQuality = createProjectGateRepositoryQualityChecks();
  const externalConsumer = createExternalConsumerMaterialCheck({
    lease: runtime.externalConsumerLease,
    preparedCandidateCheckId: preparedCandidate.checkId,
    timeoutMs: packageAcceptanceTimeoutMs
  });
  return defineProjectGateEntries([
    createProjectGateProcessEntry({
      invocation: typecheckInvocation("product"),
      checkId: "typecheck-product",
      displayName: "TypeScript product typecheck and import boundary",
      presets: ["typecheck"],
      required: true
    }),
    createProjectGateProcessEntry({
      invocation: lintInvocation("product"),
      checkId: "lint-product",
      displayName: "TypeScript product lint",
      presets: ["lint"],
      required: true
    }),
    createProjectGateProcessEntry({
      invocation: typecheckInvocation("scripts"),
      checkId: "typecheck-scripts",
      displayName: "TypeScript script typecheck",
      presets: ["typecheck"],
      required: true
    }),
    createProjectGateProcessEntry({
      invocation: lintInvocation("scripts"),
      checkId: "lint-scripts",
      displayName: "TypeScript script lint",
      presets: ["lint"],
      required: true
    }),
    createProjectGateProcessEntry({
      invocation: workspaceFormatInvocation("check"),
      checkId: "format-check",
      displayName: "Source format",
      presets: [],
      required: true
    }),
    createProjectGateCommonEntry({
      check: preparedCandidate,
      presets: [],
      required: true
    }),
    createProjectGateCommonEntry({
      check: externalConsumer,
      mutex: packageLifecycleMutex,
      presets: [],
      required: false
    }),
    ...createProjectGateTestEntries({
      definitions: projectGateTestChecks,
      externalConsumer,
      lanes: testLanes,
      preparedCandidate,
      repositoryRoot
    }),
    createProjectGateCommonEntry({
      check: repositoryQuality.duplicateDetection,
      presets: ["quality"],
      required: true
    }),
    createProjectGateCommonEntry({
      check: repositoryQuality.fileMetrics,
      presets: ["quality"],
      required: true
    }),
    createProjectGateCommonEntry({
      check: repositoryQuality.functionMetrics,
      presets: ["quality"],
      required: true
    }),
    createProjectGateCommonEntry({
      check: repositoryQuality.markdownLinkValidation,
      presets: ["docs", "quality"],
      required: true
    }),
    createProjectGateCommonEntry({
      check: createDocsValidationCheck({
        checkId: "docs-json-validator",
        displayName: "Docs JSON validator",
        task: "json"
      }),
      presets: ["docs"],
      required: true
    }),
    createProjectGateCommonEntry({
      check: createDocsValidationCheck({
        checkId: "docs-schema-validator",
        displayName: "Docs schema validator",
        task: "schema"
      }),
      mutex: documentationMaterialsMutex,
      presets: ["docs"],
      required: true
    }),
    createProjectGateCommonEntry({
      check: createDocsValidationCheck({
        checkId: "docs-example-validator",
        displayName: "Docs example validator",
        task: "examples"
      }),
      mutex: documentationMaterialsMutex,
      presets: ["docs"],
      required: true
    }),
    createProjectGateCommonEntry({
      check: createDocsValidationCheck({
        checkId: "docs-links-validator",
        displayName: "Documentation path existence validation",
        task: "links"
      }),
      presets: ["docs"],
      required: true
    }),
    createProjectGateCommonEntry({
      check: createDecisionRecordsCheck(),
      presets: [],
      required: true
    }),
    createProjectGateCommonEntry({
      check: createTestEvidenceCheck(),
      presets: ["test"],
      required: true
    }),
    createProjectGateCommonEntry({
      check: createTestEvidenceRuleTestsCheck(),
      presets: ["test"],
      required: true
    }),
    createProjectGateProcessEntry({
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
): Pick<RunControls, "checkArtifactBaseDirectory" | "outputs" | "progressLogFile"> {
  return Object.freeze({
    checkArtifactBaseDirectory: join(invocationLogDirectory, "checks"),
    outputs: projectGateOutputOverrides(invocationLogDirectory),
    progressLogFile: join(invocationLogDirectory, "progress.log")
  });
}

/** Binds aggregation to Product's private flag-and-dependency effective selection. */
export function projectGateAggregation(): CheckAggregation {
  return Object.freeze({
    checks: "effective",
    ...PROJECT_GATE_RUN_CONFIG.aggregation
  });
}
