/** Path and Git-output projections shared by revision traversal helpers. */

import { toSlashPath } from "../../foundation/path.ts";
import { matchesAnyConfigGlob } from "../configuration/config-glob.ts";

export function uniqueSortedPaths(files: readonly string[]): string[] {
  return [...new Set(files.map(toSlashPath))].sort();
}

export function prefixAndFilter({
  files,
  prefix,
  scanInputPaths
}: Readonly<{
  readonly files: readonly string[];
  readonly prefix: string;
  readonly scanInputPaths: readonly string[];
}>): string[] {
  return files
    .map((file) => joinSlash({ path: file, prefix }))
    .filter((file) => scanInputPaths.length === 0 || matchesAnyConfigGlob(file, scanInputPaths));
}

export function joinSlash({
  path,
  prefix
}: Readonly<{ readonly path: string; readonly prefix: string }>): string {
  return prefix ? `${toSlashPath(prefix)}/${toSlashPath(path)}` : toSlashPath(path);
}

export function nonEmptyGitOutput(stdout: string | null | undefined): string | null {
  const value = (stdout || "").trim();
  return value || null;
}
