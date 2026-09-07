import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { errorMessage } from "../../error-message.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import {
  PACKAGE_ENTRY_PATH,
  PACKAGE_LICENSE,
  PACKAGE_MANIFEST_FILES,
  PACKAGE_NAME,
  PACKAGE_TYPES_PATH
} from "../package-contract.ts";
import { sameOrderedStrings } from "../package-material-audit.ts";

export const RELEASE_MANIFEST_SOURCE_PATH = "scripts/package/artifact/release-manifest.json";
export const RELEASE_MANIFEST_VERSION_SENTINEL = "<candidate-version>";

const PACKAGE_MANIFEST_KEYS = Object.freeze([
  "dependencies",
  "description",
  "engines",
  "exports",
  "files",
  "keywords",
  "license",
  "name",
  "publishConfig",
  "repository",
  "type",
  "version"
]);
const PACKAGE_ROOT_EXPORT_KEYS = Object.freeze(["import", "types"]);

/** Reads the checked-in release manifest from the explicit repository root. */
export function readReleaseManifest(repositoryRoot: string): Readonly<Record<string, unknown>> {
  return parseCandidateManifest(
    readFileSync(join(repositoryRoot, RELEASE_MANIFEST_SOURCE_PATH)),
    "release manifest source"
  );
}

/** Reads one dependency requirement from the checked-in release manifest. */
export function readReleaseManifestDependency(repositoryRoot: string, packageName: string): string {
  const dependencies = readReleaseManifest(repositoryRoot).dependencies;
  if (!isNonArrayRecord(dependencies) || typeof dependencies[packageName] !== "string") {
    throw new Error(`release manifest does not declare required dependency ${packageName}`);
  }
  return dependencies[packageName];
}

/** Writes the only version projection accepted by staging and tar audits. */
export function writeCandidateManifest(input: {
  readonly manifestPath: string;
  readonly repositoryRoot: string;
  readonly version: string;
}): void {
  const manifest = projectCandidateManifest(input.repositoryRoot, input.version);
  writeFileSync(input.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

/** Audits an independently validated, closed candidate manifest projection. */
export function auditCandidateManifest(input: {
  readonly candidateVersion: string;
  readonly repositoryRoot: string;
  readonly source: Buffer | string;
}): void {
  const sourceManifest = readReleaseManifest(input.repositoryRoot);
  assertReleaseManifestSource(sourceManifest);
  const manifest = parseCandidateManifest(input.source, "candidate artifact manifest");
  assertManifestFields(manifest);
  assertManifestIdentity(manifest, input.candidateVersion);
  assertManifestDistributionMetadata(manifest);
  assertManifestDependencies(manifest.dependencies);
  assertManifestExports(manifest.exports);
  assertManifestFiles(manifest.files);
  if (
    JSON.stringify(manifest) !==
    JSON.stringify(projectCandidateManifest(input.repositoryRoot, input.candidateVersion))
  ) {
    throw new Error(
      "candidate artifact manifest is not the exact release-manifest version projection"
    );
  }
}

function projectCandidateManifest(
  repositoryRoot: string,
  version: string
): Readonly<Record<string, unknown>> {
  const source = readReleaseManifest(repositoryRoot);
  assertReleaseManifestSource(source);
  return Object.freeze({ ...source, version });
}

function parseCandidateManifest(
  source: Buffer | string,
  description: string
): Readonly<Record<string, unknown>> {
  let manifest: unknown;
  try {
    manifest = JSON.parse(typeof source === "string" ? source : source.toString("utf8"));
  } catch (error: unknown) {
    throw new Error(`${description} is invalid JSON: ${errorMessage(error)}`, { cause: error });
  }
  if (!isNonArrayRecord(manifest)) throw new Error(`${description} must be an object`);
  return manifest;
}

/** Validates the static owner directly before it may be projected into a candidate. */
function assertReleaseManifestSource(manifest: Readonly<Record<string, unknown>>): void {
  assertManifestFields(manifest);
  if (manifest.version !== RELEASE_MANIFEST_VERSION_SENTINEL) {
    throw new Error("release manifest must retain its candidate-version sentinel");
  }
  assertManifestIdentity(manifest, RELEASE_MANIFEST_VERSION_SENTINEL);
  assertManifestDistributionMetadata(manifest);
  assertManifestDependencies(manifest.dependencies);
  assertManifestExports(manifest.exports);
  assertManifestFiles(manifest.files);
}

function assertManifestFields(manifest: Readonly<Record<string, unknown>>): void {
  if (!sameOrderedStrings(Object.keys(manifest).sort(), PACKAGE_MANIFEST_KEYS))
    throw new Error("candidate artifact manifest fields do not match the public package contract");
}
function assertManifestIdentity(
  manifest: Readonly<Record<string, unknown>>,
  version: string
): void {
  if (
    manifest.name !== PACKAGE_NAME ||
    manifest.version !== version ||
    manifest.type !== "module" ||
    manifest.license !== PACKAGE_LICENSE
  )
    throw new Error("candidate artifact manifest identity does not match the prepared candidate");
}
function assertManifestDistributionMetadata(manifest: Readonly<Record<string, unknown>>): void {
  if (
    typeof manifest.description !== "string" ||
    manifest.description.length === 0 ||
    !Array.isArray(manifest.keywords) ||
    manifest.keywords.length === 0 ||
    !manifest.keywords.every((keyword) => typeof keyword === "string" && keyword.length > 0)
  )
    throw new Error("candidate artifact manifest must declare nonempty public discovery metadata");
  if (!hasExactRecord(manifest.engines, { node: ">=24.18" }))
    throw new Error("candidate artifact manifest must declare only the verified Node host range");
  if (
    !hasExactRecord(manifest.repository, {
      type: "git",
      url: "git+https://github.com/zxyycom/vibe-check.git"
    })
  )
    throw new Error("candidate artifact repository metadata does not match its canonical owner");
  if (
    !hasExactRecord(manifest.publishConfig, {
      access: "public",
      registry: "https://registry.npmjs.org/"
    })
  )
    throw new Error("candidate artifact publish configuration is not the approved public target");
}
function assertManifestDependencies(value: unknown): void {
  if (
    !isNonArrayRecord(value) ||
    Object.keys(value).length === 0 ||
    !Object.entries(value).every(
      ([name, requirement]) =>
        isPackageDependencyName(name) && typeof requirement === "string" && requirement.length > 0
    )
  )
    throw new Error(
      "candidate artifact production dependencies are not a closed valid package dependency map"
    );
}
function isPackageDependencyName(name: string): boolean {
  return /^(?:@[-a-z0-9~][a-z0-9~._-]*\/)?[a-z0-9~][a-z0-9~._-]*$/u.test(name);
}
function assertManifestExports(value: unknown): void {
  if (!hasPublicExports(value))
    throw new Error(
      "candidate artifact must expose only its approved import and declarations entries"
    );
}
function assertManifestFiles(value: unknown): void {
  if (
    !Array.isArray(value) ||
    !value.every((file) => typeof file === "string") ||
    !sameOrderedStrings(value, PACKAGE_MANIFEST_FILES)
  )
    throw new Error("candidate artifact manifest files do not match the package allowlist");
}
function hasPublicExports(value: unknown): boolean {
  if (!isNonArrayRecord(value) || Object.keys(value).length !== 1 || !isNonArrayRecord(value["."]))
    return false;
  const root = value["."];
  return (
    sameOrderedStrings(Object.keys(root).sort(), PACKAGE_ROOT_EXPORT_KEYS) &&
    root.import === `./${PACKAGE_ENTRY_PATH}` &&
    root.types === `./${PACKAGE_TYPES_PATH}`
  );
}
function hasExactRecord(value: unknown, expected: Readonly<Record<string, string>>): boolean {
  if (!isNonArrayRecord(value)) return false;
  const keys = Object.keys(expected).sort();
  return (
    sameOrderedStrings(Object.keys(value).sort(), keys) &&
    keys.every((key) => value[key] === expected[key])
  );
}
