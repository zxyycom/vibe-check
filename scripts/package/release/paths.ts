import { join, resolve } from "node:path";

import { CANDIDATE_NAME } from "../package-contract.ts";

export interface FormalReleasePaths {
  readonly artifactDirectory: string;
  readonly artifactPath: string;
  readonly receiptPath: string;
  readonly stagingDirectory: string;
  readonly stateDirectory: string;
  readonly tsBuildInfoPath: string;
}

/** Keeps formal staging/receipt state separate while retaining the shared artifact root. */
export function createFormalReleasePaths(
  repositoryRoot: string,
  version: string
): FormalReleasePaths {
  const repository = resolve(repositoryRoot);
  const buildDirectory = join(repository, "build");
  const artifactDirectory = join(buildDirectory, "artifacts");
  const releaseReceiptDirectory = join(buildDirectory, "releases");
  const stateDirectory = join(repository, ".cache/vibe-check/package-release");
  return Object.freeze({
    artifactDirectory,
    artifactPath: join(artifactDirectory, `${CANDIDATE_NAME}-${version}.tgz`),
    receiptPath: join(releaseReceiptDirectory, `${CANDIDATE_NAME}-${version}.release.json`),
    stagingDirectory: join(buildDirectory, "release-package"),
    stateDirectory,
    tsBuildInfoPath: join(stateDirectory, "release.tsbuildinfo")
  });
}
