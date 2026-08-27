import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { isPathWithin } from "../../repository-files/paths.ts";
import { packageCandidatePaths, type PackageCandidatePathOptions } from "../build-contract.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import { auditCandidateArtifact } from "../artifact/packed-tar-audit.ts";
import type { CandidateArtifact } from "../artifact/build.ts";
import type { PackageDocumentationFile } from "../../docs/package-api/check-guides.ts";

const RECEIPT_SCHEMA_VERSION = 3;

export interface CandidatePaths {
  readonly artifactDirectory: string;
  readonly legacyArtifactDirectory: string;
  readonly legacyStagingDirectory: string;
  readonly receiptPath: string;
  readonly stagingDirectory: string;
  readonly stateDirectory: string;
  readonly tsBuildInfoPath: string;
}

export interface InstalledCandidate {
  readonly installedPackageDirectory: string;
  readonly resolvedEntryPath: string;
  readonly resolvedEntrySha256: string;
}

interface CandidateReceipt {
  readonly schemaVersion: typeof RECEIPT_SCHEMA_VERSION;
  readonly artifact: Readonly<{
    readonly path: string;
    readonly sha256: string;
  }>;
  readonly candidateVersion: string;
  readonly consumer: Readonly<{
    readonly directory: string;
    readonly installedPackageDirectory: string;
    readonly resolvedEntryPath: string;
    readonly resolvedEntrySha256: string;
  }>;
  readonly files: readonly string[];
  readonly inputFingerprint: string;
}

export interface ReusableCandidateArtifact {
  readonly artifact: CandidateArtifact;
  readonly receipt: CandidateReceipt;
}

export type CandidateArtifactReuseRejection =
  | "artifact-invalid"
  | "artifact-unavailable"
  | "receipt-input-mismatch"
  | "receipt-invalid"
  | "receipt-missing";

export type CandidateArtifactReuseAssessment =
  | Readonly<{ readonly status: "reusable"; readonly candidate: ReusableCandidateArtifact }>
  | Readonly<{ readonly status: "rejected"; readonly reason: CandidateArtifactReuseRejection }>;

/** Resolves the build-evidence and cache paths, rejecting receipts from older layout schemas. */
export function candidatePaths(
  repositoryRoot: string,
  options: PackageCandidatePathOptions = {}
): CandidatePaths {
  const paths = packageCandidatePaths(repositoryRoot, options);
  return Object.freeze({
    artifactDirectory: paths.artifactDirectory,
    legacyArtifactDirectory: paths.legacyArtifactDirectory,
    legacyStagingDirectory: paths.legacyStagingDirectory,
    receiptPath: paths.receiptPath,
    stagingDirectory: paths.packageDirectory,
    stateDirectory: paths.stateDirectory,
    tsBuildInfoPath: paths.tsBuildInfoPath
  });
}

/** Classifies reusable artifact state without mutating or rebuilding candidate material. */
export function assessReusableArtifact(input: {
  readonly candidateVersion: string;
  readonly expectedDocuments: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
  readonly inputFingerprint: string;
  readonly paths: CandidatePaths;
}): CandidateArtifactReuseAssessment {
  const receiptResult = readReceipt(input.paths.receiptPath);
  if (!receiptResult.ok) {
    return Object.freeze({ status: "rejected", reason: receiptResult.rejection });
  }
  const receipt = receiptResult.receipt;
  if (
    receipt.inputFingerprint !== input.inputFingerprint ||
    receipt.candidateVersion !== input.candidateVersion
  ) {
    return Object.freeze({ status: "rejected", reason: "receipt-input-mismatch" });
  }
  const artifact = artifactFromReceipt(receipt, input.paths);
  if (artifact === undefined) {
    return Object.freeze({ status: "rejected", reason: "artifact-unavailable" });
  }
  try {
    auditCandidateArtifact({
      artifactPath: artifact.artifactPath,
      candidateVersion: artifact.candidateVersion,
      expectedFiles: artifact.files,
      expectedDocuments: input.expectedDocuments,
      expectedJSDocExamplePayloads: input.expectedJSDocExamplePayloads,
      expectedReadme: input.expectedReadme,
      expectedSha256: artifact.sha256
    });
  } catch {
    return Object.freeze({ status: "rejected", reason: "artifact-invalid" });
  }
  return Object.freeze({
    status: "reusable",
    candidate: Object.freeze({ artifact, receipt })
  });
}

export function receiptMatchesInstallation(
  receipt: ReusableCandidateArtifact["receipt"],
  consumerDirectory: string,
  installation: InstalledCandidate
): boolean {
  return (
    receipt.consumer.directory === consumerDirectory &&
    receipt.consumer.installedPackageDirectory === installation.installedPackageDirectory &&
    receipt.consumer.resolvedEntryPath === installation.resolvedEntryPath &&
    receipt.consumer.resolvedEntrySha256 === installation.resolvedEntrySha256
  );
}

export function writeReceipt(input: {
  readonly artifact: CandidateArtifact;
  readonly consumerDirectory: string;
  readonly installation: InstalledCandidate;
  readonly receiptPath: string;
}): void {
  const receipt: CandidateReceipt = Object.freeze({
    schemaVersion: RECEIPT_SCHEMA_VERSION,
    artifact: Object.freeze({ path: input.artifact.artifactPath, sha256: input.artifact.sha256 }),
    candidateVersion: input.artifact.candidateVersion,
    consumer: Object.freeze({
      directory: input.consumerDirectory,
      installedPackageDirectory: input.installation.installedPackageDirectory,
      resolvedEntryPath: input.installation.resolvedEntryPath,
      resolvedEntrySha256: input.installation.resolvedEntrySha256
    }),
    files: input.artifact.files,
    inputFingerprint: input.artifact.inputFingerprint
  });
  writeFileSync(input.receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
}

export function clearCandidateState(paths: CandidatePaths): void {
  rmSync(paths.legacyArtifactDirectory, { force: true, recursive: true });
  rmSync(paths.legacyStagingDirectory, { force: true, recursive: true });
  rmSync(paths.receiptPath, { force: true });
  rmSync(paths.tsBuildInfoPath, { force: true });
  mkdirSync(paths.stateDirectory, { recursive: true });
}

/** Removes only the owned unpacked package and tarball outputs before a cold rebuild. */
export function clearCandidateBuildEvidence(paths: CandidatePaths): void {
  rmSync(paths.stagingDirectory, { force: true, recursive: true });
  rmSync(paths.artifactDirectory, { force: true, recursive: true });
}

function readReceipt(receiptPath: string):
  | Readonly<{ readonly ok: true; readonly receipt: CandidateReceipt }>
  | Readonly<{
      readonly ok: false;
      readonly rejection: "receipt-invalid" | "receipt-missing";
    }> {
  if (!existsSync(receiptPath)) return Object.freeze({ ok: false, rejection: "receipt-missing" });
  try {
    const value: unknown = JSON.parse(readFileSync(receiptPath, "utf8"));
    return isCandidateReceipt(value)
      ? Object.freeze({ ok: true, receipt: value })
      : Object.freeze({ ok: false, rejection: "receipt-invalid" });
  } catch {
    return Object.freeze({ ok: false, rejection: "receipt-invalid" });
  }
}

function isCandidateReceipt(value: unknown): value is CandidateReceipt {
  if (!isNonArrayRecord(value) || value.schemaVersion !== RECEIPT_SCHEMA_VERSION) return false;
  if (
    typeof value.inputFingerprint !== "string" ||
    typeof value.candidateVersion !== "string" ||
    !isNonArrayRecord(value.artifact) ||
    typeof value.artifact.path !== "string" ||
    typeof value.artifact.sha256 !== "string" ||
    !isNonArrayRecord(value.consumer) ||
    typeof value.consumer.directory !== "string" ||
    typeof value.consumer.installedPackageDirectory !== "string" ||
    typeof value.consumer.resolvedEntryPath !== "string" ||
    typeof value.consumer.resolvedEntrySha256 !== "string" ||
    !Array.isArray(value.files) ||
    !value.files.every((file) => typeof file === "string")
  ) {
    return false;
  }
  return true;
}

function artifactFromReceipt(
  receipt: CandidateReceipt,
  paths: CandidatePaths
): CandidateArtifact | undefined {
  const artifactPath = resolve(receipt.artifact.path);
  if (
    !isPathWithin(paths.artifactDirectory, artifactPath) ||
    !existsSync(artifactPath) ||
    !pathIsDirectory(paths.stagingDirectory)
  ) {
    return undefined;
  }
  return Object.freeze({
    artifactPath,
    candidateVersion: receipt.candidateVersion,
    files: Object.freeze([...receipt.files]),
    inputFingerprint: receipt.inputFingerprint,
    sha256: receipt.artifact.sha256,
    stagingDirectory: paths.stagingDirectory
  });
}

function pathIsDirectory(directoryPath: string): boolean {
  try {
    return statSync(directoryPath).isDirectory();
  } catch {
    return false;
  }
}
