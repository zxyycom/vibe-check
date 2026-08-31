import type { DuplicateDetectionExactInputSet } from "../measurement-model.ts";
import type { ResolvedDuplicateDetectionScannerOptions } from "../options.ts";
import { isPackageJscpdCommand } from "../jscpd/command-resolution.ts";
import type {
  DuplicateCodeCacheIdentity,
  DuplicateScannerCacheConfiguration
} from "./cache-contract.ts";

const RAW_SCAN_CONFIGURATION_VERSION = "4";

interface DuplicateScanCacheIdentityInput {
  readonly dependency: ResolvedDuplicateDetectionScannerOptions;
  readonly exactInput: DuplicateDetectionExactInputSet;
  readonly minimumLines: number;
  readonly minimumTokens: number;
  readonly toolVersion: string;
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
    commitSha: input.exactInput.commitSha,
    inputFingerprint: {
      fileCount: input.exactInput.inputFingerprint.fileCount,
      fileList: [...input.exactInput.inputFingerprint.fileList],
      fingerprint: input.exactInput.inputFingerprint.fingerprint
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
