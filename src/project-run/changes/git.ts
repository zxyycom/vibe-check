import { isAbsolute, relative, resolve, sep } from "node:path";

import { execaSync } from "execa";

import { matchesAnyConfigGlob } from "../../data-boundary/config-glob.ts";
import { isNormalizedProjectRelativePath } from "../../data-boundary/project-path.ts";
import type { ProjectChanges } from "../../check/check.ts";
import type { ProjectChangesConfiguration } from "../../project-definition/project-changes.ts";

export const CHANGE_FLAG_PREFIX = "vibe-check:change:";
export const GIT_CHANGES_UNAVAILABLE_CODE = "git-changes-unavailable";

export type PreparedProjectChanges = Readonly<{
  readonly effectiveFlags: readonly string[];
  readonly projectChanges: ProjectChanges;
}>;

/** Prepares one configured Git change snapshot before Run flag selection. */
export function prepareProjectChanges(
  input: Readonly<{
    readonly callerFlags: readonly string[];
    readonly changes: ProjectChangesConfiguration;
    readonly projectRoot: string;
  }>
): PreparedProjectChanges {
  const declaredFlags = declaredChangeFlags(input.changes);
  try {
    const paths = collectGitChangedPaths(input.projectRoot, input.changes.source.compareWith);
    const projectChanges = matchedProjectChanges(paths, input.changes);
    return Object.freeze({
      effectiveFlags: combineFlags(
        input.callerFlags,
        projectChanges.files.flatMap(({ flags }) => flags)
      ),
      projectChanges
    });
  } catch {
    return Object.freeze({
      effectiveFlags: combineFlags(input.callerFlags, declaredFlags),
      projectChanges: Object.freeze({
        ok: false,
        reason: Object.freeze({ code: GIT_CHANGES_UNAVAILABLE_CODE })
      })
    });
  }
}

function declaredChangeFlags(changes: ProjectChangesConfiguration): readonly string[] {
  return Object.freeze(
    Object.keys(changes.flags)
      .sort(compareText)
      .map((flagId) => `${CHANGE_FLAG_PREFIX}${flagId}`)
  );
}

function collectGitChangedPaths(projectRoot: string, compareWith: string): readonly string[] {
  const root = resolve(projectRoot);
  const repositoryRoot = gitText(root, ["rev-parse", "--show-toplevel"]);
  if (!isProjectRootInRepository(root, resolve(repositoryRoot))) {
    throw new Error("project root is outside the Git repository");
  }

  const committed = gitNameStatus(root, [
    "diff",
    "--relative",
    "--name-status",
    "-z",
    "--find-renames",
    `${compareWith}...HEAD`
  ]);
  const staged = gitNameStatus(root, [
    "diff",
    "--cached",
    "--relative",
    "--name-status",
    "-z",
    "--find-renames"
  ]);
  const unstaged = gitNameStatus(root, [
    "diff",
    "--relative",
    "--name-status",
    "-z",
    "--find-renames"
  ]);
  const untracked = gitNulPaths(root, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
    "--",
    "."
  ]);
  return Object.freeze(
    [
      ...new Set([...committed, ...staged, ...unstaged, ...untracked].map(normalizedChangedPath))
    ].sort(compareText)
  );
}

function isProjectRootInRepository(projectRoot: string, repositoryRoot: string): boolean {
  const fromRepository = relative(repositoryRoot, projectRoot);
  return (
    !isAbsolute(fromRepository) && fromRepository !== ".." && !fromRepository.startsWith(`..${sep}`)
  );
}

function gitText(cwd: string, args: readonly string[]): string {
  const text = gitOutput(cwd, args).trim();
  if (text.length === 0) throw new Error("Git command returned no text");
  return text;
}

function gitOutput(cwd: string, args: readonly string[]): string {
  const result = execaSync("git", args, {
    cwd,
    encoding: "utf8",
    reject: false,
    stripFinalNewline: false,
    windowsHide: true
  });
  if (result.failed || result.exitCode !== 0) throw new Error("Git command failed");
  if (typeof result.stdout !== "string") throw new Error("Git command returned non-text output");
  return result.stdout;
}

function gitNameStatus(cwd: string, args: readonly string[]): readonly string[] {
  return parseGitNameStatus(gitOutput(cwd, args));
}

function gitNulPaths(cwd: string, args: readonly string[]): readonly string[] {
  return gitOutput(cwd, args)
    .split("\0")
    .filter((path) => path.length > 0);
}

/** Parses Git's `--name-status -z` protocol without line or tab splitting. */
function parseGitNameStatus(stdout: string): readonly string[] {
  const tokens = stdout.split("\0");
  if (tokens.at(-1) === "") tokens.pop();
  const paths: string[] = [];
  for (let index = 0; index < tokens.length;) {
    const entry = parseGitNameStatusEntry(tokens, index);
    paths.push(...entry.paths);
    index = entry.nextIndex;
  }
  return Object.freeze(paths);
}

function parseGitNameStatusEntry(
  tokens: readonly string[],
  statusIndex: number
): Readonly<{ readonly nextIndex: number; readonly paths: readonly string[] }> {
  const status = tokens[statusIndex];
  if (status === undefined || !isNameStatus(status))
    throw new Error("invalid Git name-status output");
  const pathCount = nameStatusPathCount(status);
  const paths = tokens.slice(statusIndex + 1, statusIndex + 1 + pathCount);
  if (paths.length !== pathCount || paths.some((path) => path.length === 0))
    throw new Error("missing Git changed path");
  return Object.freeze({ nextIndex: statusIndex + 1 + pathCount, paths: Object.freeze(paths) });
}

function nameStatusPathCount(status: string): 1 | 2 {
  return status.startsWith("R") || status.startsWith("C") ? 2 : 1;
}

function isNameStatus(value: string): boolean {
  return /^(?:[ACDMRTUXB][0-9]*|[RC][0-9]+)$/u.test(value);
}

function normalizedChangedPath(path: string): string {
  if (!isNormalizedProjectRelativePath(path)) throw new Error("invalid Git project-relative path");
  return path;
}

function matchedProjectChanges(
  paths: readonly string[],
  changes: ProjectChangesConfiguration
): Extract<ProjectChanges, { readonly ok: true }> {
  const regions = Object.entries(changes.flags).sort(([left], [right]) => compareText(left, right));
  const files = paths.flatMap((path) => {
    const flags = regions.flatMap(([flagId, region]) =>
      matchesRegion(path, region) ? [`${CHANGE_FLAG_PREFIX}${flagId}`] : []
    );
    return flags.length === 0 ? [] : [Object.freeze({ flags: Object.freeze(flags), path })];
  });
  return Object.freeze({ ok: true, files: Object.freeze(files) });
}

function matchesRegion(
  path: string,
  region: ProjectChangesConfiguration["flags"][string]
): boolean {
  return matchesAnyConfigGlob(path, region.include) && !matchesAnyConfigGlob(path, region.exclude);
}

function combineFlags(...sets: readonly (readonly string[])[]): readonly string[] {
  return Object.freeze([...new Set(sets.flat())].sort(compareText));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
