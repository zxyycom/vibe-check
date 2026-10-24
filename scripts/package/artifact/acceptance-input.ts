import { statSync } from "node:fs";
import { dirname, isAbsolute, relative, sep } from "node:path";

import { collectFilePaths } from "../file-inventory.ts";
import { readGateCandidateAcceptanceArtifact } from "../candidate/acceptance-input.ts";
import { readTranslatedAnalyzerAttributionNotice } from "../legal-materials.ts";
import {
  artifactDocumentation,
  type ArtifactDocumentation,
  type PackageDocumentationExpectation
} from "./documentation-audit.ts";
import { readPackageDocumentationInput } from "./documentation-input.ts";
import { auditStagingRuntime } from "./staging-audit.ts";

export const CANDIDATE_STAGING_DIRECTORY_ENV = "VIBE_CHECK_CANDIDATE_STAGING_DIRECTORY";
export const CANDIDATE_VERSION_ENV = "VIBE_CHECK_CANDIDATE_VERSION";

export interface ArtifactAcceptanceInput {
  readonly artifactPath: string;
  readonly sha256: string;
  readonly candidateVersion: string;
  readonly files: readonly string[];
  readonly stagingDirectory: string;
}

/** Selects exact Gate evidence or direct-test construction without repairing missing Gate docs. */
export async function prepareArtifactAcceptanceInput(input: {
  readonly repositoryRoot: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly buildDirect: (documentation: ArtifactDocumentation) => Promise<ArtifactAcceptanceInput>;
  readonly renderDocumentation?: typeof artifactDocumentation;
  readonly audit?: typeof auditStagingRuntime;
}): Promise<
  Readonly<{
    readonly artifact: ArtifactAcceptanceInput;
    readonly documentation: PackageDocumentationExpectation;
  }>
> {
  const environment = input.environment ?? process.env;
  const artifact = readGateArtifactAcceptanceInput(environment);
  if (artifact !== undefined) {
    const documentation = readPackageDocumentationInput({
      artifact,
      environment,
      repositoryRoot: input.repositoryRoot
    });
    if (documentation === undefined) {
      throw new TypeError("Gate artifact acceptance requires its source documentation input");
    }
    (input.audit ?? auditStagingRuntime)({
      candidateVersion: artifact.candidateVersion,
      repositoryRoot: input.repositoryRoot,
      expectedDocuments: documentation.documents,
      expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
      expectedMachineMaterials: documentation.machineMaterials,
      expectedAttributionNotice: readTranslatedAnalyzerAttributionNotice(input.repositoryRoot),
      expectedReadme: documentation.readme,
      stagingDirectory: artifact.stagingDirectory
    });
    return Object.freeze({ artifact, documentation });
  }
  const documentation = (input.renderDocumentation ?? artifactDocumentation)(input.repositoryRoot);
  return Object.freeze({ artifact: await input.buildDirect(documentation), documentation });
}

/** Restores the provider-owned package material, or leaves a direct test to build its fixture. */
export function readGateArtifactAcceptanceInput(
  environment: NodeJS.ProcessEnv = process.env
): ArtifactAcceptanceInput | undefined {
  const artifact = readGateCandidateAcceptanceArtifact(environment);
  const stagingDirectory = environment[CANDIDATE_STAGING_DIRECTORY_ENV];
  const candidateVersion = environment[CANDIDATE_VERSION_ENV];
  if (artifact === undefined && stagingDirectory === undefined && candidateVersion === undefined) {
    return undefined;
  }
  const input = parseArtifactAcceptanceIdentity(artifact, stagingDirectory, candidateVersion);
  const files = stagingPackageFiles(input.stagingDirectory);
  if (files.length === 0) {
    throw new TypeError("Gate artifact acceptance staging inventory is empty");
  }
  return Object.freeze({
    artifactPath: input.artifactPath,
    sha256: input.sha256,
    candidateVersion: input.candidateVersion,
    files: Object.freeze(files),
    stagingDirectory: input.stagingDirectory
  });
}

function parseArtifactAcceptanceIdentity(
  artifact: ReturnType<typeof readGateCandidateAcceptanceArtifact>,
  stagingDirectory: string | undefined,
  candidateVersion: string | undefined
): Readonly<{
  readonly artifactPath: string;
  readonly candidateVersion: string;
  readonly sha256: string;
  readonly stagingDirectory: string;
}> {
  const artifactBuildDirectory =
    artifact === undefined ? undefined : dirname(dirname(artifact.artifactPath));
  const stagingBuildDirectory =
    stagingDirectory === undefined ? undefined : dirname(stagingDirectory);
  if (
    artifact === undefined ||
    stagingDirectory === undefined ||
    candidateVersion === undefined ||
    candidateVersion.length === 0 ||
    !isAbsolute(stagingDirectory) ||
    stagingBuildDirectory !== artifactBuildDirectory ||
    !pathIsDirectory(stagingDirectory)
  ) {
    throw new TypeError("Gate artifact acceptance input is incomplete or invalid");
  }
  return Object.freeze({
    artifactPath: artifact.artifactPath,
    sha256: artifact.sha256,
    candidateVersion,
    stagingDirectory
  });
}

function stagingPackageFiles(stagingDirectory: string): readonly string[] {
  try {
    return collectFilePaths(stagingDirectory, () => true).map(
      (filePath) => `package/${relative(stagingDirectory, filePath).split(sep).join("/")}`
    );
  } catch {
    throw new TypeError("Gate artifact acceptance input is incomplete or invalid");
  }
}

function pathIsDirectory(directoryPath: string): boolean {
  try {
    return statSync(directoryPath).isDirectory();
  } catch {
    return false;
  }
}
