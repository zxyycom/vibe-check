import fs from "node:fs";
import path from "node:path";

import { Minimatch } from "minimatch";

import { type BunTestSurface, isSafeRelativeGlob } from "../profile.ts";
import { isSafeRelativePosixPath, resolveExistingWorkspacePath } from "../relative-path.ts";

const GLOB_OPTIONS = {
  dot: true,
  nocomment: true,
  nonegate: true
} as const;

export function resolveBunTestFiles(options: {
  workspaceRoot: string;
  profile: BunTestSurface;
}): string[] {
  validateSurface(options.profile);

  const includeMatches = new Map(options.profile.include.map((pattern) => [pattern, 0]));
  const directoryFiles = collectDirectoryFiles(options, includeMatches);
  assertEveryIncludeMatched(includeMatches);
  const files = new Set(directoryFiles);
  addSupplementalFiles(options, directoryFiles, files);

  if (files.size === 0) {
    throw new Error("Bun test surface matched no files");
  }
  return [...files].sort((left, right) => compareStrings({ left, right }));
}

function collectDirectoryFiles(
  options: {
    workspaceRoot: string;
    profile: BunTestSurface;
  },
  includeMatches: Map<string, number>
): Set<string> {
  const files = new Set<string>();
  const includes = options.profile.include.map((pattern) => new Minimatch(pattern, GLOB_OPTIONS));
  const ignores = options.profile.ignore.map((pattern) => new Minimatch(pattern, GLOB_OPTIONS));
  const ignoredSubtrees = ignores.filter((matcher) => matcher.pattern.endsWith("/**"));
  for (const sourceRoot of options.profile.sourceRoots) {
    const resolved = resolveExistingWorkspacePath(
      options.workspaceRoot,
      sourceRoot,
      `Bun source root ${sourceRoot}`
    );
    if (!resolved.stats.isDirectory()) {
      throw new Error(`Bun source root must be a directory: ${sourceRoot}`);
    }
    for (const relativePath of walkRegularFiles(resolved.absolutePath, canSkipDirectory)) {
      let included = false;
      for (const matcher of includes) {
        if (!matcher.match(relativePath)) continue;
        includeMatches.set(matcher.pattern, (includeMatches.get(matcher.pattern) ?? 0) + 1);
        included = true;
      }
      if (included && !ignores.some((matcher) => matcher.match(relativePath))) {
        files.add(path.posix.join(sourceRoot, relativePath));
      }
    }
  }
  return files;

  function canSkipDirectory(relativeDirectory: string): boolean {
    // A trailing globstar excludes every descendant, not just the directory itself.
    // Includes count real files before ignores; retain discovery until each has a witness.
    return (
      ignoredSubtrees.some((matcher) => matcher.match(`${relativeDirectory}/`)) &&
      [...includeMatches.values()].every((count) => count > 0)
    );
  }
}

function assertEveryIncludeMatched(includeMatches: Map<string, number>): void {
  for (const [pattern, matchCount] of includeMatches) {
    if (matchCount === 0) {
      throw new Error(`Bun include pattern matched no files: ${pattern}`);
    }
  }
}

function addSupplementalFiles(
  options: {
    workspaceRoot: string;
    profile: BunTestSurface;
  },
  directoryFiles: ReadonlySet<string>,
  files: Set<string>
): void {
  for (const sourcePath of options.profile.supplementalFiles) {
    const resolved = resolveExistingWorkspacePath(
      options.workspaceRoot,
      sourcePath,
      `Bun supplemental file ${sourcePath}`
    );
    if (!resolved.stats.isFile()) {
      throw new Error(`Bun supplemental file must be a file: ${sourcePath}`);
    }
    if (directoryFiles.has(sourcePath)) {
      throw new Error(
        `Bun supplemental file is already included by directory rules: ${sourcePath}`
      );
    }
    files.add(sourcePath);
  }
}

function validateSurface(profile: BunTestSurface): void {
  if (profile.sourceRoots.length === 0 || profile.include.length === 0) {
    throw new Error("Bun sourceRoots and include must be non-empty");
  }
  for (const sourceRoot of profile.sourceRoots) {
    if (!isSafeRelativePosixPath(sourceRoot)) {
      throw new Error(
        `Bun sourceRoots must contain safe relative POSIX paths: ${String(sourceRoot)}`
      );
    }
  }
  for (const pattern of [...profile.include, ...profile.ignore]) {
    if (!isSafeRelativeGlob(pattern)) {
      throw new Error(`Bun patterns must be positive relative POSIX globs: ${pattern}`);
    }
  }
  for (const sourcePath of profile.supplementalFiles) {
    if (!isSafeRelativePosixPath(sourcePath)) {
      throw new Error(
        `Bun supplementalFiles must contain safe relative POSIX paths: ${String(sourcePath)}`
      );
    }
  }
}

function* walkRegularFiles(
  rootPath: string,
  canSkipDirectory: (relativeDirectory: string) => boolean
): Generator<string> {
  yield* visit(rootPath, "");

  function* visit(directoryPath: string, relativeDirectory: string): Generator<string> {
    const entries = fs
      .readdirSync(directoryPath, { withFileTypes: true })
      .sort((left, right) => compareStrings({ left: left.name, right: right.name }));
    for (const entry of entries) {
      const relativePath = relativeDirectory
        ? path.posix.join(relativeDirectory, entry.name)
        : entry.name;
      const absolutePath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        if (!canSkipDirectory(relativePath)) yield* visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        yield relativePath;
      }
    }
  }
}

function compareStrings({
  left,
  right
}: {
  readonly left: string;
  readonly right: string;
}): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
