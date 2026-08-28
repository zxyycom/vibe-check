import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isNonArrayRecord } from "../../../data-boundary/value-shapes.ts";
import type { DuplicateDetectionScannerCommand } from "../options.ts";

const JSCPD_BIN_NAME = "jscpd";
const JSCPD_PACKAGE_NAME = "jscpd";

export interface JscpdCommand {
  readonly executable: string;
  readonly scanPrefixArguments: readonly string[];
  readonly versionArguments: readonly string[];
}

export type ResolvedJscpdCommand =
  | Readonly<{ command: JscpdCommand; kind: "resolved" }>
  | Readonly<{ error: string; kind: "unavailable" }>;

/**
 * package-provided scanner 的可移植 marker。真实 executable 只由私有 jscpd adapter 解析，避免公共
 * Definition 与 fingerprint 保存 consumer-specific Bun 或 package path。
 */
export const DEFAULT_JSCPD_COMMAND: DuplicateDetectionScannerCommand = Object.freeze({
  kind: "package"
});

export function isPackageJscpdCommand(
  command: DuplicateDetectionScannerCommand
): command is Extract<DuplicateDetectionScannerCommand, { readonly kind: "package" }> {
  return command.kind === "package";
}

export function resolveJscpdCommand(
  command: DuplicateDetectionScannerCommand
): ResolvedJscpdCommand {
  if (command.kind === "custom") {
    return Object.freeze({
      command: Object.freeze({
        executable: command.executable,
        scanPrefixArguments: Object.freeze([]),
        versionArguments: Object.freeze(["--version"])
      }),
      kind: "resolved"
    });
  }

  const binTarget = installedJscpdBinTarget();
  if (binTarget === null) {
    return Object.freeze({
      error: "candidate jscpd package manifest or declared bin target is unavailable",
      kind: "unavailable"
    });
  }

  return Object.freeze({
    command: Object.freeze({
      executable: process.execPath,
      scanPrefixArguments: Object.freeze([binTarget]),
      versionArguments: Object.freeze([binTarget, "--version"])
    }),
    kind: "resolved"
  });
}

export function readJscpdBinTarget(packageManifestPath: string): string | null {
  let manifest: unknown;
  try {
    manifest = JSON.parse(readFileSync(packageManifestPath, "utf8"));
  } catch {
    return null;
  }

  const binTarget = declaredJscpdBinTarget(manifest);
  if (binTarget === null || isAbsolute(binTarget)) return null;

  const packageDirectory = dirname(packageManifestPath);
  const resolvedTarget = resolve(packageDirectory, binTarget);
  const targetRelativePath = relative(packageDirectory, resolvedTarget);
  if (
    targetRelativePath === "" ||
    targetRelativePath === ".." ||
    targetRelativePath.startsWith("../") ||
    targetRelativePath.startsWith("..\\") ||
    !existsSync(resolvedTarget)
  ) {
    return null;
  }

  return resolvedTarget;
}

function installedJscpdBinTarget(): string | null {
  try {
    const packageManifestPath = fileURLToPath(
      import.meta.resolve(`${JSCPD_PACKAGE_NAME}/package.json`)
    );
    return readJscpdBinTarget(packageManifestPath);
  } catch {
    return null;
  }
}

function declaredJscpdBinTarget(manifest: unknown): string | null {
  if (!isNonArrayRecord(manifest)) return null;
  const bin = manifest.bin;
  if (typeof bin === "string") return bin;
  if (!isNonArrayRecord(bin)) return null;
  const target = bin[JSCPD_BIN_NAME];
  return typeof target === "string" ? target : null;
}
