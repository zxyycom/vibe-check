import { isAbsolute } from "node:path";

import { fileMatchesSha256, isSha256Digest } from "../pack.ts";

export const CANDIDATE_ARTIFACT_PATH_ENV = "VIBE_CHECK_CANDIDATE_ARTIFACT_PATH";
export const CANDIDATE_ARTIFACT_SHA256_ENV = "VIBE_CHECK_CANDIDATE_ARTIFACT_SHA256";

export interface CandidateAcceptanceArtifact {
  readonly artifactPath: string;
  readonly sha256: string;
}

/** Restores an exact Gate artifact input, or reports that a direct target supplied none. */
export function readGateCandidateAcceptanceArtifact(
  environment: NodeJS.ProcessEnv = process.env
): CandidateAcceptanceArtifact | undefined {
  const artifactPath = environment[CANDIDATE_ARTIFACT_PATH_ENV];
  const sha256 = environment[CANDIDATE_ARTIFACT_SHA256_ENV];
  if (artifactPath === undefined && sha256 === undefined) return undefined;
  if (
    artifactPath === undefined ||
    sha256 === undefined ||
    !isAbsolute(artifactPath) ||
    !isSha256Digest(sha256) ||
    !fileMatchesSha256(artifactPath, sha256)
  ) {
    throw new TypeError("Gate candidate acceptance input is incomplete or invalid");
  }
  return Object.freeze({ artifactPath, sha256 });
}

/** Uses Gate-provided exact artifact data, with direct-test preparation as the only fallback. */
export async function resolveCandidateAcceptanceArtifact(
  environment: NodeJS.ProcessEnv = process.env
): Promise<CandidateAcceptanceArtifact> {
  const gateInput = readGateCandidateAcceptanceArtifact(environment);
  if (gateInput !== undefined) return gateInput;
  // Gate consumers already have exact prepared evidence. Only a direct target
  // without it needs the local builder and its documentation/compiler graph.
  const { preparePackageCandidate } = await import("./prepare.ts");
  const prepared = await preparePackageCandidate();
  return Object.freeze({ artifactPath: prepared.artifactPath, sha256: prepared.sha256 });
}
