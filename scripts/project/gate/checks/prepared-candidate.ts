import { statSync } from "node:fs";
import { isAbsolute } from "node:path";

import { defineCheck } from "@zxyycom/vibe-check";

import type {
  CandidatePreparationFact,
  PreparedPackageCandidate
} from "../../../package/candidate/prepare.ts";
import { fileMatchesSha256, isSha256Digest } from "../../../package/pack.ts";
import { isPathWithin } from "../../../repository-files/paths.ts";
import { isNonArrayRecord, isStringArray } from "../../../value-guards.ts";
import { parseCandidatePreparationFact } from "./prepared-candidate-fact.ts";

const PREPARED_CANDIDATE_DATA_VERSION = 3 as const;
const PREPARED_CANDIDATE_DATA_KEYS = [
  "artifactPath",
  "candidateVersion",
  "consumerDirectory",
  "files",
  "inputFingerprint",
  "installedPackageDirectory",
  "preparationAction",
  "preparationReason",
  "resolvedEntryPath",
  "reused",
  "schemaVersion",
  "sha256",
  "stagingDirectory"
] as const;

interface ProjectGatePreparedCandidateIdentity {
  readonly artifactPath: string;
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly files: readonly string[];
  readonly inputFingerprint: string;
  readonly installedPackageDirectory: string;
  readonly resolvedEntryPath: string;
  readonly schemaVersion: typeof PREPARED_CANDIDATE_DATA_VERSION;
  readonly sha256: string;
  readonly stagingDirectory: string;
}

export type ProjectGatePreparedCandidateData = Readonly<
  ProjectGatePreparedCandidateIdentity & CandidatePreparationFact
>;

/** Preserves the adapter-prepared candidate as one validated typed dependency fact. */
export function createPreparedCandidateCheck(candidate: PreparedPackageCandidate) {
  return defineCheck({
    checkId: "prepared-package-candidate",
    displayName: "Prepared package candidate",
    parseData: parseProjectGatePreparedCandidateData,
    execution() {
      try {
        const data = candidateData(candidate);
        validatePreparedCandidateFiles(data);
        return Object.freeze({ status: "passed", data });
      } catch {
        return Object.freeze({
          status: "unavailable",
          reason: Object.freeze({ code: "prepared-candidate-invalid" })
        });
      }
    }
  });
}

/** Restores the provider-owned business shape from canonical dependency data. */
export function parseProjectGatePreparedCandidateData(
  value: unknown
): ProjectGatePreparedCandidateData {
  if (!isNonArrayRecord(value) || !exactKeys(value, PREPARED_CANDIDATE_DATA_KEYS)) {
    throw new TypeError("prepared candidate data has an invalid shape");
  }
  const identity = parsePreparedCandidateIdentity(value);
  const preparation = parseCandidatePreparationFact(value);
  return Object.freeze({ ...identity, ...preparation });
}

function parsePreparedCandidateIdentity(
  value: Readonly<Record<string, unknown>>
): ProjectGatePreparedCandidateIdentity {
  assertPreparedCandidateIdentityScalars(value);
  const files = parsePreparedCandidateFiles(value.files);
  const paths = preparedCandidatePaths(value);
  if (paths.some((candidatePath) => !isAbsolute(candidatePath))) {
    throw new TypeError("prepared candidate path must be absolute");
  }
  if (
    !isPathWithin(value.consumerDirectory, value.installedPackageDirectory) ||
    !isPathWithin(value.installedPackageDirectory, value.resolvedEntryPath)
  ) {
    throw new TypeError("prepared candidate installation paths escape their owner");
  }
  return Object.freeze({
    artifactPath: value.artifactPath,
    candidateVersion: value.candidateVersion,
    consumerDirectory: value.consumerDirectory,
    files,
    inputFingerprint: value.inputFingerprint,
    installedPackageDirectory: value.installedPackageDirectory,
    resolvedEntryPath: value.resolvedEntryPath,
    schemaVersion: PREPARED_CANDIDATE_DATA_VERSION,
    sha256: value.sha256,
    stagingDirectory: value.stagingDirectory
  });
}

function assertPreparedCandidateIdentityScalars(
  value: Readonly<Record<string, unknown>>
): asserts value is Readonly<{
  readonly artifactPath: string;
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly files: unknown;
  readonly inputFingerprint: string;
  readonly installedPackageDirectory: string;
  readonly resolvedEntryPath: string;
  readonly schemaVersion: typeof PREPARED_CANDIDATE_DATA_VERSION;
  readonly sha256: string;
  readonly stagingDirectory: string;
}> {
  if (
    value.schemaVersion !== PREPARED_CANDIDATE_DATA_VERSION ||
    !nonEmptyString(value.artifactPath) ||
    !nonEmptyString(value.candidateVersion) ||
    !nonEmptyString(value.consumerDirectory) ||
    !nonEmptyString(value.installedPackageDirectory) ||
    !nonEmptyString(value.resolvedEntryPath) ||
    !nonEmptyString(value.stagingDirectory) ||
    !isSha256Digest(value.inputFingerprint) ||
    !isSha256Digest(value.sha256)
  ) {
    throw new TypeError("prepared candidate data has an invalid shape");
  }
}

function parsePreparedCandidateFiles(value: unknown): readonly string[] {
  if (
    !isStringArray(value) ||
    value.length === 0 ||
    value.some((file) => file.length === 0) ||
    new Set(value).size !== value.length
  ) {
    throw new TypeError("prepared candidate data has an invalid shape");
  }
  return Object.freeze([...value]);
}

function preparedCandidatePaths(
  value: Readonly<{
    readonly artifactPath: string;
    readonly consumerDirectory: string;
    readonly installedPackageDirectory: string;
    readonly resolvedEntryPath: string;
    readonly stagingDirectory: string;
  }>
): readonly string[] {
  return [
    value.artifactPath,
    value.consumerDirectory,
    value.installedPackageDirectory,
    value.resolvedEntryPath,
    value.stagingDirectory
  ];
}

function candidateData(candidate: PreparedPackageCandidate): ProjectGatePreparedCandidateData {
  const identity: ProjectGatePreparedCandidateIdentity = Object.freeze({
    artifactPath: candidate.artifactPath,
    candidateVersion: candidate.candidateVersion,
    consumerDirectory: candidate.consumerDirectory,
    files: candidate.files,
    inputFingerprint: candidate.inputFingerprint,
    installedPackageDirectory: candidate.installedPackageDirectory,
    resolvedEntryPath: candidate.resolvedEntryPath,
    schemaVersion: PREPARED_CANDIDATE_DATA_VERSION,
    sha256: candidate.sha256,
    stagingDirectory: candidate.stagingDirectory
  });
  return parseProjectGatePreparedCandidateData(
    Object.freeze({
      ...identity,
      preparationAction: candidate.preparationAction,
      preparationReason: candidate.preparationReason,
      reused: candidate.reused
    })
  );
}

function validatePreparedCandidateFiles(data: ProjectGatePreparedCandidateData): void {
  if (
    !pathIsFile(data.artifactPath) ||
    !pathIsDirectory(data.consumerDirectory) ||
    !pathIsDirectory(data.installedPackageDirectory) ||
    !pathIsFile(data.resolvedEntryPath) ||
    !pathIsDirectory(data.stagingDirectory) ||
    !fileMatchesSha256(data.artifactPath, data.sha256)
  ) {
    throw new TypeError("prepared candidate files do not match their typed identity");
  }
}

function exactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function pathIsDirectory(directoryPath: string): boolean {
  try {
    return statSync(directoryPath).isDirectory();
  } catch {
    return false;
  }
}

function pathIsFile(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}
