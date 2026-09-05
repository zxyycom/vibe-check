/** Project-root file discovery and selection helpers. */

import { lstatSync } from "node:fs";
import { resolve } from "node:path";

import { matchesAnyConfigGlob } from "./config-glob.ts";
import { collectSubmoduleWorktreeFiles } from "./revision-worktree-files.ts";
import { errorMessage } from "../host-environment/error-message.ts";
import { processFailed } from "../host-environment/process.ts";
import { runGit, splitNulDelimitedGitFileList } from "../host-environment/git.ts";
import { toSlashPath } from "../host-environment/path.ts";
import { walkFiles } from "../host-environment/filesystem.ts";
import type { ProjectFileSelection, ProjectFileSource } from "./configuration.ts";

type NamedProjectFileSelection = Readonly<{
  readonly id: string;
  readonly selection: ProjectFileSelection;
}>;

const CONFIG_GLOB_MAGIC = /[\\*?[\]{}()!+@]/u;

/**
 * Resolves multiple named file sets while enumerating each distinct candidate source once.
 */
export function collectProjectFileSets(
  rootDir: string,
  selections: Readonly<Record<string, ProjectFileSelection>>
): ReadonlyMap<string, readonly string[]> {
  const bySource = groupSelectionsBySource(selections);
  const selectedFiles = new Map<string, readonly string[]>();

  for (const [source, sourceSelections] of bySource) {
    const candidates = collectSourceCandidates(rootDir, source, sourceSelections);
    for (const { id, selection } of sourceSelections) {
      selectedFiles.set(id, Object.freeze(filterProjectFiles(candidates, selection)));
    }
  }

  return selectedFiles;
}

export function collectProjectFiles(rootDir: string, selection: ProjectFileSelection): string[] {
  return [...requireProjectFileSet(collectProjectFileSets(rootDir, { selection }), "selection")];
}

/** 返回已收集的命名文件集合；缺失表示收集完整性失效，不能解释为空集合。 */
export function requireProjectFileSet(
  fileSets: ReadonlyMap<string, readonly string[]>,
  selectionId: string
): readonly string[] {
  const selectedFiles = fileSets.get(selectionId);
  if (selectedFiles === undefined) {
    throw new Error(`project file collection did not produce selection ${selectionId}`);
  }
  return selectedFiles;
}

function groupSelectionsBySource(
  selections: Readonly<Record<string, ProjectFileSelection>>
): ReadonlyMap<ProjectFileSource, readonly NamedProjectFileSelection[]> {
  const mutableGroups = new Map<ProjectFileSource, NamedProjectFileSelection[]>();
  const entries = Object.entries(selections).sort(([left], [right]) => compareText(left, right));

  for (const [id, selection] of entries) {
    const group = mutableGroups.get(selection.source) ?? [];
    group.push({ id, selection });
    mutableGroups.set(selection.source, group);
  }

  return new Map(
    [...mutableGroups].map(([source, group]) => [source, Object.freeze(group)] as const)
  );
}

function collectSourceCandidates(
  rootDir: string,
  source: ProjectFileSource,
  selections: readonly NamedProjectFileSelection[]
): readonly string[] {
  switch (source) {
    case "filesystem":
      return uniqueSorted(
        walkFiles({
          ignoredDirs: commonExcludedDirectoryNames(selections),
          rootDir
        }).map(toSlashPath)
      );
    case "git-worktree":
      return collectGitWorktreeCandidates(rootDir, selections);
    default: {
      const unsupportedSource: never = source;
      throw new TypeError(`unsupported project file source: ${String(unsupportedSource)}`);
    }
  }
}

function collectGitWorktreeCandidates(
  rootDir: string,
  selections: readonly NamedProjectFileSelection[]
): readonly string[] {
  const result = runGit({
    args: ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--"],
    cwd: rootDir
  });
  if (processFailed(result)) {
    const detail =
      result.stderr.trim() ||
      result.error?.message ||
      (result.signal === null ? `exit status ${result.status}` : `signal ${result.signal}`);
    throw new Error(`could not enumerate git-worktree files in ${rootDir}: ${detail}`);
  }

  const include = uniqueSorted(selections.flatMap(({ selection }) => [...selection.include]));
  return uniqueSorted(
    [
      ...splitNulDelimitedGitFileList(result.stdout),
      ...collectSubmoduleWorktreeFiles({ repository: rootDir, scanInputPaths: include })
    ]
      .map(toSlashPath)
      .filter((filePath) => isGitWorktreeFile({ filePath, rootDir }))
  );
}

function isGitWorktreeFile({
  filePath,
  rootDir
}: Readonly<{ readonly filePath: string; readonly rootDir: string }>): boolean {
  try {
    const stats = lstatSync(resolve(rootDir, filePath));
    return stats.isFile() || stats.isSymbolicLink();
  } catch (error: unknown) {
    if (missingPath(error)) return false;
    throw new Error(
      `could not inspect git-worktree candidate ${filePath} in ${rootDir}: ${errorMessage(error)}`,
      { cause: error }
    );
  }
}

function missingPath(error: unknown): boolean {
  const code = error instanceof Error && "code" in error ? error.code : undefined;
  return code === "ENOENT" || code === "ENOTDIR";
}

function filterProjectFiles(
  candidates: readonly string[],
  selection: ProjectFileSelection
): string[] {
  return uniqueSorted(candidates.filter((filePath) => isProjectFile(filePath, selection)));
}

function isProjectFile(filePath: string, selection: ProjectFileSelection): boolean {
  const normalized = toSlashPath(filePath);
  return (
    matchesAnyConfigGlob(normalized, selection.include) &&
    !matchesAnyConfigGlob(normalized, selection.exclude)
  );
}

/**
 * Recognizes only whole-directory exclusions with one literal directory segment. The
 * intersection is a traversal optimization; public semantics remain in `isProjectFile`.
 */
function commonExcludedDirectoryNames(
  selections: readonly NamedProjectFileSelection[]
): readonly string[] {
  let common: Set<string> | undefined;
  for (const { selection } of selections) {
    const names = new Set(selection.exclude.map(literalExcludedDirectoryName).filter(isString));
    common =
      common === undefined
        ? names
        : new Set([...common].filter((directoryName) => names.has(directoryName)));
  }
  return common === undefined ? [] : [...common].sort();
}

function literalExcludedDirectoryName(configGlob: string): string | undefined {
  const prefix = "**/";
  const suffix = "/**";
  if (!configGlob.startsWith(prefix) || !configGlob.endsWith(suffix)) return undefined;
  const directoryName = configGlob.slice(prefix.length, -suffix.length);
  if (directoryName.length === 0 || directoryName.includes("/")) return undefined;
  return CONFIG_GLOB_MAGIC.test(directoryName) ? undefined : directoryName;
}

function isString(value: string | undefined): value is string {
  return value !== undefined;
}

function uniqueSorted(files: readonly string[]): string[] {
  return [...new Set(files)].sort(compareText);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
