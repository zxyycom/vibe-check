import { createHash } from "node:crypto";
import { join } from "node:path";

import { isNonArrayRecord } from "../../../data-boundary/value-shapes.ts";
import { SCAN_CACHE_VERSION, type DuplicateCodeCacheIdentity } from "./cache-contract.ts";

export function buildScanCacheKey(identity: DuplicateCodeCacheIdentity): string {
  const keyInput = {
    scan_cache_version: SCAN_CACHE_VERSION,
    tool_name: identity.toolName,
    tool_version: identity.toolVersion,
    normalized_tool_args: [...identity.normalizedToolArgs],
    config_version: identity.configVersion,
    code_area: identity.codeArea,
    commit_sha: identity.commitSha,
    input_fingerprint: identity.inputFingerprint
  };

  return hashStable(keyInput);
}

export function getScanCachePath(rootDir: string, cacheKey: string): string {
  return join(getQualityCacheRoot(rootDir), `${cacheKey}.json`);
}

function getQualityCacheRoot(rootDir: string): string {
  return join(rootDir, SCAN_CACHE_VERSION);
}

function hashStable(value: unknown): string {
  return createHash("sha256").update(stableStringify(value)).digest("hex");
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (isNonArrayRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}
