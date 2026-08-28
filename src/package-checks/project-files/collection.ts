/** Project-root file discovery and selection helpers. */

import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { matchesAnyConfigGlob } from "./config-glob.ts";
import { collectSubmoduleWorktreeFiles } from "./revision-worktree-files.ts";
import { processFailed } from "../host-environment/process/command.ts";
import { runGit, splitNulDelimitedGitFileList } from "../host-environment/git.ts";
import { toSlashPath } from "../host-environment/path.ts";
import { walkFiles } from "../host-environment/filesystem.ts";
import type { ProjectFileSelection } from "./configuration.ts";

export function collectProjectFiles(rootDir: string, config: ProjectFileSelection): string[] {
  const result = runGit({
    args: ["ls-files", "-z", "--cached", "--others", "--exclude-standard", "--"],
    cwd: rootDir
  });

  if (processFailed(result)) {
    console.log("  ⚠️  git ls-files failed, using fallback file collection");
    return collectFilesFallback(rootDir, config);
  }

  return normalizeAndFilterFiles(
    [
      ...splitNulDelimitedGitFileList(result.stdout),
      ...collectSubmoduleWorktreeFiles({ repository: rootDir, scanInputPaths: config.include })
    ],
    config,
    rootDir
  );
}

function collectFilesFallback(rootDir: string, config: ProjectFileSelection): string[] {
  const files: string[] = [];

  for (const relPath of walkFiles({ ignoredDirs: config.excludeDirs, rootDir })) {
    if (isProjectFile(relPath, config)) {
      files.push(relPath);
    }
  }

  return uniqueSorted(files);
}

function normalizeAndFilterFiles(
  files: string[],
  config: ProjectFileSelection,
  rootDir: string
): string[] {
  return uniqueSorted(
    files
      .map(toSlashPath)
      .filter((f) => existsSync(resolve(rootDir, f)))
      .filter((f) => isProjectFile(f, config))
  );
}

function isProjectFile(filePath: string, config: ProjectFileSelection): boolean {
  const normalized = toSlashPath(filePath);
  return (
    matchesAnyConfigGlob(normalized, config.include) && !isExcludedProjectFile(normalized, config)
  );
}

function isExcludedProjectFile(filePath: string, config: ProjectFileSelection): boolean {
  const pathSegments = filePath.split("/");
  return (
    config.excludeDirs.some((directory) => pathSegments.includes(directory)) ||
    matchesAnyConfigGlob(filePath, config.generatedFiles)
  );
}

function uniqueSorted(files: string[]): string[] {
  return [...new Set(files)].sort();
}
