import { statSync } from "node:fs";
import { isAbsolute } from "node:path";

import { isPathWithin } from "../../repository-files/paths.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import { fileMatchesSha256, isSha256Digest } from "../pack.ts";

export const EXTERNAL_CONSUMER_MATERIAL_DATA_VERSION = 1 as const;
export const EXTERNAL_CONSUMER_ARTIFACT_PATH_ENV = "VIBE_CHECK_EXTERNAL_CONSUMER_ARTIFACT_PATH";
export const EXTERNAL_CONSUMER_ARTIFACT_SHA256_ENV = "VIBE_CHECK_EXTERNAL_CONSUMER_ARTIFACT_SHA256";
export const EXTERNAL_CONSUMER_ROOT_ENV = "VIBE_CHECK_EXTERNAL_CONSUMER_ROOT";
export const EXTERNAL_CONSUMER_INSTALLED_PACKAGE_ENV =
  "VIBE_CHECK_EXTERNAL_CONSUMER_INSTALLED_PACKAGE";
export const EXTERNAL_CONSUMER_RESOLVED_ENTRY_ENV = "VIBE_CHECK_EXTERNAL_CONSUMER_RESOLVED_ENTRY";

const EXTERNAL_CONSUMER_MATERIAL_KEYS = [
  "artifactPath",
  "consumerDirectory",
  "installedPackageDirectory",
  "resolvedEntryPath",
  "schemaVersion",
  "sha256"
] as const;

/** Closed, invocation-local material prepared once for external consumer acceptance. */
export interface ExternalConsumerMaterialData {
  readonly artifactPath: string;
  readonly consumerDirectory: string;
  readonly installedPackageDirectory: string;
  readonly resolvedEntryPath: string;
  readonly schemaVersion: typeof EXTERNAL_CONSUMER_MATERIAL_DATA_VERSION;
  readonly sha256: string;
}

/** Rejects malformed typed provider data before a consumer Check uses filesystem paths. */
export function parseExternalConsumerMaterialData(value: unknown): ExternalConsumerMaterialData {
  if (!isNonArrayRecord(value) || !exactKeys(value, EXTERNAL_CONSUMER_MATERIAL_KEYS)) {
    throw new TypeError("external consumer material has an invalid shape");
  }
  if (
    value.schemaVersion !== EXTERNAL_CONSUMER_MATERIAL_DATA_VERSION ||
    !nonEmptyString(value.artifactPath) ||
    !nonEmptyString(value.consumerDirectory) ||
    !nonEmptyString(value.installedPackageDirectory) ||
    !nonEmptyString(value.resolvedEntryPath) ||
    !isSha256Digest(value.sha256)
  ) {
    throw new TypeError("external consumer material has an invalid shape");
  }
  if (
    !isAbsolute(value.artifactPath) ||
    !isAbsolute(value.consumerDirectory) ||
    !isAbsolute(value.installedPackageDirectory) ||
    !isAbsolute(value.resolvedEntryPath) ||
    !isPathWithin(value.consumerDirectory, value.installedPackageDirectory) ||
    !isPathWithin(value.installedPackageDirectory, value.resolvedEntryPath)
  ) {
    throw new TypeError("external consumer material has an invalid identity");
  }
  return Object.freeze({
    artifactPath: value.artifactPath,
    consumerDirectory: value.consumerDirectory,
    installedPackageDirectory: value.installedPackageDirectory,
    resolvedEntryPath: value.resolvedEntryPath,
    schemaVersion: EXTERNAL_CONSUMER_MATERIAL_DATA_VERSION,
    sha256: value.sha256
  });
}

/** Rechecks invocation-local filesystem material immediately before it is consumed. */
export function validateExternalConsumerMaterialPhysical(data: ExternalConsumerMaterialData): void {
  if (
    !pathIsDirectory(data.consumerDirectory) ||
    !pathIsDirectory(data.installedPackageDirectory) ||
    !pathIsFile(data.resolvedEntryPath) ||
    !fileMatchesSha256(data.artifactPath, data.sha256)
  ) {
    throw new TypeError("external consumer material no longer matches its typed identity");
  }
}

/** Reads the exact provider environment or lets direct test execution create local material. */
export function readGateExternalConsumerMaterial(
  environment: NodeJS.ProcessEnv = process.env
): ExternalConsumerMaterialData | undefined {
  const values = {
    artifactPath: environment[EXTERNAL_CONSUMER_ARTIFACT_PATH_ENV],
    consumerDirectory: environment[EXTERNAL_CONSUMER_ROOT_ENV],
    installedPackageDirectory: environment[EXTERNAL_CONSUMER_INSTALLED_PACKAGE_ENV],
    resolvedEntryPath: environment[EXTERNAL_CONSUMER_RESOLVED_ENTRY_ENV],
    sha256: environment[EXTERNAL_CONSUMER_ARTIFACT_SHA256_ENV]
  };
  if (Object.values(values).every((value) => value === undefined)) return undefined;
  const data = parseExternalConsumerMaterialData({
    ...values,
    schemaVersion: EXTERNAL_CONSUMER_MATERIAL_DATA_VERSION
  });
  validateExternalConsumerMaterialPhysical(data);
  return data;
}

function exactKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function pathIsDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function pathIsFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}
