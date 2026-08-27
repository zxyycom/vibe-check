import { statSync } from "node:fs";
import { dirname, isAbsolute, relative, sep } from "node:path";

import { collectFilePaths } from "../file-inventory.ts";
import { readGateCandidateAcceptanceArtifact } from "../candidate/acceptance-input.ts";

export const CANDIDATE_STAGING_DIRECTORY_ENV = "VIBE_CHECK_CANDIDATE_STAGING_DIRECTORY";

export interface ArtifactAcceptanceInput {
  readonly artifactPath: string;
  readonly files: readonly string[];
  readonly stagingDirectory: string;
}

/** Restores the provider-owned package material, or leaves a direct test to build its fixture. */
export function readGateArtifactAcceptanceInput(
  environment: NodeJS.ProcessEnv = process.env
): ArtifactAcceptanceInput | undefined {
  const artifact = readGateCandidateAcceptanceArtifact(environment);
  const stagingDirectory = environment[CANDIDATE_STAGING_DIRECTORY_ENV];
  if (artifact === undefined && stagingDirectory === undefined) return undefined;
  const artifactStateDirectory =
    artifact === undefined ? undefined : dirname(dirname(artifact.artifactPath));
  const stagingStateDirectory =
    stagingDirectory === undefined ? undefined : dirname(stagingDirectory);
  if (
    artifact === undefined ||
    stagingDirectory === undefined ||
    !isAbsolute(stagingDirectory) ||
    stagingStateDirectory !== artifactStateDirectory ||
    !pathIsDirectory(stagingDirectory)
  ) {
    throw new TypeError("Gate artifact acceptance input is incomplete or invalid");
  }
  let files: string[];
  try {
    files = collectFilePaths(stagingDirectory, () => true).map(
      (filePath) => `package/${relative(stagingDirectory, filePath).split(sep).join("/")}`
    );
  } catch {
    throw new TypeError("Gate artifact acceptance input is incomplete or invalid");
  }
  if (files.length === 0) {
    throw new TypeError("Gate artifact acceptance staging inventory is empty");
  }
  return Object.freeze({
    artifactPath: artifact.artifactPath,
    files: Object.freeze(files),
    stagingDirectory
  });
}

function pathIsDirectory(directoryPath: string): boolean {
  try {
    return statSync(directoryPath).isDirectory();
  } catch {
    return false;
  }
}
