/**
 * Repository file discovery and fingerprint helpers for quality scans.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { buildFingerprint, isExcluded } from "../model/code-areas.ts";
import { matchesAnyConfigGlob } from "../model/config-glob.ts";
import { collectSubmoduleWorktreeFiles } from "./revision-worktree-files.ts";
import {
  processFailed,
  runGit,
  splitNulDelimitedGitFileList,
  toSlashPath,
  walkFiles
} from "../../foundation/index.ts";
import type { CodeAreaFileMap, CodeAreaFingerprint } from "../model/schema.ts";

export interface ScanInputConfig {
  readonly excludeDirs: readonly string[];
  readonly generatedFiles: readonly string[];
  readonly include: readonly string[];
}

export function collectScanFiles(rootDir: string, config: ScanInputConfig): string[] {
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

function collectFilesFallback(rootDir: string, config: ScanInputConfig): string[] {
  const files: string[] = [];

  for (const relPath of walkFiles({ ignoredDirs: config.excludeDirs, rootDir })) {
    if (isScanInputFile(relPath, config)) {
      files.push(relPath);
    }
  }

  return uniqueSorted(files);
}

function normalizeAndFilterFiles(
  files: string[],
  config: ScanInputConfig,
  rootDir: string
): string[] {
  return uniqueSorted(
    files
      .map(toSlashPath)
      .filter((f) => existsSync(resolve(rootDir, f)))
      .filter((f) => isScanInputFile(f, config))
  );
}

function isScanInputFile(filePath: string, config: ScanInputConfig): boolean {
  const normalized = toSlashPath(filePath);
  return (
    matchesAnyConfigGlob(normalized, config.include) &&
    !isExcluded(normalized, config.excludeDirs, config.generatedFiles)
  );
}

function uniqueSorted(files: string[]): string[] {
  return [...new Set(files)].sort();
}
