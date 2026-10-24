import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runProcessSync, type ProcessResult } from "../process-execution/execution.ts";
import { writeCandidateManifest } from "./artifact/manifest.ts";

/** Uses Bun's standard cache unless a caller explicitly supplies an isolated cache. */
export interface PackageInstallationCache {
  readonly cacheDirectory?: string;
}

const installationFlags = ["--no-save", "--ignore-scripts", "--backend=copyfile"] as const;

/** Installs only the exact local tarball and cached dependencies, never retrying online. */
export function installOfflinePackage(
  input: PackageInstallationCache & {
    readonly artifactPath: string;
    readonly consumerDirectory: string;
    readonly observeResult?: (result: ProcessResult) => void;
  }
): void {
  const result = runInstallation({
    args: ["--offline", input.artifactPath],
    consumerDirectory: input.consumerDirectory,
    cacheDirectory: input.cacheDirectory
  });
  input.observeResult?.(result);
  assertInstallationSucceeded(result, "strict offline package installation", true);
}

/** Explicit online preparation, independent of candidate build/install and its receipt. */
export function preparePackageInstallationCache(
  input: PackageInstallationCache & {
    readonly repositoryRoot: string;
  }
): void {
  const consumerDirectory = mkdtempSync(join(tmpdir(), "vibe-check-package-cache-prepare-"));
  try {
    // The release manifest owns runtime dependencies; no second list or candidate bootstrap.
    writeCandidateManifest({
      manifestPath: join(consumerDirectory, "package.json"),
      repositoryRoot: input.repositoryRoot,
      version: "0.0.0-cache-prepare"
    });
    const result = runInstallation({
      args: ["--production"],
      consumerDirectory,
      cacheDirectory: input.cacheDirectory
    });
    assertInstallationSucceeded(result, "online package cache preparation", false);
  } finally {
    // Only Bun's cache survives; the preparation install is never acceptance evidence.
    rmSync(consumerDirectory, { force: true, recursive: true });
  }
}

function runInstallation(input: {
  readonly cacheDirectory: string | undefined;
  readonly args: readonly string[];
  readonly consumerDirectory: string;
}): ProcessResult {
  const cacheArgs = input.cacheDirectory === undefined ? [] : ["--cache-dir", input.cacheDirectory];
  // copyfile prevents fixture mutations from modifying hardlinked Bun cache entries.
  return runProcessSync({
    command: process.execPath,
    args: ["install", ...installationFlags, ...cacheArgs, ...input.args],
    cwd: input.consumerDirectory
  });
}

function assertInstallationSucceeded(result: ProcessResult, phase: string, offline: boolean): void {
  if (result.error === undefined && result.signal === null && result.status === 0) return;
  const termination = installationTermination(result);
  // Registry output can contain credentials, private URLs, or configuration values.
  const recovery = offline
    ? " Cache may be missing or incomplete. Run `bun run package:cache:prepare` explicitly with network access, then retry. No online retry was attempted."
    : " Check network access and Bun registry/cache configuration, then rerun `bun run package:cache:prepare`.";
  throw new Error(`${phase} failed (${termination}).${recovery}`);
}

function installationTermination(result: ProcessResult): string {
  if (result.error !== undefined) return "command could not complete";
  if (result.signal !== null) return `signal ${result.signal}`;
  return `exit ${String(result.status)}`;
}
