import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { artifactDocumentation } from "../artifact/audit.ts";
import { buildCandidateArtifact, type CandidateArtifact } from "../artifact/build.ts";
import { createArtifactFingerprint } from "../artifact/fingerprint.ts";
import { inspectInstallation, installCandidate } from "./install.ts";
import {
  candidatePaths,
  clearCandidateState,
  readReusableArtifact,
  receiptMatchesInstallation,
  writeReceipt,
  type InstalledCandidate
} from "./receipt.ts";

export type { CandidateArtifact } from "../artifact/build.ts";

export interface PreparedPackageCandidate extends CandidateArtifact {
  readonly consumerDirectory: string;
  readonly installedPackageDirectory: string;
  readonly resolvedEntryPath: string;
  /** True only when no build, pack, or local install was needed. */
  readonly reused: boolean;
}

export interface PreparePackageCandidateOptions {
  /** Defaults to this checkout's repository root. */
  readonly repositoryRoot?: string;
  /** Defaults to the one shared private project consumer. */
  readonly consumerDirectory?: string;
  /** Defaults to the ignored candidate state directory in this checkout. */
  readonly stateDirectory?: string;
}

/**
 * Creates or safely reuses the one local package candidate consumed by repository
 * project runs. It never accepts a receipt, tarball, install, or resolved entry
 * that does not exactly match current inputs and the shared consumer location.
 */
export async function preparePackageCandidate(
  options: PreparePackageCandidateOptions = {}
): Promise<PreparedPackageCandidate> {
  const repositoryRoot = resolve(options.repositoryRoot ?? repositoryRootFromModule());
  const consumerDirectory = resolve(
    options.consumerDirectory ?? join(repositoryRoot, "scripts/project")
  );
  const paths = candidatePaths(repositoryRoot, options.stateDirectory);
  const documentation = artifactDocumentation(repositoryRoot);
  const inputFingerprint = createArtifactFingerprint(repositoryRoot);
  const candidateVersion = `0.0.0-local.${inputFingerprint.slice(0, 12)}`;

  const reusable = readReusableArtifact({
    candidateVersion,
    expectedDocuments: documentation.documents,
    expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
    expectedReadme: documentation.readme,
    inputFingerprint,
    paths
  });
  if (reusable !== undefined) {
    const installation = inspectInstallation({
      candidateVersion,
      consumerDirectory,
      expectedDocuments: documentation.documents,
      expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
      expectedReadme: documentation.readme
    });
    if (
      installation !== undefined &&
      receiptMatchesInstallation(reusable.receipt, consumerDirectory, installation)
    ) {
      return preparedCandidate({
        artifact: reusable.artifact,
        consumerDirectory,
        installation,
        reused: true
      });
    }
    const installationAfterInstall = installCandidate({
      artifactPath: reusable.artifact.artifactPath,
      candidateVersion,
      consumerDirectory,
      expectedDocuments: documentation.documents,
      expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
      expectedReadme: documentation.readme
    });
    writeReceipt({
      artifact: reusable.artifact,
      consumerDirectory,
      installation: installationAfterInstall,
      receiptPath: paths.receiptPath
    });
    return preparedCandidate({
      artifact: reusable.artifact,
      consumerDirectory,
      installation: installationAfterInstall,
      reused: false
    });
  }

  clearCandidateState(paths);
  const artifact = await buildCandidateArtifact({
    artifactDirectory: paths.artifactDirectory,
    candidateVersion,
    documentation,
    inputFingerprint,
    repositoryRoot,
    stagingDirectory: paths.stagingDirectory,
    stateDirectory: paths.stateDirectory
  });
  const installation = installCandidate({
    artifactPath: artifact.artifactPath,
    candidateVersion,
    consumerDirectory,
    expectedDocuments: documentation.documents,
    expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
    expectedReadme: documentation.readme
  });
  writeReceipt({
    artifact,
    consumerDirectory,
    installation,
    receiptPath: paths.receiptPath
  });
  return preparedCandidate({ artifact, consumerDirectory, installation, reused: false });
}

function repositoryRootFromModule(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
}

function preparedCandidate(input: {
  readonly artifact: CandidateArtifact;
  readonly consumerDirectory: string;
  readonly installation: InstalledCandidate;
  readonly reused: boolean;
}): PreparedPackageCandidate {
  return Object.freeze({
    ...input.artifact,
    consumerDirectory: input.consumerDirectory,
    installedPackageDirectory: input.installation.installedPackageDirectory,
    resolvedEntryPath: input.installation.resolvedEntryPath,
    reused: input.reused
  });
}
