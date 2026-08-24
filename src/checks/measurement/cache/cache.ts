/**
 * Quality measurement cache helpers.
 */

import { readJsonFile, writeJsonFile } from "../../../foundation/fs.ts";
import type { DuplicateCodeFragment } from "../../configuration/metric-contract.ts";
import { buildScanCacheKey, getScanCachePath } from "./key.ts";
import { isMatchingPayload, isMetricArray } from "./payload.ts";
import {
  SCAN_CACHE_VERSION,
  type DuplicateCodeCacheHit,
  type DuplicateCodeCacheIdentity,
  type DuplicateCodeCacheMiss,
  type ScanCachePayload
} from "./cache-contract.ts";

export { buildScanCacheKey, getScanCachePath } from "./key.ts";
export { SCAN_CACHE_VERSION } from "./cache-contract.ts";
export type {
  DuplicateCodeCacheHit,
  DuplicateCodeCacheIdentity,
  DuplicateCodeCacheMiss
} from "./cache-contract.ts";

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
    toolName: identity.toolName,
    toolVersion: identity.toolVersion,
    normalizedToolArgs: [...identity.normalizedToolArgs],
    configVersion: identity.configVersion,
    codeArea: identity.codeArea,
    commitSha: identity.commitSha,
    inputFingerprint: identity.inputFingerprint,
    metrics,
    createdAt: new Date().toISOString()
  };

  writeJsonFile({ filePath: cachePath, value: payload });
  return { cacheKey, cachePath };
}
