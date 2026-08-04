import type {
  BaselineSnapshot,
  CodeAreaFingerprint,
  CodeAreaWarningPolicy,
  DuplicateCodeFragment
} from "../../model/schema.ts";

export const SCAN_CACHE_VERSION = "quality-scan-cache-v1";
export const BASELINE_SNAPSHOT_CACHE_KIND = "baseline-snapshot";

export type ScanKind = "baseline" | "current";

export type DuplicateCodeCacheIdentity = {
  codeArea: string;
  commitSha: string;
  configVersion: string;
  inputFingerprint: CodeAreaFingerprint;
  normalizedToolArgs: readonly string[];
  scanKind: ScanKind;
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
  scanKind: ScanKind;
  toolName: "jscpd";
  toolVersion: string;
};

export type BaselineBackendIdentity = {
  args: string[];
  executable: string;
  version: string | null;
};

export type BaselineSnapshotCacheIdentity = {
  backends: Partial<Record<"duplication" | "file" | "function", BaselineBackendIdentity>>;
  inputFingerprints: Record<string, CodeAreaFingerprint>;
  measurementSettings: {
    codeAreaWarningPolicies: Record<string, CodeAreaWarningPolicy>;
    duplicationMinimumTokens: Record<string, number>;
  };
};

export type BaselineSnapshotCacheHit = {
  cacheDir: string;
  cacheKey: string;
  hit: true;
  snapshot: BaselineSnapshot;
};

export type BaselineSnapshotCacheMiss = {
  cacheDir: string;
  cacheKey: string;
  hit: false;
  reason: string;
};

export type BaselineSnapshotCacheManifest = {
  cacheKey: string;
  createdAt: string;
  identity: BaselineSnapshotCacheIdentity;
  scanCacheVersion: string;
  snapshotHash: string;
};
