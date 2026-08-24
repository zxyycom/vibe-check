import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

import {
  auditCandidateArtifact,
  auditStagingRuntime,
  type ArtifactDocumentation
} from "./audit.ts";
import {
  CANDIDATE_NAME,
  collectFiles,
  PACKAGE_ENTRY_PATH,
  PACKAGE_README_PATH
} from "./fingerprint.ts";
import { writeCandidateManifest } from "./manifest.ts";
import { runBun, sha256File } from "./pack.ts";

export interface CandidateArtifact {
  readonly artifactPath: string;
  readonly candidateVersion: string;
  readonly files: readonly string[];
  readonly inputFingerprint: string;
  readonly sha256: string;
  readonly stagingDirectory: string;
}

/** Builds, packs, and audits one exact local artifact from the public source entry. */
export async function buildCandidateArtifact(input: {
  readonly artifactDirectory: string;
  readonly candidateVersion: string;
  readonly documentation: ArtifactDocumentation;
  readonly inputFingerprint: string;
  readonly repositoryRoot: string;
  readonly stagingDirectory: string;
  readonly stateDirectory: string;
}): Promise<CandidateArtifact> {
  const {
    artifactDirectory,
    candidateVersion,
    documentation,
    inputFingerprint,
    repositoryRoot,
    stagingDirectory,
    stateDirectory
  } = input;
  mkdirSync(stagingDirectory, { recursive: true });
  writeCandidateManifest(join(stagingDirectory, "package.json"), candidateVersion);
  writeFileSync(join(stagingDirectory, PACKAGE_README_PATH), documentation.readme, "utf8");

  runBun({
    args: [
      "build",
      join(repositoryRoot, "src/index.ts"),
      "--target=bun",
      "--format=esm",
      "--packages=bundle",
      "--sourcemap=none",
      `--outfile=${join(stagingDirectory, PACKAGE_ENTRY_PATH)}`
    ],
    cwd: repositoryRoot,
    phase: "build runtime"
  });
  runBun({
    args: [
      "x",
      "--no-install",
      "tsgo",
      "--ignoreConfig",
      "--allowImportingTsExtensions",
      "--erasableSyntaxOnly",
      "--incremental",
      "--module",
      "nodenext",
      "--moduleResolution",
      "nodenext",
      "--strict",
      "--target",
      "esnext",
      "--types",
      "node",
      "--verbatimModuleSyntax",
      "--rewriteRelativeImportExtensions",
      "--declaration",
      "--emitDeclarationOnly",
      "--outDir",
      join(stagingDirectory, "types"),
      "--rootDir",
      join(repositoryRoot, "src"),
      "--tsBuildInfoFile",
      join(stateDirectory, "candidate.tsbuildinfo"),
      join(repositoryRoot, "src/index.ts")
    ],
    cwd: repositoryRoot,
    phase: "emit declarations"
  });

  auditStagingRuntime({
    expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
    expectedReadme: documentation.readme,
    stagingDirectory
  });
  const expectedFiles = collectFiles(stagingDirectory, () => true).map(
    (filePath) => `package/${relative(stagingDirectory, filePath).split(sep).join("/")}`
  );
  const artifactPath = join(artifactDirectory, `${CANDIDATE_NAME}-${candidateVersion}.tgz`);
  mkdirSync(artifactDirectory, { recursive: true });
  runBun({
    args: ["pm", "pack", `--destination=${artifactDirectory}`, "--ignore-scripts", "--quiet"],
    cwd: stagingDirectory,
    phase: "pack candidate"
  });
  if (!existsSync(artifactPath)) {
    throw new Error(`candidate pack did not produce expected artifact ${artifactPath}`);
  }
  const sha256 = sha256File(artifactPath);
  auditCandidateArtifact({
    artifactPath,
    candidateVersion,
    expectedFiles,
    expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
    expectedReadme: documentation.readme,
    expectedSha256: sha256
  });
  return Object.freeze({
    artifactPath,
    candidateVersion,
    files: Object.freeze(expectedFiles),
    inputFingerprint,
    sha256,
    stagingDirectory
  });
}
