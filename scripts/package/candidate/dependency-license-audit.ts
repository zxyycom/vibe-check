import { lstatSync, readFileSync, readdirSync, type Dirent, type Stats } from "node:fs";
import { join, resolve } from "node:path";

import { errorMessage } from "../../error-message.ts";
import { isPathWithin } from "../../repository-files/paths.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import { PACKAGE_NAME } from "../package-contract.ts";

const ACCEPTED_INSTALLED_DEPENDENCY_LICENSES: ReadonlySet<string> = new Set([
  "Apache-2.0",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "BlueOak-1.0.0",
  "ISC",
  "MIT"
]);

export interface InstalledDependencyLicenseAuditResult {
  readonly dependencyPackageCount: number;
  readonly licenseCounts: readonly InstalledDependencyLicenseCount[];
}

interface InstalledDependencyLicenseCount {
  readonly license: string;
  readonly packageCount: number;
}

interface InstalledPackageIdentity {
  readonly directory: string;
  readonly license: string;
  readonly name: string;
  readonly version: string;
}

/**
 * Audits every package physically present in the exact candidate's private install.
 *
 * This deliberately validates and summarizes the current installation rather than
 * creating a package artifact inventory: dependency ranges, transitive packages, and
 * platform optionals remain package-manager-owned installation facts.
 */
export function auditInstalledDependencyLicenses(input: {
  readonly candidatePackageDirectory: string;
  readonly consumerDirectory: string;
}): InstalledDependencyLicenseAuditResult {
  const nodeModulesDirectory = resolve(input.consumerDirectory, "node_modules");
  const candidatePackageDirectory = resolve(input.candidatePackageDirectory);
  assertOwnedDirectory(nodeModulesDirectory, "candidate consumer node_modules");
  if (!isPathWithin(nodeModulesDirectory, candidatePackageDirectory)) {
    throw new Error(
      `candidate package directory escapes private consumer node_modules: ${candidatePackageDirectory}`
    );
  }

  const installedPackages = collectInstalledPackages(nodeModulesDirectory);
  const candidate = installedPackages.find(
    (installedPackage) => installedPackage.directory === candidatePackageDirectory
  );
  if (candidate?.name !== PACKAGE_NAME) {
    throw new Error(
      `installed dependency license audit could not identify ${PACKAGE_NAME}: ${candidatePackageDirectory}`
    );
  }

  const licenseCounts = new Map<string, number>();
  for (const installedPackage of installedPackages) {
    if (installedPackage.directory === candidatePackageDirectory) continue;
    if (!ACCEPTED_INSTALLED_DEPENDENCY_LICENSES.has(installedPackage.license)) {
      throw new Error(
        `installed dependency license declaration is not accepted by policy ${installedPackage.name}@${installedPackage.version}: ${installedPackage.license}`
      );
    }
    licenseCounts.set(
      installedPackage.license,
      (licenseCounts.get(installedPackage.license) ?? 0) + 1
    );
  }

  return Object.freeze({
    dependencyPackageCount: installedPackages.length - 1,
    licenseCounts: Object.freeze(
      [...licenseCounts.entries()]
        .sort(([left], [right]) => compareText(left, right))
        .map(([license, packageCount]) => Object.freeze({ license, packageCount }))
    )
  });
}

function collectInstalledPackages(
  nodeModulesDirectory: string
): readonly InstalledPackageIdentity[] {
  const installedPackages: InstalledPackageIdentity[] = [];
  for (const entry of readDirectory(nodeModulesDirectory)) {
    if (entry.name.startsWith(".")) continue;
    const entryPath = join(nodeModulesDirectory, entry.name);
    if (entry.name.startsWith("@")) {
      installedPackages.push(...collectScopedPackages(entryPath, entry));
      continue;
    }
    if (entry.isSymbolicLink()) {
      throw new Error(
        `installed dependency ${entry.name} must be a non-symbolic-link directory: ${entryPath}`
      );
    }
    if (!entry.isDirectory()) continue;
    installedPackages.push(...collectPackage(entryPath, entry.name));
  }
  return Object.freeze(installedPackages);
}

function collectScopedPackages(
  scopeDirectory: string,
  scopeEntry: Dirent
): readonly InstalledPackageIdentity[] {
  assertPlainDirectory(scopeDirectory, scopeEntry, "installed dependency scope");
  const installedPackages: InstalledPackageIdentity[] = [];
  for (const packageEntry of readDirectory(scopeDirectory)) {
    if (packageEntry.name.startsWith(".")) continue;
    const packageDirectory = join(scopeDirectory, packageEntry.name);
    assertPlainDirectory(packageDirectory, packageEntry, "installed scoped dependency");
    installedPackages.push(
      ...collectPackage(packageDirectory, `${scopeEntry.name}/${packageEntry.name}`)
    );
  }
  return Object.freeze(installedPackages);
}

function collectPackage(
  packageDirectory: string,
  expectedName: string
): readonly InstalledPackageIdentity[] {
  assertOwnedDirectory(packageDirectory, `installed dependency ${expectedName}`);
  const manifestPath = join(packageDirectory, "package.json");
  const manifest = readPackageManifest(manifestPath, expectedName);
  const name = requiredManifestString(manifest.name, "name", manifestPath);
  const version = requiredManifestString(manifest.version, "version", manifestPath);
  if (name !== expectedName) {
    throw new Error(
      `installed dependency directory name does not match its manifest: ${expectedName} != ${name}`
    );
  }
  const license = dependencyLicenseDeclaration(manifest, name, version, manifestPath);
  const installedPackage = Object.freeze({
    directory: resolve(packageDirectory),
    license,
    name,
    version
  });

  const nestedNodeModules = join(packageDirectory, "node_modules");
  if (!hasOwnedDirectory(nestedNodeModules, `nested node_modules for ${name}@${version}`)) {
    return Object.freeze([installedPackage]);
  }
  return Object.freeze([installedPackage, ...collectInstalledPackages(nestedNodeModules)]);
}

function dependencyLicenseDeclaration(
  manifest: Readonly<Record<string, unknown>>,
  name: string,
  version: string,
  manifestPath: string
): string {
  if (manifest.license !== undefined) {
    if (
      typeof manifest.license === "string" &&
      manifest.license.length > 0 &&
      manifest.license.trim() === manifest.license
    ) {
      return manifest.license;
    }
    throw new Error(
      `installed dependency has an invalid license declaration: ${name}@${version} (${manifestPath})`
    );
  }

  if (manifest.licenses !== undefined) {
    return legacyDependencyLicenseDeclaration(manifest.licenses, name, version, manifestPath);
  }
  throw new Error(
    `installed dependency does not declare a license: ${name}@${version} (${manifestPath})`
  );
}

function legacyDependencyLicenseDeclaration(
  value: unknown,
  name: string,
  version: string,
  manifestPath: string
): string {
  if (!Array.isArray(value) || value.length === 0) {
    throw invalidLegacyLicenseDeclaration(name, version, manifestPath);
  }
  const types = new Set<string>();
  for (const entry of value) {
    if (
      !isNonArrayRecord(entry) ||
      typeof entry.type !== "string" ||
      entry.type.length === 0 ||
      entry.type.trim() !== entry.type
    ) {
      throw invalidLegacyLicenseDeclaration(name, version, manifestPath);
    }
    types.add(entry.type);
  }
  if (types.size !== 1) throw invalidLegacyLicenseDeclaration(name, version, manifestPath);
  const [license] = types;
  if (license === undefined) throw invalidLegacyLicenseDeclaration(name, version, manifestPath);
  return license;
}

function invalidLegacyLicenseDeclaration(
  name: string,
  version: string,
  manifestPath: string
): Error {
  return new Error(
    `installed dependency has an invalid legacy licenses declaration: ${name}@${version} (${manifestPath})`
  );
}

function readPackageManifest(
  manifestPath: string,
  expectedName: string
): Readonly<Record<string, unknown>> {
  let source: string;
  try {
    source = readFileSync(manifestPath, "utf8");
  } catch (error: unknown) {
    throw new Error(
      `could not read installed dependency manifest ${expectedName}: ${manifestPath}`,
      {
        cause: error
      }
    );
  }
  let manifest: unknown;
  try {
    manifest = JSON.parse(source);
  } catch (error: unknown) {
    throw new Error(
      `could not parse installed dependency manifest ${expectedName}: ${manifestPath}`,
      {
        cause: error
      }
    );
  }
  if (!isNonArrayRecord(manifest)) {
    throw new Error(`installed dependency manifest must be an object: ${manifestPath}`);
  }
  return manifest;
}

function requiredManifestString(value: unknown, field: string, manifestPath: string): string {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    throw new Error(`installed dependency manifest has an invalid ${field}: ${manifestPath}`);
  }
  return value;
}

function readDirectory(directory: string): readonly Dirent[] {
  try {
    return readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      compareText(left.name, right.name)
    );
  } catch (error: unknown) {
    throw new Error(
      `could not enumerate installed dependencies in ${directory}: ${errorMessage(error)}`,
      {
        cause: error
      }
    );
  }
}

function assertOwnedDirectory(directory: string, description: string): void {
  const entry = readOptionalPathEntry(directory, description);
  if (entry === undefined) {
    throw new Error(`could not inspect ${description}: ${directory} does not exist`);
  }
  assertPlainDirectory(directory, entry, description);
}

function hasOwnedDirectory(directory: string, description: string): boolean {
  const entry = readOptionalPathEntry(directory, description);
  if (entry === undefined) return false;
  assertPlainDirectory(directory, entry, description);
  return true;
}

function readOptionalPathEntry(directory: string, description: string): Stats | undefined {
  try {
    return lstatSync(directory, { throwIfNoEntry: false });
  } catch (error: unknown) {
    throw new Error(`could not inspect ${description}: ${directory}`, { cause: error });
  }
}

function assertPlainDirectory(directory: string, entry: Dirent | Stats, description: string): void {
  if (entry.isSymbolicLink() || !entry.isDirectory()) {
    throw new Error(`${description} must be a non-symbolic-link directory: ${directory}`);
  }
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
