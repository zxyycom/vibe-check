import type { ProcessInvocation } from "../../../process-execution/command.ts";
import {
  CANDIDATE_ARTIFACT_PATH_ENV,
  CANDIDATE_ARTIFACT_SHA256_ENV
} from "../../../package/candidate/acceptance-input.ts";
import { CANDIDATE_STAGING_DIRECTORY_ENV } from "../../../package/artifact/acceptance-input.ts";
import type { Check } from "vibe-check";

import type { ProjectGateTag } from "../catalog.ts";
import type { ProcessCheckDataDependency } from "../check-execution/process.ts";
import type { ProjectGateEntry } from "../entries.ts";
import {
  EXTERNAL_CONSUMER_ARTIFACT_PATH_ENV,
  EXTERNAL_CONSUMER_ARTIFACT_SHA256_ENV,
  EXTERNAL_CONSUMER_INSTALLED_PACKAGE_ENV,
  EXTERNAL_CONSUMER_RESOLVED_ENTRY_ENV,
  EXTERNAL_CONSUMER_ROOT_ENV,
  parseExternalConsumerMaterialData,
  type ExternalConsumerMaterialData,
  validateExternalConsumerMaterialPhysical
} from "../../../package/candidate/external-consumer-input.ts";
import { createProjectGateProcessEntry, type ProjectGateRuntime } from "../process-entry.ts";
import {
  parseProjectGatePreparedCandidateData,
  type ProjectGatePreparedCandidateData
} from "../prepared-candidate-check.ts";
import {
  PROJECT_GATE_TEST_LANE_NAMES,
  type ProjectGateTestLaneName,
  type ProjectGateTestLanes
} from "./lanes.ts";

const requiredAndFull = ["required", "full"] as const;
const documentationMaterialsMutex = ["project-gate-documentation-materials"] as const;
const packageLifecycleMutex = ["project-gate-package-lifecycle"] as const;
const packageAcceptanceTimeoutMs = 30_000;

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
  testCheck(
    "scriptsValidation",
    "tests-scripts-validation",
    "Bun validation tooling tests",
    ["scripts", "tests"],
    { mutex: documentationMaterialsMutex }
  ),
  testCheck("scriptsTooling", "tests-scripts-tooling", "Bun ordinary script tooling tests", [
    "scripts",
    "tests"
  ])
]);

/** Projects the stable test-lane registry into ordinary process-backed Gate entries. */
export function createProjectGateTestEntries(
  lanes: ProjectGateTestLanes,
  preparedCandidate: Check,
  externalConsumer: Check,
  runtime: ProjectGateRuntime,
  repositoryRoot: string
): readonly ProjectGateEntry[] {
  return Object.freeze(
    PROJECT_GATE_TEST_CHECKS.map((definition) =>
      createProjectGateTestEntry({
        definition,
        externalConsumer,
        files: lanes[definition.lane],
        preparedCandidate,
        repositoryRoot,
        runtime
      })
    )
  );
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
  return Object.freeze({ ...options, checkId, displayName, lane, tags: Object.freeze([...tags]) });
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

function createProjectGateTestEntry(input: {
  readonly definition: ProjectGateTestCheckDefinition;
  readonly externalConsumer: Check;
  readonly files: readonly string[];
  readonly preparedCandidate: Check;
  readonly repositoryRoot: string;
  readonly runtime: ProjectGateRuntime;
}): ProjectGateEntry {
  const { definition, externalConsumer, files, preparedCandidate, repositoryRoot, runtime } = input;
  const processEntry = {
    checkId: definition.checkId,
    displayName: definition.displayName,
    invocation: bunTestInvocation(files, repositoryRoot),
    ...(definition.mutex === undefined ? {} : { mutex: definition.mutex }),
    profiles: requiredAndFull,
    runtime,
    tags: definition.tags,
    ...(definition.timeoutMs === undefined ? {} : { timeoutMs: definition.timeoutMs })
  };
  if (definition.candidateInput === undefined) return createProjectGateProcessEntry(processEntry);
  if (definition.candidateInput === "artifact") {
    return createProjectGateProcessEntry<ProjectGatePreparedCandidateData>({
      ...processEntry,
      dataDependency: preparedCandidateProcessDependency(preparedCandidate.checkId)
    });
  }
  return createProjectGateProcessEntry<ExternalConsumerMaterialData>({
    ...processEntry,
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

function bunTestInvocation(files: readonly string[], repositoryRoot: string): ProcessInvocation {
  return Object.freeze({
    args: Object.freeze(["test", ...files, "--reporter=dots"]),
    command: process.execPath,
    cwd: repositoryRoot
  });
}
