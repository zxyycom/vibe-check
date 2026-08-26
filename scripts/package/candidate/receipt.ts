import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { isPathWithin } from "../../foundation/path.ts";
import { isNonArrayRecord } from "../../foundation/type-guards.ts";
import { auditCandidateArtifact, auditStagingRuntime } from "../artifact/audit.ts";
import type { CandidateArtifact } from "../artifact/build.ts";
import type { PackageDocumentationFile } from "../../docs/package-api/check-guides.ts";

const RECEIPT_SCHEMA_VERSION = 2;

export interface CandidatePaths {
  readonly artifactDirectory: string;
  readonly receiptPath: string;
  readonly stagingDirectory: string;
  readonly stateDirectory: string;
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

/** Owns the versioned local state paths and explicitly invalidates old receipt schemas. */
export function candidatePaths(
  repositoryRoot: string,
  stateDirectory: string | undefined
): CandidatePaths {
  const root = resolve(
    stateDirectory ?? join(repositoryRoot, ".cache/vibe-check/package-candidate")
  );
  return Object.freeze({
    artifactDirectory: join(root, "artifacts"),
    receiptPath: join(root, "preparation-receipt.json"),
    stagingDirectory: join(root, "staging"),
    stateDirectory: root
  });
}

/** Reuses only an artifact whose current receipt and complete artifact audit agree. */
export function readReusableArtifact(input: {
  readonly candidateVersion: string;
  readonly expectedDocuments: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedReadme: string;
  readonly inputFingerprint: string;
  readonly paths: CandidatePaths;
}): ReusableCandidateArtifact | undefined {
  const receipt = readReceipt(input.paths.receiptPath);
  if (
    receipt === undefined ||
    receipt.inputFingerprint !== input.inputFingerprint ||
    receipt.candidateVersion !== input.candidateVersion
  ) {
    return undefined;
  }
  const artifact = artifactFromReceipt(receipt, input.paths);
  if (artifact === undefined) return undefined;
  try {
    auditStagingRuntime({
      expectedDocuments: input.expectedDocuments,
      expectedJSDocExamplePayloads: input.expectedJSDocExamplePayloads,
      expectedReadme: input.expectedReadme,
      stagingDirectory: artifact.stagingDirectory
    });
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
    return undefined;
  }
  return Object.freeze({ artifact, receipt });
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
  rmSync(paths.stagingDirectory, { force: true, recursive: true });
  rmSync(paths.artifactDirectory, { force: true, recursive: true });
  rmSync(paths.receiptPath, { force: true });
  rmSync(join(paths.stateDirectory, "candidate.tsbuildinfo"), { force: true });
  mkdirSync(paths.stateDirectory, { recursive: true });
}

function readReceipt(receiptPath: string): CandidateReceipt | undefined {
  if (!existsSync(receiptPath)) return undefined;
  try {
    const value: unknown = JSON.parse(readFileSync(receiptPath, "utf8"));
    return isCandidateReceipt(value) ? value : undefined;
  } catch {
    return undefined;
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
  if (!isPathWithin(paths.stateDirectory, artifactPath) || !existsSync(artifactPath)) {
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
