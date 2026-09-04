import { minimatch } from "minimatch";

import type {
  ProcessFailureProjection,
  ProcessFailureRecord
} from "./process/failure-projection.ts";
import { safeWorkspaceRelativePath } from "./process/safe-workspace-path.ts";

/** Builds Records only from the documented oxfmt list-different path protocol. */
export function createOxfmtFailureProjection(
  input: Readonly<{
    readonly targets: readonly string[];
    readonly workspaceRoot: string;
  }>
): ProcessFailureProjection {
  return Object.freeze({
    recordsFromStdout: (stdout: string) => oxfmtFailureRecords(stdout, input)
  });
}

function oxfmtFailureRecords(
  stdout: string,
  input: Readonly<{ readonly targets: readonly string[]; readonly workspaceRoot: string }>
): readonly ProcessFailureRecord[] | undefined {
  const paths = listedDifferentPaths(stdout, input);
  if (paths === undefined || paths.length === 0) return undefined;
  return Object.freeze(
    paths.sort().map((path) =>
      Object.freeze({
        data: Object.freeze({ kind: "oxfmt-difference", path }),
        id: `oxfmt:${encodeRecordComponent(path)}`
      })
    )
  );
}

function listedDifferentPaths(
  stdout: string,
  input: Readonly<{ readonly targets: readonly string[]; readonly workspaceRoot: string }>
): string[] | undefined {
  const lines = normalizedLines(stdout);
  if (lines === undefined) return undefined;

  const paths: string[] = [];
  for (const line of lines) {
    const path = safeWorkspaceRelativePath(input.workspaceRoot, line);
    if (path === undefined || !matchesFormatTargets(path, input.targets)) return undefined;
    paths.push(path);
  }
  return new Set(paths).size === paths.length ? paths : undefined;
}

function normalizedLines(stdout: string): readonly string[] | undefined {
  if (stdout.length === 0 || (stdout.includes("\r") && !stdout.includes("\r\n"))) return undefined;
  const lines = stdout.replaceAll("\r\n", "\n").split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines.length > 0 && lines.every((line) => line.length > 0)
    ? Object.freeze(lines)
    : undefined;
}

function matchesFormatTargets(path: string, targets: readonly string[]): boolean {
  const included = targets.filter((target) => !target.startsWith("!"));
  const excluded = targets
    .filter((target) => target.startsWith("!"))
    .map((target) => target.slice(1));
  return (
    included.some((target) => minimatch(path, target, { dot: true })) &&
    !excluded.some((target) => minimatch(path, target, { dot: true }))
  );
}

function encodeRecordComponent(value: string): string {
  return encodeURIComponent(value).replaceAll("(", "%28").replaceAll(")", "%29");
}
