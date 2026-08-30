import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { workspaceFormatInvocation } from "../../development/format.ts";
import { lintInvocation } from "../../development/lint.ts";
import { typecheckInvocation } from "../../development/typecheck.ts";
import { defineConfig, type ProjectDefinition } from "vibe-check";

import type { ProjectGateSelection } from "./controls.ts";
import { createDecisionRecordsCheck } from "./decision-records-check.ts";
import { createDocsValidationCheck } from "./docs-validation-check.ts";
import { defineProjectGateEntries, type ProjectGateEntry } from "./entries.ts";
import { projectGateCheckForSelection } from "./eligibility.ts";
import { createExternalConsumerMaterialCheck } from "./external-consumer-material-check.ts";
import {
  createProjectGateCommonEntry,
  createProjectGateProcessEntry,
  type ProjectGateRuntime
} from "./process-entry.ts";
import { createPreparedCandidateCheck } from "./prepared-candidate-check.ts";
import { createRepositoryQualityChecks } from "./repository-quality-checks.ts";
import { createTestEvidenceRuleTestsCheck } from "./test-evidence/ast-grep-rule-tests-check.ts";
import { createTestEvidenceCheck } from "./test-evidence/semantic-case-check.ts";
import { createProjectGateTestEntries } from "./test-execution/checks.ts";
import { resolveProjectGateTestLanes } from "./test-execution/lanes.ts";

const requiredAndFull = ["required", "full"] as const;
const documentationMaterialsMutex = ["project-gate-documentation-materials"] as const;
const packageLifecycleMutex = ["project-gate-package-lifecycle"] as const;
const packageAcceptanceTimeoutMs = 30_000;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

export type { ProjectGateRuntime } from "./process-entry.ts";

/** Creates this invocation's project-private ordinary Check entries. */
export function createProjectGateEntries(runtime: ProjectGateRuntime): readonly ProjectGateEntry[] {
  const testLanes = resolveProjectGateTestLanes(repositoryRoot);
  const preparedCandidate = createPreparedCandidateCheck(runtime.preparedCandidate);
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
    ...createProjectGateTestEntries(
      testLanes,
      preparedCandidate,
      externalConsumer,
      runtime,
      repositoryRoot
    ),
    ...createRepositoryQualityChecks().map((check) => commonEntry(check, ["quality"])),
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
  check: import("vibe-check").Check,
  tags: readonly import("./catalog.ts").ProjectGateTag[],
  mutex?: readonly string[]
): ProjectGateEntry {
  return createProjectGateCommonEntry(check, requiredAndFull, tags, mutex);
}
