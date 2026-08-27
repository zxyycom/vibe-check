import { join, relative, resolve, sep } from "node:path";

/** The only owned roots for a local package candidate's reusable state and inspectable build evidence. */
export interface PackageCandidatePaths {
  readonly artifactDirectory: string;
  readonly buildDirectory: string;
  readonly packageDirectory: string;
  /** Version-2 cache locations removed only during a cold rebuild. */
  readonly legacyArtifactDirectory: string;
  readonly legacyStagingDirectory: string;
  readonly receiptPath: string;
  readonly stateDirectory: string;
  readonly tsBuildInfoPath: string;
}

export interface PackageCandidatePathOptions {
  /** Defaults to this checkout's `build/` output root. */
  readonly buildDirectory?: string;
  /** Defaults to this checkout's ignored candidate cache. */
  readonly stateDirectory?: string;
}

const PACKAGE_BUILD_DIRECTORY = "build";
const PACKAGE_CANDIDATE_CACHE_DIRECTORY = ".cache/vibe-check/package-candidate";
const PACKAGE_TARBALL_DIRECTORY = "artifacts";
const UNPACKED_PACKAGE_DIRECTORY = "package";

/** Resolves default and fixture-owned candidate paths without sharing output or cache responsibilities. */
export function packageCandidatePaths(
  repositoryRoot: string,
  options: PackageCandidatePathOptions = {}
): PackageCandidatePaths {
  const repository = resolve(repositoryRoot);
  const buildDirectory = resolve(
    options.buildDirectory ?? join(repository, PACKAGE_BUILD_DIRECTORY)
  );
  const stateDirectory = resolve(
    options.stateDirectory ?? join(repository, PACKAGE_CANDIDATE_CACHE_DIRECTORY)
  );
  if (pathsOverlap(buildDirectory, stateDirectory)) {
    throw new TypeError("package candidate buildDirectory and stateDirectory must not overlap");
  }
  return Object.freeze({
    artifactDirectory: join(buildDirectory, PACKAGE_TARBALL_DIRECTORY),
    buildDirectory,
    packageDirectory: join(buildDirectory, UNPACKED_PACKAGE_DIRECTORY),
    legacyArtifactDirectory: join(stateDirectory, PACKAGE_TARBALL_DIRECTORY),
    legacyStagingDirectory: join(stateDirectory, "staging"),
    receiptPath: join(stateDirectory, "preparation-receipt.json"),
    stateDirectory,
    tsBuildInfoPath: join(stateDirectory, "candidate.tsbuildinfo")
  });
}

function pathsOverlap(first: string, second: string): boolean {
  return first === second || pathContains(first, second) || pathContains(second, first);
}

function pathContains(parent: string, candidate: string): boolean {
  const relativePath = relative(parent, candidate);
  return relativePath.length > 0 && relativePath !== ".." && !relativePath.startsWith(`..${sep}`);
}
