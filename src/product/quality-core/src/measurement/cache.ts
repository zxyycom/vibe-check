/**
 * Quality measurement cache helpers.
 */

import { createHash } from "node:crypto";
import { join } from "node:path";

import { readJsonFile, writeJsonFile } from "../../../foundation/src/index.ts";
import type {
  BaselineSnapshot,
  DuplicateCodeFragment,
  ResolvedQualityConfig,
  ToolAvailability
} from "../model/schema.ts";
import type { ScannerDependencySnapshot } from "../../../scanner-dependencies.ts";
import {
  buildBaselineSnapshotCacheKey,
  buildScanCacheKey,
  getBaselineSnapshotCacheDir,
  getScanCachePath,
  stableStringify
} from "./cache/key.ts";
import {
  isBaselineSnapshot,
  isMatchingBaselineSnapshotManifest,
  isMatchingPayload,
  isMetricArray,
  stripDuplicateChangedScope
} from "./cache/payload.ts";
import {
  SCAN_CACHE_VERSION,
  type BaselineSnapshotCacheHit,
  type BaselineSnapshotCacheIdentity,
  type BaselineSnapshotCacheManifest,
  type BaselineSnapshotCacheMiss,
  type DuplicateCodeCacheHit,
  type DuplicateCodeCacheIdentity,
  type DuplicateCodeCacheMiss,
  type ScanCachePayload
} from "./cache/types.ts";

export {
  buildBaselineSnapshotCacheKey,
  buildScanCacheKey,
  getBaselineSnapshotCacheDir,
  getScanCachePath
} from "./cache/key.ts";
export { SCAN_CACHE_VERSION } from "./cache/types.ts";
export type {
  BaselineSnapshotCacheHit,
  BaselineSnapshotCacheIdentity,
  BaselineSnapshotCacheMiss,
  DuplicateCodeCacheHit,
  DuplicateCodeCacheIdentity,
  DuplicateCodeCacheMiss,
  ScanKind
} from "./cache/types.ts";

export function loadScanCacheEntry({
  rootDir,
  identity
}: {
  identity: DuplicateCodeCacheIdentity;
  rootDir: string;
}): DuplicateCodeCacheHit | DuplicateCodeCacheMiss {
  const cacheKey = buildScanCacheKey(identity);
  const cachePath = getScanCachePath(rootDir, cacheKey);

  let payload: unknown;
  try {
    payload = readJsonFile(cachePath);
  } catch {
    return { hit: false, reason: "cache-miss", cacheKey, cachePath };
  }

  if (!isMatchingPayload(payload, identity, cacheKey)) {
    return { hit: false, reason: "cache-payload-mismatch", cacheKey, cachePath };
  }

  if (!isMetricArray(payload.metrics)) {
    return { hit: false, reason: "cache-payload-invalid", cacheKey, cachePath };
  }

  return { hit: true, metrics: payload.metrics, cacheKey, cachePath };
}

export function writeScanCacheEntry({
  rootDir,
  identity,
  metrics
}: {
  identity: DuplicateCodeCacheIdentity;
  metrics: DuplicateCodeFragment[];
  rootDir: string;
}): { cacheKey: string; cachePath: string } {
  const cacheKey = buildScanCacheKey(identity);
  const cachePath = getScanCachePath(rootDir, cacheKey);
  const payload: ScanCachePayload = {
    scanCacheVersion: SCAN_CACHE_VERSION,
    cacheKey,
    scanKind: identity.scanKind,
    toolName: identity.toolName,
    toolVersion: identity.toolVersion,
    normalizedToolArgs: [...identity.normalizedToolArgs],
    configVersion: identity.configVersion,
    codeArea: identity.codeArea,
    commitSha: identity.commitSha,
    inputFingerprint: identity.inputFingerprint,
    metrics: stripDuplicateChangedScope(metrics),
    createdAt: new Date().toISOString()
  };

  writeJsonFile(cachePath, payload);
  return { cacheKey, cachePath };
}

export function createBaselineSnapshotCacheIdentity({
  config,
  dependencies,
  inputFingerprints,
  toolResults
}: {
  config: ResolvedQualityConfig;
  dependencies: ScannerDependencySnapshot;
  inputFingerprints: BaselineSnapshot["fingerprints"];
  toolResults: ToolAvailability[];
}): BaselineSnapshotCacheIdentity {
  const inputAreas = Object.keys(inputFingerprints).sort();

  return {
    backends: baselineBackendIdentities(dependencies, toolResults),
    inputFingerprints: Object.fromEntries(
      inputAreas.map((codeArea) => {
        const fingerprint = inputFingerprints[codeArea]!;
        return [codeArea, { ...fingerprint, fileList: [...fingerprint.fileList] }];
      })
    ),
    measurementSettings: {
      codeAreaWarningPolicies: Object.fromEntries(
        inputAreas.map((codeArea) => [
          codeArea,
          config.codeAreas[codeArea]?.warningPolicy ?? "moderate"
        ])
      ),
      duplicationMinimumTokens: Object.fromEntries(
        inputAreas
          .filter((codeArea) => inputFingerprints[codeArea]!.fileCount >= 2)
          .map((codeArea) => [
            codeArea,
            config.checks.duplication.minimumTokensByCodeArea[codeArea] ??
              config.checks.duplication.defaultMinimumTokens
          ])
      )
    }
  };
}

function baselineBackendIdentities(
  dependencies: ScannerDependencySnapshot,
  toolResults: ToolAvailability[]
): BaselineSnapshotCacheIdentity["backends"] {
  const backends: BaselineSnapshotCacheIdentity["backends"] = {};
  const fileVersion = baselineBackendVersion(toolResults, "scc");
  const functionVersion = baselineBackendVersion(toolResults, "lizard");
  const duplicationVersion = baselineBackendVersion(toolResults, "jscpd");

  if (fileVersion.present) {
    backends.file = {
      args: [...dependencies.file.args],
      executable: dependencies.file.executable,
      version: fileVersion.version
    };
  }
  if (functionVersion.present) {
    backends.function = {
      args: [...dependencies.function.args],
      executable: dependencies.function.executable,
      version: functionVersion.version
    };
  }
  if (duplicationVersion.present) {
    backends.duplication = {
      args: [...dependencies.duplication.args],
      executable: dependencies.duplication.executable,
      version: duplicationVersion.version
    };
  }

  return backends;
}

function baselineBackendVersion(
  toolResults: ToolAvailability[],
  name: "jscpd" | "lizard" | "scc"
): { present: false } | { present: true; version: string | null } {
  const result = toolResults.find((tool) => tool.name === name);
  if (!result) return { present: false };
  return {
    present: true,
    version: result.available ? result.version ?? "unknown" : null
  };
}

export function loadBaselineSnapshotCacheEntry({
  rootDir,
  identity
}: {
  identity: BaselineSnapshotCacheIdentity;
  rootDir: string;
}): BaselineSnapshotCacheHit | BaselineSnapshotCacheMiss {
  const cacheKey = buildBaselineSnapshotCacheKey(identity);
  const cacheDir = getBaselineSnapshotCacheDir(rootDir, cacheKey);
  const manifestPath = join(cacheDir, "manifest.json");
  const snapshotPath = join(cacheDir, "snapshot.json");

  let manifest: unknown;
  let snapshot: unknown;
  try {
    manifest = readJsonFile(manifestPath);
    snapshot = readJsonFile(snapshotPath);
  } catch {
    return { hit: false, reason: "cache-miss", cacheKey, cacheDir };
  }

  if (!isMatchingBaselineSnapshotManifest(manifest, identity, cacheKey)) {
    return { hit: false, reason: "cache-manifest-mismatch", cacheKey, cacheDir };
  }

  if (!isBaselineSnapshot(snapshot)) {
    return { hit: false, reason: "cache-snapshot-invalid", cacheKey, cacheDir };
  }

  if (manifest.snapshotHash !== hashBaselineSnapshot(snapshot)) {
    return { hit: false, reason: "cache-snapshot-hash-mismatch", cacheKey, cacheDir };
  }

  return { hit: true, snapshot, cacheKey, cacheDir };
}

export function writeBaselineSnapshotCacheEntry({
  rootDir,
  identity,
  snapshot
}: {
  identity: BaselineSnapshotCacheIdentity;
  rootDir: string;
  snapshot: BaselineSnapshot;
}): { cacheDir: string; cacheKey: string } {
  const cacheKey = buildBaselineSnapshotCacheKey(identity);
  const cacheDir = getBaselineSnapshotCacheDir(rootDir, cacheKey);
  const snapshotPath = join(cacheDir, "snapshot.json");
  const manifestPath = join(cacheDir, "manifest.json");
  const manifest: BaselineSnapshotCacheManifest = {
    scanCacheVersion: SCAN_CACHE_VERSION,
    cacheKey,
    identity,
    snapshotHash: hashBaselineSnapshot(snapshot),
    createdAt: new Date().toISOString()
  };

  writeJsonFile(snapshotPath, snapshot);
  writeJsonFile(manifestPath, manifest);
  return { cacheKey, cacheDir };
}

export function hashBaselineSnapshot(snapshot: BaselineSnapshot): string {
  return `sha256:${createHash("sha256").update(stableStringify(snapshot)).digest("hex")}`;
}
