import type {
  CodeAreaFingerprint,
  DuplicateCodeFragment
} from "../../configuration/metric-contract.ts";

export const SCAN_CACHE_VERSION = "quality-scan-cache-v1";

export type DuplicateCodeCacheIdentity = {
  codeArea: string;
  commitSha: string;
  configVersion: string;
  inputFingerprint: CodeAreaFingerprint;
  normalizedToolArgs: readonly string[];
  toolName: "jscpd";
  toolVersion: string;
};

export type DuplicateCodeCacheHit = {
  cacheKey: string;
  cachePath: string;
  hit: true;
  metrics: DuplicateCodeFragment[];
};

export type DuplicateCodeCacheMiss = {
  cacheKey: string;
  cachePath: string;
  hit: false;
  reason: string;
};

export type ScanCachePayload = {
  cacheKey: string;
  codeArea: string;
  commitSha: string;
  configVersion: string;
  createdAt: string;
  inputFingerprint: CodeAreaFingerprint;
  metrics: unknown;
  normalizedToolArgs: string[];
  scanCacheVersion: string;
  toolName: "jscpd";
  toolVersion: string;
};
