import { resolve } from "node:path";

import {
  fingerprintProjectFiles,
  type FileInputFingerprint
} from "../../project-files/file-fingerprint.ts";
import type { DuplicateDetectionExactInputSet } from "../measurement-model.ts";
import { getGitSha } from "../project-revision.ts";
import type { ResolvedDuplicateDetectionScannerOptions } from "../options.ts";
import { isPackageJscpdCommand } from "../jscpd/command-resolution.ts";
import type {
  DuplicateCodeCacheIdentity,
  DuplicateScannerCacheConfiguration
} from "./cache-contract.ts";

const RAW_SCAN_CONFIGURATION_VERSION = "4";

interface DuplicateScanCacheIdentityInput {
  readonly dependency: ResolvedDuplicateDetectionScannerOptions;
  readonly commitSha: string;
  readonly inputFingerprint: FileInputFingerprint;
  readonly minimumLines: number;
  readonly minimumTokens: number;
  readonly toolVersion: string;
}

export interface PreparedDuplicateScanCache {
  readonly cacheRootDir: string;
  readonly identity: DuplicateCodeCacheIdentity;
}

export function prepareDuplicateScanCache(
  input: Omit<DuplicateScanCacheIdentityInput, "commitSha" | "inputFingerprint"> & {
    readonly directory: string;
    readonly exactInput: DuplicateDetectionExactInputSet;
  }
): PreparedDuplicateScanCache {
  const { rootDir, approvedExactPaths } = input.exactInput;
  const inputFingerprint = fingerprintProjectFiles(rootDir, approvedExactPaths);
  const cacheRootDir = resolve(rootDir, input.directory);
  const identity = createDuplicateScanCacheIdentity({
    ...input,
    commitSha: getGitSha(rootDir),
    inputFingerprint
  });
  return Object.freeze({ cacheRootDir, identity });
}

export function createDuplicateScanCacheIdentity(
  input: DuplicateScanCacheIdentityInput
): DuplicateCodeCacheIdentity {
  return Object.freeze({
    toolName: "jscpd",
    toolVersion: input.toolVersion,
    scannerConfiguration: jscpdCacheConfiguration({
      dependency: input.dependency,
      minimumLines: input.minimumLines,
      minimumTokens: input.minimumTokens
    }),
    configVersion: RAW_SCAN_CONFIGURATION_VERSION,
    commitSha: input.commitSha,
    inputFingerprint: {
      fileCount: input.inputFingerprint.fileCount,
      fileList: [...input.inputFingerprint.fileList],
      fingerprint: input.inputFingerprint.fingerprint
    }
  });
}

export function jscpdCacheConfiguration(input: {
  readonly dependency: ResolvedDuplicateDetectionScannerOptions;
  readonly minimumLines: number;
  readonly minimumTokens: number;
}): DuplicateScannerCacheConfiguration {
  const backend: DuplicateScannerCacheConfiguration["backend"] = isPackageJscpdCommand(
    input.dependency.command
  )
    ? Object.freeze({ kind: "package" })
    : Object.freeze({
        executable: input.dependency.command.executable,
        kind: "custom"
      });
  return Object.freeze({
    backend,
    minimumLines: input.minimumLines,
    minimumTokens: input.minimumTokens,
    reportedPathMode: "absolute",
    reporter: "json",
    workerPolicy: "tool-default"
  });
}
