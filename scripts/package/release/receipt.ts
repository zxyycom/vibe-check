import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";

import { artifactDocumentation } from "../artifact/documentation-audit.ts";
import { auditCandidateArtifact } from "../artifact/packed-tar-audit.ts";
import { auditStagingRuntime } from "../artifact/staging-audit.ts";
import type { CandidateArtifact } from "../artifact/build.ts";
import { createArtifactFingerprint } from "../artifact/fingerprint.ts";
import {
  CANDIDATE_NAME,
  MOMOA_LICENSE_SHA256,
  PACKAGE_BUN_ENGINE,
  PACKAGE_LICENSE,
  PACKAGE_LICENSE_PATH,
  PACKAGE_LICENSE_SHA256,
  PACKAGE_MOMOA_LICENSE_PATH,
  PACKAGE_PUBLISH_ACCESS,
  PACKAGE_PUBLISH_REGISTRY,
  PACKAGE_README_PATH,
  PACKAGE_REPOSITORY_MANIFEST_URL
} from "../package-contract.ts";
import {
  fileMatchesSha256,
  fileMatchesSha512Integrity,
  sha256File,
  sha512IntegrityFile
} from "../pack.ts";
import { createFormalReleasePaths } from "./paths.ts";
import { parseFormalReleaseVersion } from "./identity.ts";
import {
  isFormalReleasePortablePath,
  parseFormalReleaseReceipt,
  type FormalReleaseReceipt
} from "./receipt-contract.ts";
import { readCleanReleaseSource } from "./source.ts";

export { parseFormalReleaseReceipt } from "./receipt-contract.ts";
export type { FormalReleaseReceipt } from "./receipt-contract.ts";

export interface VerifiedFormalRelease {
  readonly artifact: CandidateArtifact;
  readonly receipt: FormalReleaseReceipt;
  readonly receiptPath: string;
}

interface FormalReleaseMaterial {
  readonly artifactPath: string;
  readonly receipt: FormalReleaseReceipt;
  readonly receiptPath: string;
  readonly repositoryRoot: string;
  readonly stagingDirectory: string;
}

/** Writes a portable receipt containing no credential or temporary-consumer identity. */
export function writeFormalReleaseReceipt(input: {
  readonly artifact: CandidateArtifact;
  readonly repositoryRoot: string;
  readonly receiptPath: string;
  readonly sourceCommit: string;
  readonly tag: string;
}): FormalReleaseReceipt {
  const repositoryRoot = resolve(input.repositoryRoot);
  const receiptPath = resolveFormalReleaseReceiptWritePath({ ...input, repositoryRoot });
  const receipt = createFormalReleaseReceipt({ ...input, repositoryRoot });
  mkdirSync(dirname(receiptPath), { recursive: true });
  const temporaryPath = `${receiptPath}.${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
    renameSync(temporaryPath, receiptPath);
  } finally {
    rmSync(temporaryPath, { force: true });
  }
  return receipt;
}

/** Revalidates source, portable paths, both digests, staging, and packed bytes. */
export function verifyFormalReleaseReceipt(input: {
  readonly receiptPath: string;
  readonly repositoryRoot: string;
}): VerifiedFormalRelease {
  const material = resolveFormalReleaseMaterial(input);
  assertReceiptedArtifactDigests(material);
  const inputFingerprint = verifyReceiptedSource(material);
  auditReceiptedPackage(material);
  return Object.freeze({
    artifact: Object.freeze({
      artifactPath: material.artifactPath,
      candidateVersion: material.receipt.package.version,
      files: material.receipt.artifact.files,
      inputFingerprint,
      sha256: material.receipt.artifact.sha256,
      stagingDirectory: material.stagingDirectory
    }),
    receipt: material.receipt,
    receiptPath: material.receiptPath
  });
}

function resolveFormalReleaseMaterial(input: {
  readonly receiptPath: string;
  readonly repositoryRoot: string;
}): FormalReleaseMaterial {
  const repositoryRoot = resolve(input.repositoryRoot);
  const receiptPath = resolve(repositoryRoot, input.receiptPath);
  const receipt = readReceipt(receiptPath);
  const paths = createFormalReleasePaths(repositoryRoot, receipt.package.version);
  if (receiptPath !== paths.receiptPath) {
    throw new Error("formal release receipt path is outside its versioned build owner");
  }
  const artifactPath = resolvePortablePath(repositoryRoot, receipt.artifact.path);
  const stagingDirectory = resolvePortablePath(repositoryRoot, receipt.staging.path);
  if (artifactPath !== paths.artifactPath || stagingDirectory !== paths.stagingDirectory) {
    throw new Error("formal release receipt paths do not match the release build contract");
  }
  return Object.freeze({ artifactPath, receipt, receiptPath, repositoryRoot, stagingDirectory });
}

function assertReceiptedArtifactDigests(material: FormalReleaseMaterial): void {
  if (
    !fileMatchesSha256(material.artifactPath, material.receipt.artifact.sha256) ||
    !fileMatchesSha512Integrity(material.artifactPath, material.receipt.artifact.integrity)
  ) {
    throw new Error("formal release artifact bytes do not match the receipted digests");
  }
}

function verifyReceiptedSource(material: FormalReleaseMaterial): string {
  const source = readCleanReleaseSource(material.repositoryRoot);
  if (source.commit !== material.receipt.source.commit) {
    throw new Error("formal release receipt source commit does not match clean HEAD");
  }
  const inputFingerprint = createArtifactFingerprint(material.repositoryRoot);
  if (inputFingerprint !== material.receipt.source.inputFingerprint) {
    throw new Error("formal release receipt package input fingerprint is stale");
  }
  return inputFingerprint;
}

function auditReceiptedPackage(material: FormalReleaseMaterial): void {
  const documentation = artifactDocumentation(material.repositoryRoot);
  auditStagingRuntime({
    candidateVersion: material.receipt.package.version,
    expectedDocuments: documentation.documents,
    expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
    expectedMachineMaterials: documentation.machineMaterials,
    expectedReadme: documentation.readme,
    stagingDirectory: material.stagingDirectory
  });
  auditCandidateArtifact({
    artifactPath: material.artifactPath,
    candidateVersion: material.receipt.package.version,
    expectedDocuments: documentation.documents,
    expectedFiles: material.receipt.artifact.files,
    expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
    expectedMachineMaterials: documentation.machineMaterials,
    expectedReadme: documentation.readme,
    expectedSha256: material.receipt.artifact.sha256
  });
  assertReceiptedReadme(material);
}

function assertReceiptedReadme(material: FormalReleaseMaterial): void {
  const readmePath = join(material.stagingDirectory, PACKAGE_README_PATH);
  if (sha256File(readmePath) !== material.receipt.contract.readme.sha256) {
    throw new Error("formal release README does not match its receipted identity");
  }
}

function createFormalReleaseReceipt(input: {
  readonly artifact: CandidateArtifact;
  readonly repositoryRoot: string;
  readonly sourceCommit: string;
  readonly tag: string;
}): FormalReleaseReceipt {
  return parseFormalReleaseReceipt({
    schemaVersion: 1,
    package: { name: CANDIDATE_NAME, version: input.artifact.candidateVersion, tag: input.tag },
    source: {
      commit: input.sourceCommit,
      inputFingerprint: input.artifact.inputFingerprint
    },
    artifact: {
      path: toPortableOwnedPath(input.repositoryRoot, input.artifact.artifactPath),
      files: input.artifact.files,
      sha256: input.artifact.sha256,
      integrity: sha512IntegrityFile(input.artifact.artifactPath)
    },
    staging: { path: toPortableOwnedPath(input.repositoryRoot, input.artifact.stagingDirectory) },
    contract: {
      bunEngine: PACKAGE_BUN_ENGINE,
      license: PACKAGE_LICENSE,
      ownLicense: { path: PACKAGE_LICENSE_PATH, sha256: PACKAGE_LICENSE_SHA256 },
      publish: { access: PACKAGE_PUBLISH_ACCESS, registry: PACKAGE_PUBLISH_REGISTRY },
      readme: {
        path: PACKAGE_README_PATH,
        sha256: sha256File(join(input.artifact.stagingDirectory, PACKAGE_README_PATH))
      },
      repository: PACKAGE_REPOSITORY_MANIFEST_URL,
      thirdPartyLicenses: [{ path: PACKAGE_MOMOA_LICENSE_PATH, sha256: MOMOA_LICENSE_SHA256 }]
    }
  });
}

function resolveFormalReleaseReceiptWritePath(input: {
  readonly artifact: CandidateArtifact;
  readonly receiptPath: string;
  readonly repositoryRoot: string;
}): string {
  const version = parseFormalReleaseVersion(input.artifact.candidateVersion);
  const paths = createFormalReleasePaths(input.repositoryRoot, version);
  const receiptPath = resolve(input.repositoryRoot, input.receiptPath);
  if (
    resolve(input.repositoryRoot, input.artifact.artifactPath) !== paths.artifactPath ||
    resolve(input.repositoryRoot, input.artifact.stagingDirectory) !== paths.stagingDirectory ||
    receiptPath !== paths.receiptPath
  ) {
    throw new Error(
      "formal release writer accepts only its version-owned artifact, staging, and receipt paths"
    );
  }
  if (!fileMatchesSha256(paths.artifactPath, input.artifact.sha256)) {
    throw new Error("formal release writer artifact bytes do not match their SHA-256 identity");
  }
  return receiptPath;
}

function readReceipt(receiptPath: string): FormalReleaseReceipt {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(receiptPath, "utf8"));
  } catch (error: unknown) {
    throw new Error(`formal release receipt is missing or invalid: ${receiptPath}`, {
      cause: error
    });
  }
  return parseFormalReleaseReceipt(value);
}

function toPortableOwnedPath(repositoryRoot: string, path: string): string {
  const repository = resolve(repositoryRoot);
  const absolutePath = resolve(path);
  const portablePath = relative(repository, absolutePath).split(sep).join("/");
  if (!isFormalReleasePortablePath(portablePath)) {
    throw new TypeError("formal release material path must remain inside the repository");
  }
  return portablePath;
}

function resolvePortablePath(repositoryRoot: string, path: string): string {
  const resolvedPath = resolve(repositoryRoot, path);
  if (toPortableOwnedPath(repositoryRoot, resolvedPath) !== path) {
    throw new TypeError("formal release receipt path is not canonical");
  }
  return resolvedPath;
}
