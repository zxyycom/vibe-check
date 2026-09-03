import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, sep } from "node:path";

import { auditStagingRuntime } from "./staging-audit.ts";
import { auditCandidateArtifact } from "./packed-tar-audit.ts";
import type { ArtifactDocumentation } from "./documentation-audit.ts";
import {
  rewriteFunctionMetricsWorkerUrl,
  rewriteRelativeEsmModuleExtensions
} from "./esm-module-specifiers.ts";
import { collectFilePaths, collectRuntimeSourceFilePaths } from "../file-inventory.ts";
import {
  PACKAGE_ENTRY_PATH,
  PACKAGE_ENTRY_SOURCE,
  PACKAGE_FUNCTION_METRICS_MEASUREMENT_RUNTIME_PATH,
  PACKAGE_LICENSE_PATH,
  PACKAGE_LICENSE_SOURCE_PATH,
  PACKAGE_README_PATH,
  PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS,
  PACKAGE_RUNTIME_DIRECTORY,
  PACKAGE_SOURCE_DIRECTORY,
  PACKAGE_TARBALL_STEM,
  PACKAGE_THIRD_PARTY_LICENSES
} from "../package-contract.ts";
import { writeCandidateManifest } from "./manifest.ts";
import { runBun, sha256File } from "../pack.ts";
import { normalizeRuntimeSourceMap } from "./runtime-source-maps.ts";
import { TRANSLATED_ANALYZER_LEGAL_MATERIALS } from "../legal-materials.ts";

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
  /** Candidate cache-owned compiler state; package build evidence never shares this path. */
  readonly tsBuildInfoPath: string;
}): Promise<CandidateArtifact> {
  const {
    artifactDirectory,
    candidateVersion,
    documentation,
    inputFingerprint,
    repositoryRoot,
    stagingDirectory,
    tsBuildInfoPath
  } = input;
  mkdirSync(stagingDirectory, { recursive: true });
  writeCandidateManifest({
    manifestPath: join(stagingDirectory, "package.json"),
    version: candidateVersion
  });
  writeFileSync(join(stagingDirectory, PACKAGE_README_PATH), documentation.readme, "utf8");
  for (const document of documentation.documents) {
    const destination = join(stagingDirectory, document.packagePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, document.content, "utf8");
  }
  for (const material of documentation.machineMaterials) {
    const destination = join(stagingDirectory, material.packagePath);
    mkdirSync(dirname(destination), { recursive: true });
    writeFileSync(destination, material.content);
  }
  copyLegalMaterials({ repositoryRoot, stagingDirectory });

  runBun({
    args: [
      "x",
      "--no-install",
      "tsgo",
      "--ignoreConfig",
      "--allowImportingTsExtensions",
      "--erasableSyntaxOnly",
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
      "--declarationDir",
      join(stagingDirectory, "types"),
      "--outDir",
      join(stagingDirectory, PACKAGE_RUNTIME_DIRECTORY),
      "--rootDir",
      join(repositoryRoot, "src"),
      "--sourceMap",
      "--inlineSources",
      "--tsBuildInfoFile",
      tsBuildInfoPath,
      ...PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS.map((sourcePath) => join(repositoryRoot, sourcePath))
    ],
    cwd: repositoryRoot,
    phase: "emit readable runtime and declarations"
  });
  copyRuntimeSources({ repositoryRoot, stagingDirectory });
  normalizeEmittedRuntime({ stagingDirectory });
  writeFileSync(join(stagingDirectory, PACKAGE_ENTRY_PATH), PACKAGE_ENTRY_SOURCE, "utf8");

  auditStagingRuntime({
    candidateVersion,
    expectedDocuments: documentation.documents,
    expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
    expectedMachineMaterials: documentation.machineMaterials,
    expectedReadme: documentation.readme,
    stagingDirectory
  });
  const expectedFiles = collectFilePaths(stagingDirectory, () => true).map(
    (filePath) => `package/${relative(stagingDirectory, filePath).split(sep).join("/")}`
  );
  const artifactPath = join(artifactDirectory, `${PACKAGE_TARBALL_STEM}-${candidateVersion}.tgz`);
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
    expectedDocuments: documentation.documents,
    expectedJSDocExamplePayloads: documentation.expectedJSDocExamplePayloads,
    expectedMachineMaterials: documentation.machineMaterials,
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

/** Copies approved own and third-party texts instead of treating SPDX fields as legal material. */
function copyLegalMaterials(input: {
  readonly repositoryRoot: string;
  readonly stagingDirectory: string;
}): void {
  const packageLicenseSource = join(input.repositoryRoot, PACKAGE_LICENSE_SOURCE_PATH);
  if (!existsSync(packageLicenseSource)) {
    throw new Error(`candidate source is missing own license material: ${packageLicenseSource}`);
  }
  copyFileSync(packageLicenseSource, join(input.stagingDirectory, PACKAGE_LICENSE_PATH));

  for (const license of PACKAGE_THIRD_PARTY_LICENSES) {
    const sourcePath = join(input.repositoryRoot, license.sourcePath);
    const destinationPath = join(input.stagingDirectory, license.path);
    if (!existsSync(sourcePath)) {
      throw new Error(
        `candidate source is missing ${license.packageName} license material: ${sourcePath}`
      );
    }
    mkdirSync(dirname(destinationPath), { recursive: true });
    copyFileSync(sourcePath, destinationPath);
    if (sha256File(destinationPath) !== license.sha256) {
      throw new Error(
        `candidate ${license.packageName} license material does not match the approved source text`
      );
    }
  }
  for (const material of TRANSLATED_ANALYZER_LEGAL_MATERIALS) {
    const source = join(input.repositoryRoot, material.path);
    const destination = join(input.stagingDirectory, material.path);
    if (!existsSync(source)) {
      throw new Error(`candidate source is missing translated-analyzer legal material: ${source}`);
    }
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(source, destination);
    if (sha256File(destination) !== material.sha256) {
      throw new Error(
        `candidate translated-analyzer legal material does not match its approved source text: ${material.path}`
      );
    }
  }
}

/** Converts TypeScript's emitted .js module graph into the package's ESM .mjs tree. */
function normalizeEmittedRuntime(input: { readonly stagingDirectory: string }): void {
  const runtimeDirectory = join(input.stagingDirectory, PACKAGE_RUNTIME_DIRECTORY);
  const emittedJavaScriptPaths = collectFilePaths(runtimeDirectory, (relativePath) =>
    relativePath.endsWith(".js")
  );
  if (emittedJavaScriptPaths.length === 0) {
    throw new Error("readable runtime emit did not produce any JavaScript modules");
  }
  for (const javascriptPath of emittedJavaScriptPaths) {
    normalizeEmittedModule({ javascriptPath, stagingDirectory: input.stagingDirectory });
  }
}

function normalizeEmittedModule(input: {
  readonly javascriptPath: string;
  readonly stagingDirectory: string;
}): void {
  const sourceMapPath = `${input.javascriptPath}.map`;
  if (!existsSync(sourceMapPath)) {
    throw new Error(`readable runtime module is missing its source map: ${input.javascriptPath}`);
  }
  const modulePath = `${input.javascriptPath.slice(0, -".js".length)}.mjs`;
  const staticModuleSource = rewriteRelativeEsmModuleExtensions({
    fileName: input.javascriptPath,
    source: readFileSync(input.javascriptPath, "utf8")
  });
  const moduleSource = isEmittedFunctionMetricsMeasurement(input)
    ? rewriteFunctionMetricsWorkerUrl({
        fileName: input.javascriptPath,
        source: staticModuleSource
      })
    : staticModuleSource;
  const normalizedModuleSource = rewriteLinkedSourceMapComment({
    javascriptPath: input.javascriptPath,
    modulePath,
    moduleSource
  });
  const normalizedSourceMap = normalizeRuntimeSourceMap({
    modulePath,
    source: readFileSync(sourceMapPath, "utf8"),
    sourceMapPath,
    stagingDirectory: input.stagingDirectory
  });
  writeFileSync(modulePath, normalizedModuleSource, "utf8");
  writeFileSync(`${modulePath}.map`, normalizedSourceMap, "utf8");
  rmSync(input.javascriptPath);
  rmSync(sourceMapPath);
}

function isEmittedFunctionMetricsMeasurement(input: {
  readonly javascriptPath: string;
  readonly stagingDirectory: string;
}): boolean {
  return (
    relative(input.stagingDirectory, input.javascriptPath).split(sep).join("/") ===
    `${PACKAGE_FUNCTION_METRICS_MEASUREMENT_RUNTIME_PATH.slice(0, -".mjs".length)}.js`
  );
}

function rewriteLinkedSourceMapComment(input: {
  readonly javascriptPath: string;
  readonly modulePath: string;
  readonly moduleSource: string;
}): string {
  const sourceMapComment = `//# sourceMappingURL=${basename(input.javascriptPath)}.map`;
  const commentStart = input.moduleSource.lastIndexOf(sourceMapComment);
  if (commentStart === -1) {
    throw new Error(
      `readable runtime module does not link its source map: ${input.javascriptPath}`
    );
  }
  const trailingSource = input.moduleSource.slice(commentStart + sourceMapComment.length);
  if (trailingSource !== "" && trailingSource !== "\n") {
    throw new Error(
      `readable runtime module does not end with its source map reference: ${input.javascriptPath}`
    );
  }
  return `${input.moduleSource.slice(0, commentStart)}//# sourceMappingURL=${basename(input.modulePath)}.map${trailingSource}`;
}

function copyRuntimeSources(input: {
  readonly repositoryRoot: string;
  readonly stagingDirectory: string;
}): void {
  const sourceRoot = join(input.repositoryRoot, "src");
  for (const sourcePath of collectRuntimeSourceFilePaths(sourceRoot)) {
    const destination = join(
      input.stagingDirectory,
      PACKAGE_SOURCE_DIRECTORY,
      relative(sourceRoot, sourcePath)
    );
    mkdirSync(dirname(destination), { recursive: true });
    copyFileSync(sourcePath, destination);
  }
}
