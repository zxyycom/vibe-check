import {
  CANDIDATE_ARTIFACT_PATH_ENV,
  CANDIDATE_ARTIFACT_SHA256_ENV
} from "../../../../package/candidate/acceptance-input.ts";
import {
  CANDIDATE_STAGING_DIRECTORY_ENV,
  CANDIDATE_VERSION_ENV
} from "../../../../package/artifact/acceptance-input.ts";
import type { Check } from "@zxyycom/vibe-check";

import type { ProjectGatePreset } from "../../runtime/catalog.ts";
import type { ProcessCheckDataDependency } from "../process/process.ts";
import type { ProjectGateEntry } from "../../runtime/entries.ts";
import {
  EXTERNAL_CONSUMER_ARTIFACT_PATH_ENV,
  EXTERNAL_CONSUMER_ARTIFACT_SHA256_ENV,
  EXTERNAL_CONSUMER_INSTALLED_PACKAGE_ENV,
  EXTERNAL_CONSUMER_RESOLVED_ENTRY_ENV,
  EXTERNAL_CONSUMER_ROOT_ENV,
  parseExternalConsumerMaterialData,
  type ExternalConsumerMaterialData,
  validateExternalConsumerMaterialPhysical
} from "../../../../package/candidate/external-consumer/input.ts";
import { createProjectGateProcessEntry } from "../entry-factories.ts";
import {
  parseProjectGatePreparedCandidateData,
  type ProjectGatePreparedCandidateData
} from "../prepared-candidate.ts";
import {
  PROJECT_GATE_TEST_LANE_NAMES,
  type ProjectGateTestLaneName,
  type ProjectGateTestLanes
} from "./lanes.ts";

export type PreparedCandidateProcessInput = "artifact" | "external-consumer";

export interface ProjectGateTestCheckDefinition {
  readonly candidateInput?: PreparedCandidateProcessInput;
  readonly checkId: string;
  readonly displayName: string;
  readonly lane: ProjectGateTestLaneName;
  readonly mutex?: readonly string[];
  readonly presets: readonly ProjectGatePreset[];
  readonly required: boolean;
  readonly timeoutMs?: number;
}

/** Projects the stable test-lane registry into ordinary process-backed Gate entries. */
export function createProjectGateTestEntries(
  input: Readonly<{
    readonly definitions: readonly ProjectGateTestCheckDefinition[];
    readonly externalConsumer: Check;
    readonly lanes: ProjectGateTestLanes;
    readonly preparedCandidate: Check;
    readonly repositoryRoot: string;
  }>
): readonly ProjectGateEntry[] {
  return Object.freeze(
    input.definitions.map((definition) =>
      createProjectGateTestEntry({
        definition,
        externalConsumer: input.externalConsumer,
        files: input.lanes[definition.lane],
        preparedCandidate: input.preparedCandidate,
        repositoryRoot: input.repositoryRoot
      })
    )
  );
}

export function defineProjectGateTestChecks(
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
  return Object.freeze(
    definitions.map((definition) =>
      Object.freeze({
        ...definition,
        ...(definition.mutex === undefined ? {} : { mutex: Object.freeze([...definition.mutex]) }),
        presets: Object.freeze([...definition.presets])
      })
    )
  );
}

function createProjectGateTestEntry(input: {
  readonly definition: ProjectGateTestCheckDefinition;
  readonly externalConsumer: Check;
  readonly files: readonly string[];
  readonly preparedCandidate: Check;
  readonly repositoryRoot: string;
}): ProjectGateEntry {
  const { definition, externalConsumer, files, preparedCandidate, repositoryRoot } = input;
  const processEntry = {
    checkId: definition.checkId,
    displayName: definition.displayName,
    invocation: bunTestInvocation(files, repositoryRoot),
    ...(definition.mutex === undefined ? {} : { mutex: definition.mutex }),
    presets: definition.presets,
    required: definition.required,
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
    [CANDIDATE_STAGING_DIRECTORY_ENV]: data.stagingDirectory,
    [CANDIDATE_VERSION_ENV]: data.candidateVersion
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

function bunTestInvocation(files: readonly string[], repositoryRoot: string) {
  return Object.freeze({
    args: Object.freeze(["test", ...files, "--reporter=dots"]),
    command: process.execPath,
    cwd: repositoryRoot
  });
}
