import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { ProcessInvocation } from "../../process-execution/command.ts";
import type { PreparedPackageCandidate } from "../../package/candidate/prepare.ts";
import {
  CANDIDATE_ARTIFACT_PATH_ENV,
  CANDIDATE_ARTIFACT_SHA256_ENV
} from "../../package/candidate/acceptance-input.ts";
import { CANDIDATE_STAGING_DIRECTORY_ENV } from "../../package/artifact/acceptance-input.ts";
import { workspaceFormatInvocation } from "../../development/format.ts";
import { lintInvocation } from "../../development/lint.ts";
import { typecheckInvocation } from "../../development/typecheck.ts";
import type { ProjectGateProfile, ProjectGateTag } from "./catalog.ts";
import type { ProjectGateSelection } from "./controls.ts";
import { defineConfig, type Check, type ProjectDefinition } from "vibe-check";

import { defineProjectGateEntries, type ProjectGateEntry } from "./entries.ts";
import { projectGateCheckForSelection } from "./eligibility.ts";
import { createDocsValidationCheck } from "./docs-validation-check.ts";
import { createDecisionRecordsCheck } from "./decision-records-check.ts";
import { createTestEvidenceCheck } from "./test-evidence/semantic-case-check.ts";
import {
  createProcessCheck,
  createProcessCheckWithDataDependency,
  type ProcessCheckDataDependency
} from "./check-execution/process.ts";
import { createTestEvidenceRuleTestsCheck } from "./test-evidence/ast-grep-rule-tests-check.ts";
import {
  PROJECT_GATE_TEST_LANE_NAMES,
  resolveProjectGateTestLanes,
  type ProjectGateTestLaneName,
  type ProjectGateTestLanes
} from "./test-execution/lanes.ts";
import {
  createPreparedCandidateCheck,
  parseProjectGatePreparedCandidateData,
  type ProjectGatePreparedCandidateData
} from "./prepared-candidate-check.ts";
import {
  createExternalConsumerMaterialCheck,
  type ExternalConsumerMaterialLease
} from "./external-consumer-material-check.ts";
import {
  EXTERNAL_CONSUMER_ARTIFACT_PATH_ENV,
  EXTERNAL_CONSUMER_ARTIFACT_SHA256_ENV,
  EXTERNAL_CONSUMER_INSTALLED_PACKAGE_ENV,
  EXTERNAL_CONSUMER_RESOLVED_ENTRY_ENV,
  EXTERNAL_CONSUMER_ROOT_ENV,
  parseExternalConsumerMaterialData,
  type ExternalConsumerMaterialData,
  validateExternalConsumerMaterialPhysical
} from "../../package/candidate/external-consumer-input.ts";

const requiredAndFull = ["required", "full"] as const;
const packageLifecycleMutex = ["project-gate-package-lifecycle"] as const;
const packageAcceptanceTimeoutMs = 30_000;
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

type PreparedCandidateProcessInput = "artifact" | "external-consumer";

interface ProjectGateTestCheckDefinition {
  readonly candidateInput?: PreparedCandidateProcessInput;
  readonly checkId: string;
  readonly displayName: string;
  readonly lane: ProjectGateTestLaneName;
  readonly mutex?: readonly string[];
  readonly tags: readonly ProjectGateTag[];
  readonly timeoutMs?: number;
}

const PROJECT_GATE_TEST_CHECKS = defineProjectGateTestChecks([
  testCheck(
    "packageSupporting",
    "tests-package-supporting",
    "Bun package calculation and material tests",
    ["scripts", "tests"]
  ),
  testCheck(
    "packageCandidate",
    "tests-package-candidate",
    "Bun package candidate lifecycle acceptance",
    ["package-tests", "tests"],
    { mutex: packageLifecycleMutex, timeoutMs: packageAcceptanceTimeoutMs }
  ),
  testCheck(
    "packageArtifact",
    "tests-package-artifact",
    "Bun package artifact acceptance",
    ["package-tests", "tests"],
    { candidateInput: "artifact", timeoutMs: packageAcceptanceTimeoutMs }
  ),
  testCheck(
    "packageConsumerTypes",
    "tests-package-consumer-types",
    "Bun external package consumer type acceptance",
    ["package-tests", "tests"],
    { candidateInput: "external-consumer", timeoutMs: packageAcceptanceTimeoutMs }
  ),
  testCheck(
    "packageConsumerDocs",
    "tests-package-consumer-docs",
    "Bun external package consumer documentation acceptance",
    ["package-tests", "tests"],
    { candidateInput: "external-consumer", timeoutMs: packageAcceptanceTimeoutMs }
  ),
  testCheck(
    "packageConsumerRuntime",
    "tests-package-consumer-runtime",
    "Bun external package consumer runtime acceptance",
    ["package-tests", "tests"],
    { candidateInput: "external-consumer", timeoutMs: packageAcceptanceTimeoutMs }
  ),
  testCheck(
    "productDuplicateDetection",
    "tests-product-duplicate-detection",
    "Bun Product duplicate detection tests",
    ["product", "tests"]
  ),
  testCheck("productFileMetrics", "tests-product-file-metrics", "Bun Product file metrics tests", [
    "product",
    "tests"
  ]),
  testCheck(
    "productFunctionMetrics",
    "tests-product-function-metrics",
    "Bun Product function metrics tests",
    ["product", "tests"]
  ),
  testCheck("productJsonChecks", "tests-product-json", "Bun Product JSON tests", [
    "product",
    "tests"
  ]),
  testCheck(
    "productMarkdownLinks",
    "tests-product-markdown-links",
    "Bun Product Markdown link tests",
    ["product", "tests"]
  ),
  testCheck(
    "productSupportingChecks",
    "tests-product-supporting-checks",
    "Bun Product supporting Check tests",
    ["product", "tests"]
  ),
  testCheck("productRuntime", "tests-product-runtime", "Bun Product runtime tests", [
    "product",
    "tests"
  ]),
  testCheck("scriptsProject", "tests-scripts-project", "Bun Project tooling tests", [
    "scripts",
    "tests"
  ]),
  testCheck(
    "scriptsTestEvidence",
    "tests-scripts-test-evidence",
    "Bun Test Evidence tooling tests",
    ["scripts", "tests"]
  ),
  testCheck("scriptsValidation", "tests-scripts-validation", "Bun validation tooling tests", [
    "scripts",
    "tests"
  ]),
  testCheck("scriptsTooling", "tests-scripts-tooling", "Bun ordinary script tooling tests", [
    "scripts",
    "tests"
  ])
]);

export interface ProjectGateRuntime {
  readonly externalConsumerLease: ExternalConsumerMaterialLease;
  readonly invocationLogDirectory: string;
  readonly preparedCandidate: PreparedPackageCandidate;
}

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
    processEntry({
      invocation: typecheckInvocation("product"),
      checkId: "typecheck-product",
      displayName: "TypeScript product typecheck and import boundary",
      profiles: requiredAndFull,
      tags: ["product"],
      runtime
    }),
    processEntry({
      invocation: lintInvocation("product"),
      checkId: "lint-product",
      displayName: "TypeScript product lint",
      profiles: requiredAndFull,
      tags: ["product"],
      runtime
    }),
    processEntry({
      invocation: typecheckInvocation("scripts"),
      checkId: "typecheck-scripts",
      displayName: "TypeScript script typecheck",
      profiles: requiredAndFull,
      tags: ["scripts"],
      runtime
    }),
    processEntry({
      invocation: lintInvocation("scripts"),
      checkId: "lint-scripts",
      displayName: "TypeScript script lint",
      profiles: requiredAndFull,
      tags: ["scripts"],
      runtime
    }),
    processEntry({
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
    ...projectGateTestEntries(testLanes, preparedCandidate, externalConsumer, runtime),
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
      ["docs"]
    ),
    commonEntry(
      createDocsValidationCheck({
        checkId: "docs-example-validator",
        displayName: "Docs example validator",
        task: "examples"
      }),
      ["docs"]
    ),
    commonEntry(
      createDocsValidationCheck({
        checkId: "docs-links-validator",
        displayName: "Docs links validator",
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
    processEntry({
      invocation: { args: ["diff", "--check"], command: "git", cwd: repositoryRoot },
      checkId: "git-diff-whitespace",
      displayName: "Git diff whitespace",
      profiles: requiredAndFull,
      tags: ["git"],
      runtime
    })
  ]);
}

function testCheck(
  lane: ProjectGateTestLaneName,
  checkId: string,
  displayName: string,
  tags: readonly ProjectGateTag[],
  options: Readonly<{
    readonly candidateInput?: PreparedCandidateProcessInput;
    readonly mutex?: readonly string[];
    readonly timeoutMs?: number;
  }> = {}
): ProjectGateTestCheckDefinition {
  return Object.freeze({
    ...options,
    checkId,
    displayName,
    lane,
    tags: Object.freeze([...tags])
  });
}

function defineProjectGateTestChecks(
  definitions: readonly ProjectGateTestCheckDefinition[]
): readonly ProjectGateTestCheckDefinition[] {
  const lanes = definitions.map(({ lane }) => lane);
  if (
    lanes.length !== PROJECT_GATE_TEST_LANE_NAMES.length ||
    lanes.length !== new Set(lanes).size ||
    PROJECT_GATE_TEST_LANE_NAMES.some((lane) => !lanes.includes(lane))
  ) {
    throw new TypeError("Project Gate test Checks must map every execution lane exactly once");
  }
  return Object.freeze([...definitions]);
}

function projectGateTestEntries(
  lanes: ProjectGateTestLanes,
  preparedCandidate: Check,
  externalConsumer: Check,
  runtime: ProjectGateRuntime
): readonly ProjectGateEntry[] {
  return Object.freeze(
    PROJECT_GATE_TEST_CHECKS.map((definition) =>
      projectGateTestEntry(
        definition,
        lanes[definition.lane],
        preparedCandidate,
        externalConsumer,
        runtime
      )
    )
  );
}

function projectGateTestEntry(
  definition: ProjectGateTestCheckDefinition,
  files: readonly string[],
  preparedCandidate: Check,
  externalConsumer: Check,
  runtime: ProjectGateRuntime
): ProjectGateEntry {
  const base = {
    checkId: definition.checkId,
    displayName: definition.displayName,
    invocation: bunTestInvocation(files),
    ...(definition.mutex === undefined ? {} : { mutex: definition.mutex }),
    profiles: requiredAndFull,
    runtime,
    tags: definition.tags,
    ...(definition.timeoutMs === undefined ? {} : { timeoutMs: definition.timeoutMs })
  };
  if (definition.candidateInput === undefined) return processEntry(base);
  if (definition.candidateInput === "artifact") {
    return processEntry<ProjectGatePreparedCandidateData>({
      ...base,
      dataDependency: preparedCandidateProcessDependency(preparedCandidate.checkId)
    });
  }
  return processEntry<ExternalConsumerMaterialData>({
    ...base,
    dataDependency: externalConsumerProcessDependency(externalConsumer.checkId)
  });
}

function preparedCandidateProcessDependency(
  checkId: string
): ProcessCheckDataDependency<ProjectGatePreparedCandidateData> {
  return Object.freeze({
    checkId,
    environment: artifactCandidateEnvironment,
    parseData: parseProjectGatePreparedCandidateData
  });
}

function artifactCandidateEnvironment(
  data: ProjectGatePreparedCandidateData
): Readonly<Record<string, string>> {
  return Object.freeze({
    [CANDIDATE_ARTIFACT_PATH_ENV]: data.artifactPath,
    [CANDIDATE_ARTIFACT_SHA256_ENV]: data.sha256,
    [CANDIDATE_STAGING_DIRECTORY_ENV]: data.stagingDirectory
  });
}

function externalConsumerProcessDependency(
  checkId: string
): ProcessCheckDataDependency<ExternalConsumerMaterialData> {
  return Object.freeze({
    checkId,
    environment: externalConsumerEnvironment,
    parseData: parseExternalConsumerMaterialData
  });
}

function externalConsumerEnvironment(
  data: ExternalConsumerMaterialData
): Readonly<Record<string, string>> {
  validateExternalConsumerMaterialPhysical(data);
  return Object.freeze({
    [EXTERNAL_CONSUMER_ARTIFACT_PATH_ENV]: data.artifactPath,
    [EXTERNAL_CONSUMER_ARTIFACT_SHA256_ENV]: data.sha256,
    [EXTERNAL_CONSUMER_ROOT_ENV]: data.consumerDirectory,
    [EXTERNAL_CONSUMER_INSTALLED_PACKAGE_ENV]: data.installedPackageDirectory,
    [EXTERNAL_CONSUMER_RESOLVED_ENTRY_ENV]: data.resolvedEntryPath
  });
}

function bunTestInvocation(files: readonly string[]): ProcessInvocation {
  return Object.freeze({
    args: Object.freeze(["test", ...files, "--reporter=dots"]),
    command: process.execPath,
    cwd: repositoryRoot
  });
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

function processEntry<Data extends object = object>(
  input: Readonly<{
    readonly dataDependency?: ProcessCheckDataDependency<Data>;
    readonly invocation: ProcessInvocation;
    readonly checkId: string;
    readonly displayName: string;
    readonly mutex?: readonly string[];
    readonly profiles: readonly ProjectGateProfile[];
    readonly tags: readonly ProjectGateTag[];
    readonly runtime: ProjectGateRuntime;
    readonly timeoutMs?: number;
  }>
): ProjectGateEntry {
  const {
    checkId,
    dataDependency,
    displayName,
    invocation,
    mutex,
    profiles,
    runtime,
    tags,
    timeoutMs
  } = input;
  const descriptor = {
    args: invocation.args,
    checkId,
    command: invocation.command,
    cwd: invocation.cwd,
    displayName,
    ...(invocation.env === undefined ? {} : { environment: definedEnvironment(invocation.env) }),
    ...(timeoutMs === undefined ? {} : { timeoutMs })
  };
  const processCheck =
    dataDependency === undefined
      ? createProcessCheck(descriptor, runtime.invocationLogDirectory)
      : createProcessCheckWithDataDependency(
          descriptor,
          runtime.invocationLogDirectory,
          dataDependency
        );
  return Object.freeze({
    check:
      mutex === undefined
        ? processCheck
        : Object.freeze({ ...processCheck, mutex: Object.freeze([...mutex]) }),
    profiles,
    tags
  });
}

/** Assigns the selection metadata shared by every required and full Check. */
function commonEntry(check: Check, tags: readonly ProjectGateTag[]): ProjectGateEntry {
  return Object.freeze({ check, profiles: requiredAndFull, tags });
}

function definedEnvironment(environment: NodeJS.ProcessEnv): Readonly<Record<string, string>> {
  const values: Record<string, string> = {};
  for (const [name, value] of Object.entries(environment)) {
    if (value !== undefined) values[name] = value;
  }
  return Object.freeze(values);
}
