import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { walkFiles } from "../repository-files/files.ts";
import { REPOSITORY_SCAN_IGNORED_DIRECTORIES } from "./repository-scan-policy.ts";
import { validateFunctionMetricsAnalyzerBoundary } from "./function-metrics-analyzer-boundary.ts";
import { validateImportBoundaries } from "./import-boundaries.ts";
import { validatePackageToolsBoundary } from "./package-tools-boundary.ts";
import type { ModuleSpecifierAnalysis } from "./module-specifier-analysis.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function validateRepositoryLayout(
  input: Readonly<{ readonly repositoryRoot?: string }> = {}
): void {
  const root = resolve(input.repositoryRoot ?? repositoryRoot);
  const sourceFiles = [
    ...sourceFilesUnder(root, "src"),
    ...sourceFilesUnder(root, "scripts")
  ].sort();
  const violations: string[] = [];
  const analysesBySourcePath = new Map<string, ModuleSpecifierAnalysis>();

  validateImportBoundaries(root, sourceFiles, violations, analysesBySourcePath);
  validateFunctionMetricsAnalyzerBoundary(root, sourceFiles, violations, analysesBySourcePath);
  validatePackageToolsBoundary(root, violations);

  if (violations.length > 0) {
    throw new Error(`repository layout validation failed:\n${violations.join("\n")}`);
  }
}

function sourceFilesUnder(root: string, sourceRoot: string): readonly string[] {
  const directory = join(root, sourceRoot);
  if (!existsSync(directory)) return [];
  return walkFiles({ ignoredDirs: REPOSITORY_SCAN_IGNORED_DIRECTORIES, rootDir: directory })
    .filter((filePath) => filePath.endsWith(".ts"))
    .map((filePath) => join(directory, filePath));
}
