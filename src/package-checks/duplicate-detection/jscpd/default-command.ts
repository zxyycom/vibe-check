import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_JSCPD_COMMAND_MARKER = "vibe-check-package-jscpd";
const JSCPD_BIN_NAME = "jscpd";
const JSCPD_PACKAGE_NAME = "jscpd";

export interface JscpdCommand {
  readonly args: readonly string[];
  readonly availabilityArgs: readonly string[];
  readonly executable: string;
}

export type ResolvedJscpdCommand =
  | Readonly<{ command: JscpdCommand; kind: "resolved" }>
  | Readonly<{ error: string; kind: "unavailable" }>;

/**
 * A portable marker for the package-provided Check's scanner command. Its executable is
 * resolved only by the private jscpd adapter, so public Definition values and
 * fingerprints never contain a consumer-specific Bun or package path.
 */
export const DEFAULT_JSCPD_COMMAND: JscpdCommand = Object.freeze({
  args: Object.freeze([]),
  availabilityArgs: Object.freeze(["--version"]),
  executable: DEFAULT_JSCPD_COMMAND_MARKER
});

export function isDefaultJscpdCommand(command: JscpdCommand): boolean {
  return (
    command.executable === DEFAULT_JSCPD_COMMAND.executable &&
    sameStrings(command.args, DEFAULT_JSCPD_COMMAND.args) &&
    sameStrings(command.availabilityArgs, DEFAULT_JSCPD_COMMAND.availabilityArgs)
  );
}

export function resolveJscpdCommand(command: JscpdCommand): ResolvedJscpdCommand {
  if (!isDefaultJscpdCommand(command)) {
    return Object.freeze({ command, kind: "resolved" });
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
      args: Object.freeze([binTarget]),
      availabilityArgs: Object.freeze([binTarget, "--version"]),
      executable: process.execPath
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
  if (!isRecord(manifest)) return null;
  const bin = manifest.bin;
  if (typeof bin === "string") return bin;
  if (!isRecord(bin)) return null;
  const target = bin[JSCPD_BIN_NAME];
  return typeof target === "string" ? target : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
