import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { isNonArrayRecord } from "../../value-guards.ts";
import { collectFilePaths, collectRuntimeSourceFilePaths } from "../file-inventory.ts";
import { CANDIDATE_DEPENDENCIES, MOMOA_LICENSE_SOURCE_PATH } from "../package-contract.ts";
import { PACKAGE_CHECK_GUIDES } from "../../docs/package-api/check-guide-registry.ts";
import { PACKAGE_API_MARKDOWN_DOCUMENTS } from "../../docs/package-api/example-projections.ts";
import { PACKAGE_MACHINE_MATERIAL_PATHS } from "../../docs/machine-artifacts/package-materials.ts";

const DOCUMENTATION_INPUT_PATHS = Object.freeze([
  "scripts/docs/package-api/example-projections.ts",
  "scripts/docs/package-api/markdown-example-fences.ts",
  "scripts/docs/package-api/render.ts",
  "scripts/docs/package-api/check-guide-registry.ts",
  "scripts/docs/package-api/check-guides.ts",
  "scripts/docs/machine-artifacts/package-materials.ts"
]);
const DOCUMENTATION_EXAMPLES_DIRECTORY = "docs/examples/package-api";
const ARTIFACT_TOOLCHAIN_PACKAGES = Object.freeze(["@typescript/native-preview", "typescript"]);

/**
 * Returns the deterministic source fingerprint that binds one local candidate version.
 *
 * All `scripts/package/**` sources participate deliberately: artifact and candidate changes
 * may alter the accepted tarball, receipt, install, or audit evidence. This conservative
 * invalidation avoids reusing a candidate after any package-lifecycle boundary changes.
 */
export function createArtifactFingerprint(repositoryRoot: string): string {
  const hash = createHash("sha256");
  hash.update(`bun=${bunVersion()}\0`);
  hash.update(`artifact-toolchain=${JSON.stringify(artifactToolchainVersions())}\0`);
  hash.update(`candidate-dependencies=${JSON.stringify(CANDIDATE_DEPENDENCIES)}\0`);

  const inputFiles = [
    ...collectRuntimeSourceFilePaths(join(repositoryRoot, "src")),
    ...documentationInputFiles(repositoryRoot),
    ...collectPackageSourceFiles(repositoryRoot),
    join(repositoryRoot, MOMOA_LICENSE_SOURCE_PATH)
  ].sort();
  for (const filePath of inputFiles) {
    const relativePath = relative(repositoryRoot, filePath).split(sep).join("/");
    hash.update(relativePath);
    hash.update("\0");
    hash.update(readFileSync(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function collectPackageSourceFiles(repositoryRoot: string): readonly string[] {
  return collectFilePaths(
    join(repositoryRoot, "scripts/package"),
    (relativePath) => relativePath.endsWith(".ts") && !relativePath.endsWith(".test.ts")
  );
}

function documentationInputFiles(repositoryRoot: string): readonly string[] {
  return Object.freeze([
    ...DOCUMENTATION_INPUT_PATHS.map((path) => join(repositoryRoot, path)),
    ...collectFilePaths(join(repositoryRoot, DOCUMENTATION_EXAMPLES_DIRECTORY), (path) =>
      path.endsWith(".ts")
    ),
    ...PACKAGE_API_MARKDOWN_DOCUMENTS.map((document) => join(repositoryRoot, document.packagePath)),
    ...PACKAGE_CHECK_GUIDES.map((guide) => join(repositoryRoot, guide.sourcePath)),
    ...PACKAGE_MACHINE_MATERIAL_PATHS.map((path) => join(repositoryRoot, path))
  ]);
}

function bunVersion(): string {
  const version = process.versions.bun;
  if (typeof version !== "string" || version.length === 0) {
    throw new Error("candidate preparation requires a Bun runtime with a reported version");
  }
  return version;
}

function artifactToolchainVersions(): Readonly<Record<string, string>> {
  return Object.freeze(
    Object.fromEntries(
      ARTIFACT_TOOLCHAIN_PACKAGES.map((packageName) => [
        packageName,
        installedPackageVersion(packageName)
      ])
    )
  );
}

function installedPackageVersion(packageName: string): string {
  let manifestPath: string;
  try {
    manifestPath = fileURLToPath(import.meta.resolve(`${packageName}/package.json`));
  } catch (error: unknown) {
    throw new Error(`could not resolve artifact toolchain package ${packageName}`, {
      cause: error
    });
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch (error: unknown) {
    throw new Error(`could not read artifact toolchain package manifest: ${manifestPath}`, {
      cause: error
    });
  }
  if (!isNonArrayRecord(manifest) || typeof manifest.version !== "string") {
    throw new Error(`artifact toolchain package manifest has no version: ${manifestPath}`);
  }
  return manifest.version;
}
