import { isAbsolute } from "node:path";

import { isNonArrayRecord, isStringArray } from "../../value-guards.ts";
import {
  CANDIDATE_NAME,
  MOMOA_LICENSE_SHA256,
  PACKAGE_BUN_ENGINE,
  PACKAGE_LICENSE,
  PACKAGE_LICENSE_PATH,
  PACKAGE_LICENSE_SHA256,
  PACKAGE_MOMOA_LICENSE_PATH,
  PACKAGE_PUBLISH_ACCESS,
  PACKAGE_PUBLISH_REGISTRY,
  PACKAGE_README_PATH,
  PACKAGE_REPOSITORY_MANIFEST_URL
} from "../package-contract.ts";
import { isSha256Digest, isSha512Integrity } from "../pack.ts";
import { isFullGitCommit, parseFormalReleaseVersion, parseReleaseTag } from "./identity.ts";

const FORMAL_RELEASE_RECEIPT_SCHEMA_VERSION = 1 as const;

export interface FormalReleaseReceipt {
  readonly schemaVersion: typeof FORMAL_RELEASE_RECEIPT_SCHEMA_VERSION;
  readonly package: Readonly<{
    readonly name: typeof CANDIDATE_NAME;
    readonly tag: string;
    readonly version: string;
  }>;
  readonly source: Readonly<{
    readonly commit: string;
    readonly inputFingerprint: string;
  }>;
  readonly artifact: Readonly<{
    readonly files: readonly string[];
    readonly integrity: string;
    readonly path: string;
    readonly sha256: string;
  }>;
  readonly staging: Readonly<{ readonly path: string }>;
  readonly contract: Readonly<{
    readonly bunEngine: typeof PACKAGE_BUN_ENGINE;
    readonly license: typeof PACKAGE_LICENSE;
    readonly ownLicense: Readonly<{
      readonly path: typeof PACKAGE_LICENSE_PATH;
      readonly sha256: typeof PACKAGE_LICENSE_SHA256;
    }>;
    readonly publish: Readonly<{
      readonly access: typeof PACKAGE_PUBLISH_ACCESS;
      readonly registry: typeof PACKAGE_PUBLISH_REGISTRY;
    }>;
    readonly readme: Readonly<{
      readonly path: typeof PACKAGE_README_PATH;
      readonly sha256: string;
    }>;
    readonly repository: typeof PACKAGE_REPOSITORY_MANIFEST_URL;
    readonly thirdPartyLicenses: readonly [
      Readonly<{
        readonly path: typeof PACKAGE_MOMOA_LICENSE_PATH;
        readonly sha256: typeof MOMOA_LICENSE_SHA256;
      }>
    ];
  }>;
}

/** Closed-parses receipt JSON without trusting any referenced filesystem material. */
export function parseFormalReleaseReceipt(value: unknown): FormalReleaseReceipt {
  assertReceiptEnvelope(value);
  return Object.freeze({
    schemaVersion: FORMAL_RELEASE_RECEIPT_SCHEMA_VERSION,
    package: parsePackageIdentity(value.package),
    source: parseSourceIdentity(value.source),
    artifact: parseArtifactIdentity(value.artifact),
    staging: parseStagingIdentity(value.staging),
    contract: parseReleaseContract(value.contract)
  });
}

function assertReceiptEnvelope(value: unknown): asserts value is Readonly<Record<string, unknown>> {
  if (
    !isNonArrayRecord(value) ||
    !hasExactKeys(value, ["artifact", "contract", "package", "schemaVersion", "source", "staging"])
  ) {
    throw new TypeError("formal release receipt has an invalid top-level shape");
  }
  if (value.schemaVersion !== FORMAL_RELEASE_RECEIPT_SCHEMA_VERSION) {
    throw new TypeError("formal release receipt schema version is unsupported");
  }
}

function parsePackageIdentity(value: unknown): FormalReleaseReceipt["package"] {
  if (!isNonArrayRecord(value) || !hasExactKeys(value, ["name", "tag", "version"])) {
    throw new TypeError("formal release receipt package identity is invalid");
  }
  if (value.name !== CANDIDATE_NAME) {
    throw new TypeError("formal release receipt package name is invalid");
  }
  return Object.freeze({
    name: CANDIDATE_NAME,
    tag: parseReleaseTag(value.tag),
    version: parseFormalReleaseVersion(value.version)
  });
}

function parseSourceIdentity(value: unknown): FormalReleaseReceipt["source"] {
  if (
    !isNonArrayRecord(value) ||
    !hasExactKeys(value, ["commit", "inputFingerprint"]) ||
    !isFullGitCommit(value.commit) ||
    !isSha256Digest(value.inputFingerprint)
  ) {
    throw new TypeError("formal release receipt source identity is invalid");
  }
  return Object.freeze({ commit: value.commit, inputFingerprint: value.inputFingerprint });
}

function parseArtifactIdentity(value: unknown): FormalReleaseReceipt["artifact"] {
  if (
    !isNonArrayRecord(value) ||
    !hasExactKeys(value, ["files", "integrity", "path", "sha256"]) ||
    !isFormalReleasePortablePath(value.path) ||
    !isSha256Digest(value.sha256) ||
    !isSha512Integrity(value.integrity) ||
    !isClosedFileInventory(value.files)
  ) {
    throw new TypeError("formal release receipt artifact identity is invalid");
  }
  return Object.freeze({
    files: Object.freeze([...value.files]),
    integrity: value.integrity,
    path: value.path,
    sha256: value.sha256
  });
}

function parseStagingIdentity(value: unknown): FormalReleaseReceipt["staging"] {
  if (
    !isNonArrayRecord(value) ||
    !hasExactKeys(value, ["path"]) ||
    !isFormalReleasePortablePath(value.path)
  ) {
    throw new TypeError("formal release receipt staging identity is invalid");
  }
  return Object.freeze({ path: value.path });
}

function parseReleaseContract(value: unknown): FormalReleaseReceipt["contract"] {
  assertReleaseContract(value);
  return Object.freeze({
    bunEngine: PACKAGE_BUN_ENGINE,
    license: PACKAGE_LICENSE,
    ownLicense: Object.freeze({ path: PACKAGE_LICENSE_PATH, sha256: PACKAGE_LICENSE_SHA256 }),
    publish: Object.freeze({
      access: PACKAGE_PUBLISH_ACCESS,
      registry: PACKAGE_PUBLISH_REGISTRY
    }),
    readme: Object.freeze({ path: PACKAGE_README_PATH, sha256: value.readme.sha256 }),
    repository: PACKAGE_REPOSITORY_MANIFEST_URL,
    thirdPartyLicenses: Object.freeze([
      Object.freeze({ path: PACKAGE_MOMOA_LICENSE_PATH, sha256: MOMOA_LICENSE_SHA256 })
    ] as const)
  });
}

function assertReleaseContract(value: unknown): asserts value is Readonly<
  Record<string, unknown>
> & {
  readonly readme: Readonly<{ readonly sha256: string }>;
} {
  if (
    !isNonArrayRecord(value) ||
    !hasExactKeys(value, [
      "bunEngine",
      "license",
      "ownLicense",
      "publish",
      "readme",
      "repository",
      "thirdPartyLicenses"
    ]) ||
    value.bunEngine !== PACKAGE_BUN_ENGINE ||
    value.license !== PACKAGE_LICENSE ||
    value.repository !== PACKAGE_REPOSITORY_MANIFEST_URL ||
    !hasExactStringRecord(value.ownLicense, {
      path: PACKAGE_LICENSE_PATH,
      sha256: PACKAGE_LICENSE_SHA256
    }) ||
    !hasExactStringRecord(value.publish, {
      access: PACKAGE_PUBLISH_ACCESS,
      registry: PACKAGE_PUBLISH_REGISTRY
    }) ||
    !isReadmeIdentity(value.readme) ||
    !isThirdPartyLicenseIdentity(value.thirdPartyLicenses)
  ) {
    throw new TypeError("formal release receipt package contract is invalid");
  }
}

function isReadmeIdentity(value: unknown): value is Readonly<{ readonly sha256: string }> {
  return (
    isNonArrayRecord(value) &&
    hasExactKeys(value, ["path", "sha256"]) &&
    value.path === PACKAGE_README_PATH &&
    isSha256Digest(value.sha256)
  );
}

function isThirdPartyLicenseIdentity(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length === 1 &&
    hasExactStringRecord(value[0], {
      path: PACKAGE_MOMOA_LICENSE_PATH,
      sha256: MOMOA_LICENSE_SHA256
    })
  );
}

function hasExactStringRecord(value: unknown, expected: Readonly<Record<string, string>>): boolean {
  if (!isNonArrayRecord(value) || !hasExactKeys(value, Object.keys(expected))) return false;
  return Object.entries(expected).every(([key, expectedValue]) => value[key] === expectedValue);
}

function isClosedFileInventory(value: unknown): value is readonly string[] {
  if (
    !isStringArray(value) ||
    value.length === 0 ||
    value.some((path) => !path.startsWith("package/") || !isFormalReleasePortablePath(path)) ||
    new Set(value).size !== value.length
  ) {
    return false;
  }
  const sorted = [...value].sort((left, right) => left.localeCompare(right));
  return value.every((path, index) => path === sorted[index]);
}

/** Owns the repository-relative slash-normalized path grammar used by release receipts. */
export function isFormalReleasePortablePath(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    isAbsolute(value) ||
    value.includes("\\")
  ) {
    return false;
  }
  return value.split("/").every((part) => part.length > 0 && part !== "." && part !== "..");
}

function hasExactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}
