import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { isPathWithin } from "../../repository-files/paths.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import { readReleaseManifestDependency } from "../artifact/manifest.ts";
import { AJV_PACKAGE_NAME, JSCPD_BIN_NAME, JSCPD_PACKAGE_NAME } from "../package-contract.ts";
import {
  isAcceptedPackageDependencyVersion,
  packageDependencyVersionRequirementText,
  type PackageDependencyVersionRequirement
} from "../dependency-version.ts";
import { auditInstalledDependencyLicenses } from "./dependency-license-audit.ts";

export interface CandidateDependencyProbe {
  readonly ajvPackageManifestPath: string;
  readonly jscpdPackageManifestPath: string;
}

/** Validates the installed runtime dependencies against the static release manifest. */
export function verifyCandidateRuntimeDependencies(input: {
  readonly consumerDirectory: string;
  readonly packageDirectory: string;
  readonly repositoryRoot: string;
  readonly probe: CandidateDependencyProbe;
}): void {
  auditInstalledDependencyLicenses({
    candidatePackageDirectory: input.packageDirectory,
    consumerDirectory: input.consumerDirectory
  });
  verifyJscpd({
    consumerDirectory: input.consumerDirectory,
    packageManifestPath: input.probe.jscpdPackageManifestPath,
    requirement: readReleaseManifestDependency(input.repositoryRoot, JSCPD_PACKAGE_NAME)
  });
  verifyDependency({
    consumerDirectory: input.consumerDirectory,
    packageManifestPath: input.probe.ajvPackageManifestPath,
    packageName: AJV_PACKAGE_NAME,
    versionRequirement: {
      kind: "exact",
      version: readReleaseManifestDependency(input.repositoryRoot, AJV_PACKAGE_NAME)
    }
  });
}

function verifyJscpd(input: {
  readonly consumerDirectory: string;
  readonly packageManifestPath: string;
  readonly requirement: string;
}): void {
  const { manifest, packageManifestPath } = verifyDependency({
    consumerDirectory: input.consumerDirectory,
    packageManifestPath: input.packageManifestPath,
    packageName: JSCPD_PACKAGE_NAME,
    versionRequirement: { kind: "range", range: input.requirement }
  });
  const binTarget = declaredJscpdBinTarget(manifest.bin);
  if (binTarget === undefined)
    throw new Error(
      `resolved jscpd package manifest does not declare its jscpd bin: ${packageManifestPath}`
    );
  const packageDirectory = dirname(packageManifestPath);
  const binPath = resolve(packageDirectory, binTarget);
  if (!isPathWithin(packageDirectory, binPath))
    throw new Error(`resolved jscpd bin escapes its package directory: ${binPath}`);
  if (!existsSync(binPath)) throw new Error(`resolved jscpd bin is missing: ${binPath}`);
}

function verifyDependency(input: {
  readonly consumerDirectory: string;
  readonly packageManifestPath: string;
  readonly packageName: string;
  readonly versionRequirement: PackageDependencyVersionRequirement;
}) {
  if (!isPathWithin(join(input.consumerDirectory, "node_modules"), input.packageManifestPath))
    throw new Error(
      `candidate ${input.packageName} dependency resolved outside private consumer node_modules: ${input.packageManifestPath}`
    );
  const manifest = readJsonFile(
    input.packageManifestPath,
    `resolved ${input.packageName} package manifest`
  );
  const resolvedVersion =
    isNonArrayRecord(manifest) && typeof manifest.version === "string"
      ? manifest.version
      : undefined;
  if (
    !isNonArrayRecord(manifest) ||
    manifest.name !== input.packageName ||
    resolvedVersion === undefined ||
    !isAcceptedPackageDependencyVersion({ requirement: input.versionRequirement, resolvedVersion })
  )
    throw new Error(
      `resolved ${input.packageName} package manifest must satisfy ${input.packageName}@${packageDependencyVersionRequirementText(input.versionRequirement)}: ${input.packageManifestPath}`
    );
  return Object.freeze({
    manifest,
    packageManifestPath: input.packageManifestPath,
    version: resolvedVersion
  });
}

function readJsonFile(filePath: string, description: string): unknown {
  let source: string;
  try {
    source = readFileSync(filePath, "utf8");
  } catch (error: unknown) {
    throw new Error(`could not read ${description} ${filePath}: ${String(error)}`, {
      cause: error
    });
  }
  try {
    return JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(`could not parse ${description} ${filePath}: ${String(error)}`, {
      cause: error
    });
  }
}

function declaredJscpdBinTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  return isNonArrayRecord(value) && typeof value[JSCPD_BIN_NAME] === "string"
    ? value[JSCPD_BIN_NAME]
    : undefined;
}
