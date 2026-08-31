import { existsSync, readFileSync, rmSync } from "node:fs";

import { assertInstalledCandidateMaterials } from "./installed-materials.ts";
import { dirname, join, resolve } from "node:path";
import type { PackageDocumentationFile } from "../../docs/package-api/check-guides.ts";
import type { PackageMachineMaterial } from "../../docs/machine-artifacts/package-materials.ts";
import { fileURLToPath } from "node:url";

import { errorMessage } from "../../error-message.ts";
import { isPathWithin } from "../../repository-files/paths.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import {
  AJV_PACKAGE_NAME,
  CANDIDATE_DEPENDENCIES,
  JSCPD_BIN_NAME,
  JSCPD_PACKAGE_NAME,
  PACKAGE_NAME
} from "../package-contract.ts";
import {
  isAcceptedPackageDependencyVersion,
  packageDependencyVersionRequirementText,
  type PackageDependencyVersionRequirement
} from "../dependency-version.ts";
import { runBun, sha256File } from "../pack.ts";
import type { InstalledCandidate } from "./receipt.ts";

type CandidateRuntimeDependencyName = typeof AJV_PACKAGE_NAME | typeof JSCPD_PACKAGE_NAME;

interface VerifiedCandidateDependency {
  readonly manifest: Readonly<Record<string, unknown>>;
  readonly packageManifestPath: string;
}

/** Replaces the dedicated private install and verifies the exact installed package entry. */
export function installCandidate(input: {
  readonly artifactPath: string;
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly expectedDocuments?: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedMachineMaterials?: readonly PackageMachineMaterial[];
  readonly expectedReadme: string;
}): InstalledCandidate {
  const {
    artifactPath,
    candidateVersion,
    consumerDirectory,
    expectedJSDocExamplePayloads,
    expectedReadme
  } = input;
  const expectedDocuments = input.expectedDocuments ?? [];
  const expectedMachineMaterials = input.expectedMachineMaterials ?? [];
  assertPrivateCandidateConsumer(consumerDirectory);
  // This directory is a dedicated private candidate consumer. Replacing its whole
  // install prevents Bun from satisfying a missing candidate dependency through
  // an ancestor node_modules directory.
  rmSync(join(consumerDirectory, "node_modules"), { force: true, recursive: true });
  runBun({
    args: ["install", "--no-save", "--ignore-scripts", artifactPath],
    cwd: consumerDirectory,
    phase: `install candidate in ${consumerDirectory}`
  });
  return verifyInstallation({
    candidateVersion,
    consumerDirectory,
    expectedDocuments,
    expectedJSDocExamplePayloads,
    expectedMachineMaterials,
    expectedReadme
  });
}

/** Inspects a candidate without accepting an ancestor package or dependency fallback. */
export function inspectInstallation(input: {
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly expectedDocuments?: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedMachineMaterials?: readonly PackageMachineMaterial[];
  readonly expectedReadme: string;
}): InstalledCandidate | undefined {
  try {
    return verifyInstallation(input);
  } catch {
    return undefined;
  }
}

/** Strictly validates a fresh install while retaining every failed validation stage. */
function verifyInstallation(input: {
  readonly candidateVersion: string;
  readonly consumerDirectory: string;
  readonly expectedDocuments?: readonly PackageDocumentationFile[];
  readonly expectedJSDocExamplePayloads: readonly string[];
  readonly expectedMachineMaterials?: readonly PackageMachineMaterial[];
  readonly expectedReadme: string;
}): InstalledCandidate {
  const { candidateVersion, consumerDirectory, expectedJSDocExamplePayloads, expectedReadme } =
    input;
  const expectedDocuments = input.expectedDocuments ?? [];
  const expectedMachineMaterials = input.expectedMachineMaterials ?? [];
  const packageDirectory = join(consumerDirectory, "node_modules", PACKAGE_NAME);
  assertInstalledCandidateManifest(packageDirectory, candidateVersion);
  const resolvedEntryPath = resolveInstalledCandidateEntry(consumerDirectory, packageDirectory);
  assertInstalledCandidateMaterials({
    packageDirectory,
    expectedDocuments,
    expectedMachineMaterials,
    expectedJSDocExamplePayloads,
    expectedReadme
  });
  verifyCandidateJscpdDependency(consumerDirectory, resolvedEntryPath);
  verifyCandidateDependency({
    candidateEntryPath: resolvedEntryPath,
    consumerDirectory,
    packageName: AJV_PACKAGE_NAME,
    versionRequirement: { kind: "exact", version: CANDIDATE_DEPENDENCIES.ajv }
  });
  return Object.freeze({
    installedPackageDirectory: packageDirectory,
    resolvedEntryPath,
    resolvedEntrySha256: sha256File(resolvedEntryPath)
  });
}

function assertInstalledCandidateManifest(
  packageDirectory: string,
  candidateVersion: string
): void {
  const manifestPath = join(packageDirectory, "package.json");
  if (!existsSync(manifestPath))
    throw new Error(`installed candidate package manifest is missing: ${manifestPath}`);
  const manifest = readJsonFile(manifestPath, "installed candidate package manifest");
  if (
    !isNonArrayRecord(manifest) ||
    manifest.name !== PACKAGE_NAME ||
    manifest.version !== candidateVersion
  )
    throw new Error(
      `installed candidate package manifest must declare ${PACKAGE_NAME}@${candidateVersion}: ${manifestPath}`
    );
}

function resolveInstalledCandidateEntry(
  consumerDirectory: string,
  packageDirectory: string
): string {
  const resolvedUrl = runBun({
    args: ["-e", "process.stdout.write(import.meta.resolve(process.argv[1]))", PACKAGE_NAME],
    cwd: consumerDirectory,
    phase: `resolve candidate in ${consumerDirectory}`
  }).trim();
  let resolvedEntryPath: string;
  try {
    resolvedEntryPath = fileURLToPath(resolvedUrl);
  } catch (error: unknown) {
    throw new Error(
      `candidate entry resolution returned an invalid file URL from ${consumerDirectory}: ${errorMessage(error)}`,
      { cause: error }
    );
  }
  if (!existsSync(resolvedEntryPath))
    throw new Error(`candidate entry resolved to a missing path: ${resolvedEntryPath}`);
  if (!isPathWithin(packageDirectory, resolvedEntryPath))
    throw new Error(`candidate entry resolved outside its installed package: ${resolvedEntryPath}`);
  return resolvedEntryPath;
}

function assertPrivateCandidateConsumer(consumerDirectory: string): void {
  const manifestPath = join(consumerDirectory, "package.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`private candidate consumer package manifest is missing: ${manifestPath}`);
  }
  const manifest = readJsonFile(manifestPath, "private candidate consumer package manifest");
  if (!isNonArrayRecord(manifest) || manifest.private !== true) {
    throw new Error(`candidate consumer must set private: true in ${manifestPath}`);
  }
}

function verifyCandidateJscpdDependency(
  consumerDirectory: string,
  candidateEntryPath: string
): void {
  const { manifest, packageManifestPath } = verifyCandidateDependency({
    candidateEntryPath,
    consumerDirectory,
    packageName: JSCPD_PACKAGE_NAME,
    versionRequirement: { kind: "range", range: CANDIDATE_DEPENDENCIES.jscpd }
  });

  const binTarget = declaredJscpdBinTarget(manifest.bin);
  if (binTarget === undefined) {
    throw new Error(
      `resolved ${JSCPD_PACKAGE_NAME} package manifest does not declare its ${JSCPD_BIN_NAME} bin: ${packageManifestPath}`
    );
  }
  const packageDirectory = dirname(packageManifestPath);
  const binPath = resolve(packageDirectory, binTarget);
  if (!isPathWithin(packageDirectory, binPath)) {
    throw new Error(`resolved ${JSCPD_PACKAGE_NAME} bin escapes its package directory: ${binPath}`);
  }
  if (!existsSync(binPath)) {
    throw new Error(`resolved ${JSCPD_PACKAGE_NAME} bin is missing: ${binPath}`);
  }
}

/** Resolves one declared runtime dependency from the candidate entry and proves it stays in its private consumer. */
function verifyCandidateDependency(input: {
  readonly candidateEntryPath: string;
  readonly consumerDirectory: string;
  readonly packageName: CandidateRuntimeDependencyName;
  readonly versionRequirement: PackageDependencyVersionRequirement;
}): VerifiedCandidateDependency {
  const { candidateEntryPath, consumerDirectory, packageName, versionRequirement } = input;
  const packageManifestPath = runBun({
    args: [
      "-e",
      `import { createRequire } from 'node:module'; process.stdout.write(createRequire(process.argv[1]).resolve('${packageName}/package.json'))`,
      candidateEntryPath
    ],
    cwd: consumerDirectory,
    phase: `resolve declared ${packageName} dependency in ${consumerDirectory}`
  }).trim();
  if (!isPathWithin(join(consumerDirectory, "node_modules"), packageManifestPath)) {
    throw new Error(
      `candidate ${packageName} dependency resolved outside private consumer node_modules: ${packageManifestPath}`
    );
  }
  const manifest = readJsonFile(packageManifestPath, `resolved ${packageName} package manifest`);
  const resolvedVersion =
    isNonArrayRecord(manifest) && typeof manifest.version === "string"
      ? manifest.version
      : undefined;
  if (
    !isNonArrayRecord(manifest) ||
    manifest.name !== packageName ||
    resolvedVersion === undefined ||
    !isAcceptedPackageDependencyVersion({
      requirement: versionRequirement,
      resolvedVersion
    })
  ) {
    throw new Error(
      `resolved ${packageName} package manifest must satisfy ${packageName}@${packageDependencyVersionRequirementText(versionRequirement)}: ${packageManifestPath}`
    );
  }
  return Object.freeze({ manifest, packageManifestPath });
}

function readJsonFile(filePath: string, description: string): unknown {
  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (error: unknown) {
    throw new Error(`could not read ${description} ${filePath}: ${errorMessage(error)}`, {
      cause: error
    });
  }
  try {
    return JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(`could not parse ${description} ${filePath}: ${errorMessage(error)}`, {
      cause: error
    });
  }
}

function declaredJscpdBinTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (!isNonArrayRecord(value)) return undefined;
  const target = value[JSCPD_BIN_NAME];
  return typeof target === "string" ? target : undefined;
}
