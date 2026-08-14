/**
 * Repository file discovery and fingerprint helpers for quality scans.
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { buildFingerprint, isExcluded } from "../model/code-areas.ts";
import { matchesAnyConfigGlob } from "../model/config-glob.ts";
import { collectSubmoduleWorktreeFiles } from "./revision-tree.ts";
import {
  processFailed,
  runGit,
  splitNulDelimitedGitFileList,
  toSlashPath,
  walkFiles
} from "../../../foundation/src/index.ts";
import type { CodeAreaFileMap, CodeAreaFingerprint, ResolvedQualityConfig } from "../model/schema.ts";

export type ScanInputConfig = Pick<ResolvedQualityConfig, "excludeDirs" | "generatedFiles" | "include">;

export function collectScanFiles(rootDir: string, config: ScanInputConfig): string[] {
  const result = runGit([
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
    "--"
  ], {
    cwd: rootDir,
    maxBuffer: 1024 * 1024 * 64
  });

  if (processFailed(result)) {
    console.log("  ⚠️  git ls-files failed, using fallback file collection");
    return collectFilesFallback(rootDir, config);
  }

  return normalizeAndFilterFiles([
    ...splitNulDelimitedGitFileList(result.stdout),
    ...collectSubmoduleWorktreeFiles(rootDir, config.include)
  ], config, rootDir);
}

export function collectBaselineFiles(workDir: string, config: ScanInputConfig): string[] {
  const result = runGit([
    "ls-files",
    "-z",
    "--cached",
    "--others",
    "--exclude-standard",
    "--"
  ], {
    cwd: workDir,
    maxBuffer: 1024 * 1024 * 64
  });

  if (processFailed(result)) {
    return collectBaselineFilesFallback(workDir, config);
  }

  return normalizeAndFilterFiles([
    ...splitNulDelimitedGitFileList(result.stdout),
    ...collectSubmoduleWorktreeFiles(workDir, config.include)
  ], config, workDir);
}

export function buildFingerprints(fileMap: CodeAreaFileMap, rootDir: string): Record<string, CodeAreaFingerprint> {
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

  for (const relPath of walkFiles(rootDir, { ignoredDirs: config.excludeDirs })) {
    if (isScanInputFile(relPath, config)) {
      files.push(relPath);
    }
  }

  return uniqueSorted(files);
}

function collectBaselineFilesFallback(workDir: string, config: ScanInputConfig): string[] {
  const files: string[] = [];

  for (const relPath of walkFiles(workDir, { ignoredDirs: config.excludeDirs })) {
    if (isScanInputFile(relPath, config)) {
      files.push(relPath);
    }
  }

  return uniqueSorted(files);
}

function normalizeAndFilterFiles(files: string[], config: ScanInputConfig, rootDir: string): string[] {
  return uniqueSorted(
    files
      .map(toSlashPath)
      .filter((f) => existsSync(resolve(rootDir, f)))
      .filter((f) => isScanInputFile(f, config))
  );
}

function isScanInputFile(filePath: string, config: ScanInputConfig): boolean {
  const normalized = toSlashPath(filePath);
  return matchesAnyConfigGlob(normalized, config.include) &&
    !isExcluded(normalized, config.excludeDirs, config.generatedFiles);
}

function uniqueSorted(files: string[]): string[] {
  return [...new Set(files)].sort();
}
