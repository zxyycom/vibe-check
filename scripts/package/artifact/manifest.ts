import { writeFileSync } from "node:fs";

import { errorMessage } from "../../error-message.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import {
  CANDIDATE_DEPENDENCIES,
  CANDIDATE_NAME,
  PACKAGE_BUN_ENGINE,
  PACKAGE_ENTRY_PATH,
  PACKAGE_LICENSE,
  PACKAGE_MANIFEST_FILES,
  PACKAGE_PUBLISH_ACCESS,
  PACKAGE_PUBLISH_REGISTRY,
  PACKAGE_REPOSITORY_MANIFEST_URL,
  PACKAGE_TYPES_PATH
} from "../package-contract.ts";
import { sameOrderedStrings } from "../package-material-audit.ts";

const PACKAGE_MANIFEST_KEYS = Object.freeze([
  "dependencies",
  "engines",
  "exports",
  "files",
  "license",
  "name",
  "publishConfig",
  "repository",
  "type",
  "version"
]);
const PACKAGE_ROOT_EXPORT_KEYS = Object.freeze(["import", "types"]);

/** Writes the only package manifest projection accepted by staging and tar audits. */
export function writeCandidateManifest(input: {
  readonly manifestPath: string;
  readonly version: string;
}): void {
  const manifest = {
    name: CANDIDATE_NAME,
    version: input.version,
    type: "module",
    license: PACKAGE_LICENSE,
    engines: { bun: PACKAGE_BUN_ENGINE },
    repository: { type: "git", url: PACKAGE_REPOSITORY_MANIFEST_URL },
    publishConfig: { access: PACKAGE_PUBLISH_ACCESS, registry: PACKAGE_PUBLISH_REGISTRY },
    exports: {
      ".": {
        types: `./${PACKAGE_TYPES_PATH}`,
        import: `./${PACKAGE_ENTRY_PATH}`
      }
    },
    files: PACKAGE_MANIFEST_FILES,
    dependencies: CANDIDATE_DEPENDENCIES
  };
  writeFileSync(input.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

/** Audits the closed public manifest shared by local candidates and formal releases. */
export function auditCandidateManifest(source: Buffer | string, candidateVersion: string): void {
  const manifest = parseCandidateManifest(source);
  assertManifestFields(manifest);
  assertManifestIdentity(manifest, candidateVersion);
  assertManifestDistributionMetadata(manifest);
  assertManifestDependencies(manifest.dependencies);
  assertManifestExports(manifest.exports);
  assertManifestFiles(manifest.files);
}

function parseCandidateManifest(source: Buffer | string): Readonly<Record<string, unknown>> {
  let manifest: unknown;
  try {
    manifest = JSON.parse(typeof source === "string" ? source : source.toString("utf8"));
  } catch (error: unknown) {
    throw new Error(`candidate artifact manifest is invalid JSON: ${errorMessage(error)}`, {
      cause: error
    });
  }
  if (!isNonArrayRecord(manifest)) throw new Error("candidate artifact manifest must be an object");
  return manifest;
}

function assertManifestFields(manifest: Readonly<Record<string, unknown>>): void {
  if (!sameOrderedStrings(Object.keys(manifest).sort(), PACKAGE_MANIFEST_KEYS)) {
    throw new Error("candidate artifact manifest fields do not match the public package contract");
  }
}

function assertManifestIdentity(
  manifest: Readonly<Record<string, unknown>>,
  candidateVersion: string
): void {
  if (
    manifest.name !== CANDIDATE_NAME ||
    manifest.version !== candidateVersion ||
    manifest.type !== "module" ||
    manifest.license !== PACKAGE_LICENSE
  ) {
    throw new Error("candidate artifact manifest identity does not match the prepared candidate");
  }
}

function assertManifestDistributionMetadata(manifest: Readonly<Record<string, unknown>>): void {
  if (!hasExactRecord(manifest.engines, { bun: PACKAGE_BUN_ENGINE })) {
    throw new Error("candidate artifact manifest must declare only the verified Bun host range");
  }
  if (
    !hasExactRecord(manifest.repository, {
      type: "git",
      url: PACKAGE_REPOSITORY_MANIFEST_URL
    })
  ) {
    throw new Error("candidate artifact repository metadata does not match its canonical owner");
  }
  if (
    !hasExactRecord(manifest.publishConfig, {
      access: PACKAGE_PUBLISH_ACCESS,
      registry: PACKAGE_PUBLISH_REGISTRY
    })
  ) {
    throw new Error("candidate artifact publish configuration is not the approved public target");
  }
}

function assertManifestDependencies(value: unknown): void {
  if (!sameDependencies(value)) {
    throw new Error(
      "candidate artifact production dependencies do not match the candidate dependency contract"
    );
  }
}

function assertManifestExports(value: unknown): void {
  if (!hasPublicExports(value)) {
    throw new Error(
      "candidate artifact must expose only its approved import and declarations entries"
    );
  }
}

function assertManifestFiles(value: unknown): void {
  if (
    !Array.isArray(value) ||
    !value.every((file) => typeof file === "string") ||
    !sameOrderedStrings(value, PACKAGE_MANIFEST_FILES)
  ) {
    throw new Error("candidate artifact manifest files do not match the package allowlist");
  }
}

function sameDependencies(value: unknown): boolean {
  if (!isNonArrayRecord(value)) return false;
  const dependencies = Object.entries(CANDIDATE_DEPENDENCIES);
  const dependencyNames = dependencies.map(([name]) => name).sort();
  return (
    sameOrderedStrings(Object.keys(value).sort(), dependencyNames) &&
    dependencies.every(([key, version]) => value[key] === version)
  );
}

function hasPublicExports(value: unknown): boolean {
  if (
    !isNonArrayRecord(value) ||
    Object.keys(value).length !== 1 ||
    !isNonArrayRecord(value["."])
  ) {
    return false;
  }
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
