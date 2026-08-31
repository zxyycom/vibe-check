import { mkdirSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { artifactDocumentation } from "../artifact/documentation-audit.ts";
import { buildCandidateArtifact } from "../artifact/build.ts";
import { createArtifactFingerprint } from "../artifact/fingerprint.ts";
import { installCandidate } from "../candidate/install.ts";
import { RELEASE_RECEIPT_PREPARATION_FACT } from "../candidate/preparation-decision.ts";
import type { PreparedPackageCandidate } from "../candidate/prepare.ts";
import { parseFormalReleaseVersion, parseReleaseTag } from "./identity.ts";
import { createFormalReleasePaths } from "./paths.ts";
import {
  verifyFormalReleaseReceipt,
  writeFormalReleaseReceipt,
  type VerifiedFormalRelease
} from "./receipt.ts";
import { readCleanReleaseSource } from "./source.ts";

/** Builds and receipts one formal artifact from an unchanged clean commit; it never publishes. */
export async function prepareFormalRelease(input: {
  readonly repositoryRoot?: string;
  readonly tag: string;
  readonly version: string;
}): Promise<VerifiedFormalRelease> {
  const repositoryRoot = resolve(input.repositoryRoot ?? repositoryRootFromModule());
  const version = parseFormalReleaseVersion(input.version);
  const tag = parseReleaseTag(input.tag);
  const sourceBeforeBuild = readCleanReleaseSource(repositoryRoot);
  const inputFingerprint = createArtifactFingerprint(repositoryRoot);
  const paths = createFormalReleasePaths(repositoryRoot, version);
  resetFormalReleaseOwnedState(paths);
  const documentation = artifactDocumentation(repositoryRoot);
  const artifact = await buildCandidateArtifact({
    artifactDirectory: paths.artifactDirectory,
    candidateVersion: version,
    documentation,
    inputFingerprint,
    repositoryRoot,
    stagingDirectory: paths.stagingDirectory,
    tsBuildInfoPath: paths.tsBuildInfoPath
  });
  const sourceAfterBuild = readCleanReleaseSource(repositoryRoot);
  if (
    sourceAfterBuild.commit !== sourceBeforeBuild.commit ||
    createArtifactFingerprint(repositoryRoot) !== inputFingerprint
  ) {
    throw new Error("formal release source changed while its artifact was being built");
  }
  writeFormalReleaseReceipt({
    artifact,
    receiptPath: paths.receiptPath,
    repositoryRoot,
    sourceCommit: sourceBeforeBuild.commit,
    tag
  });
  return verifyFormalReleaseReceipt({ receiptPath: paths.receiptPath, repositoryRoot });
}

/** Revalidates and installs only the tarball named by a closed formal receipt for Gate use. */
export async function prepareReleaseCandidateFromReceipt(input: {
  readonly consumerDirectory?: string;
  readonly receiptPath: string;
  readonly repositoryRoot?: string;
}): Promise<PreparedPackageCandidate> {
  const repositoryRoot = resolve(input.repositoryRoot ?? repositoryRootFromModule());
  const consumerDirectory = resolve(
    input.consumerDirectory ?? join(repositoryRoot, "scripts/project")
  );
  const verified = verifyFormalReleaseReceipt({
    receiptPath: input.receiptPath,
    repositoryRoot
  });
  const documentation = artifactDocumentation(repositoryRoot);
  const installation = installCandidate({
    artifactPath: verified.artifact.artifactPath,
    candidateVersion: verified.artifact.candidateVersion,
    consumerDirectory,
    expectedDocuments: documentation.documents,
    expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
    expectedMachineMaterials: documentation.machineMaterials,
    expectedReadme: documentation.readme
  });
  return Object.freeze({
    ...verified.artifact,
    consumerDirectory,
    installedPackageDirectory: installation.installedPackageDirectory,
    ...RELEASE_RECEIPT_PREPARATION_FACT,
    resolvedEntryPath: installation.resolvedEntryPath
  });
}

function resetFormalReleaseOwnedState(paths: ReturnType<typeof createFormalReleasePaths>): void {
  rmSync(paths.stagingDirectory, { force: true, recursive: true });
  rmSync(paths.artifactPath, { force: true });
  rmSync(paths.receiptPath, { force: true });
  rmSync(paths.stateDirectory, { force: true, recursive: true });
  mkdirSync(paths.stateDirectory, { recursive: true });
}

function repositoryRootFromModule(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
}
