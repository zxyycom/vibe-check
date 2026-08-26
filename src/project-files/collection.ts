/** Project-root file discovery and content fingerprint helpers. */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  buildFingerprint,
  isExcluded,
  type CodeAreaFileMap,
  type CodeAreaFingerprint
} from "./code-area-classification.ts";
import { matchesAnyConfigGlob } from "./config-glob.ts";
import { collectSubmoduleWorktreeFiles } from "./revision-worktree-files.ts";
import { processFailed } from "../foundation/process.ts";
import { runGit, splitNulDelimitedGitFileList } from "../foundation/git.ts";
import { toSlashPath } from "../foundation/path.ts";
import { walkFiles } from "../foundation/fs.ts";
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

export function buildFingerprints(
  fileMap: CodeAreaFileMap,
  rootDir: string
): Record<string, CodeAreaFingerprint> {
  const fingerprints: Record<string, CodeAreaFingerprint> = {};

  for (const [area, files] of fileMap.entries()) {
    fingerprints[area] = buildFingerprint(area, files, (filePath) => {
      const absPath = resolve(rootDir, filePath);
      try {
        const content = normalizeFingerprintText(readFileSync(absPath, "utf8"));
        return createHash("sha256").update(content).digest("hex");
      } catch {
        return "file-not-readable";
      }
    });
  }

  return fingerprints;
}

function normalizeFingerprintText(content: string): string {
  return content.replace(/\r\n?/g, "\n");
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
    matchesAnyConfigGlob(normalized, config.include) &&
    !isExcluded(normalized, config.excludeDirs, config.generatedFiles)
  );
}

function uniqueSorted(files: string[]): string[] {
  return [...new Set(files)].sort();
}
