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
  readonly version: string;
}

interface CandidateInstallationProbe {
  readonly ajvPackageManifestPath: string;
  readonly candidateEntryUrl: string;
  readonly jscpdPackageManifestPath: string;
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
  const probe = probeCandidateInstallation(consumerDirectory);
  const resolvedEntryPath = resolveInstalledCandidateEntry(
    packageDirectory,
    probe.candidateEntryUrl
  );
  assertInstalledCandidateMaterials({
    packageDirectory,
    expectedDocuments,
    expectedMachineMaterials,
    expectedJSDocExamplePayloads,
    expectedReadme
  });
  verifyCandidateJscpdDependency({
    consumerDirectory,
    packageManifestPath: probe.jscpdPackageManifestPath
  });
  verifyCandidateDependency({
    consumerDirectory,
    packageManifestPath: probe.ajvPackageManifestPath,
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

function probeCandidateInstallation(consumerDirectory: string): CandidateInstallationProbe {
  const output = runBun({
    args: [
      "-e",
      `import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const candidateEntryUrl = import.meta.resolve(process.argv[1]);
const candidateEntryPath = fileURLToPath(candidateEntryUrl);
const requireFromCandidate = createRequire(candidateEntryPath);
process.stdout.write(JSON.stringify({
  ajvPackageManifestPath: requireFromCandidate.resolve(process.argv[2] + "/package.json"),
  candidateEntryUrl,
  jscpdPackageManifestPath: requireFromCandidate.resolve(process.argv[3] + "/package.json")
}));`,
      PACKAGE_NAME,
      AJV_PACKAGE_NAME,
      JSCPD_PACKAGE_NAME
    ],
    cwd: consumerDirectory,
    phase: `resolve candidate and dependencies in ${consumerDirectory}`
  });
  let value: unknown;
  try {
    value = JSON.parse(output);
  } catch (error: unknown) {
    throw new Error(
      `candidate installation resolution returned invalid JSON from ${consumerDirectory}: ${errorMessage(error)}`,
      { cause: error }
    );
  }
  if (
    !isNonArrayRecord(value) ||
    typeof value.candidateEntryUrl !== "string" ||
    typeof value.ajvPackageManifestPath !== "string" ||
    typeof value.jscpdPackageManifestPath !== "string" ||
    Object.keys(value).length !== 3
  ) {
    throw new Error(
      `candidate installation resolution returned an invalid result from ${consumerDirectory}`
    );
  }
  return Object.freeze({
    ajvPackageManifestPath: value.ajvPackageManifestPath,
    candidateEntryUrl: value.candidateEntryUrl,
    jscpdPackageManifestPath: value.jscpdPackageManifestPath
  });
}

function resolveInstalledCandidateEntry(packageDirectory: string, resolvedUrl: string): string {
  let resolvedEntryPath: string;
  try {
    resolvedEntryPath = fileURLToPath(resolvedUrl);
  } catch (error: unknown) {
    throw new Error(
      `candidate entry resolution returned an invalid file URL for ${packageDirectory}: ${errorMessage(error)}`,
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
  input: Readonly<{ readonly consumerDirectory: string; readonly packageManifestPath: string }>
): void {
  const { manifest, packageManifestPath } = verifyCandidateDependency({
    consumerDirectory: input.consumerDirectory,
    packageManifestPath: input.packageManifestPath,
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

/** Validates one probed runtime dependency and proves it stays in the private consumer. */
function verifyCandidateDependency(input: {
  readonly consumerDirectory: string;
  readonly packageManifestPath: string;
  readonly packageName: CandidateRuntimeDependencyName;
  readonly versionRequirement: PackageDependencyVersionRequirement;
}): VerifiedCandidateDependency {
  const { consumerDirectory, packageManifestPath, packageName, versionRequirement } = input;
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
  return Object.freeze({ manifest, packageManifestPath, version: resolvedVersion });
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
