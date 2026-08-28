import type { FileInputFingerprint } from "../../project-files/file-fingerprint.ts";
import type { DuplicateCodeFragment } from "../measurement-model.ts";

export const SCAN_CACHE_VERSION = "quality-scan-cache-v3";

export type DuplicateScannerCacheConfiguration = Readonly<{
  backend: Readonly<{ kind: "package" } | { executable: string; kind: "custom" }>;
  minimumLines: number;
  minimumTokens: number;
  reportedPathMode: "absolute";
  reporter: "json";
  workerPolicy: "tool-default";
}>;

export type DuplicateCodeCacheIdentity = Readonly<{
  commitSha: string;
  configVersion: string;
  inputFingerprint: FileInputFingerprint;
  scannerConfiguration: DuplicateScannerCacheConfiguration;
  toolName: "jscpd";
  toolVersion: string;
}>;

export type DuplicateCodeCacheHit = Readonly<{
  cacheKey: string;
  cachePath: string;
  hit: true;
  metrics: readonly DuplicateCodeFragment[];
}>;

export type DuplicateCodeCacheMiss = Readonly<{
  cacheKey: string;
  cachePath: string;
  hit: false;
  reason: "cache-miss" | "cache-payload-invalid" | "cache-payload-mismatch";
}>;

export type ScanCachePayload = Readonly<{
  cacheKey: string;
  commitSha: string;
  configVersion: string;
  createdAt: string;
  inputFingerprint: FileInputFingerprint;
  metrics: unknown;
  scannerConfiguration: DuplicateScannerCacheConfiguration;
  scanCacheVersion: string;
  toolName: "jscpd";
  toolVersion: string;
}>;
