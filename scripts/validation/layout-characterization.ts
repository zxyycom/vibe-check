import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { walkFiles } from "../repository-files/files.ts";
import { FILE_SYSTEM } from "./documentation/task-contract.ts";
import { validateFunctionMetricsAnalyzerBoundary } from "./function-metrics-analyzer-boundary.ts";
import { relativePath, validateImportBoundaries } from "./import-boundaries.ts";
import { validateProjectGateRoot } from "./project-gate-layout.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const PRODUCT_OWNER_DIRECTORIES = Object.freeze([
  "cache",
  "check",
  "check-settlement",
  "data-boundary",
  "finding-waivers",
  "machine-output",
  "package-checks",
  "project-definition",
  "project-run"
]);
const RETIRED_SOURCE_DIRECTORIES = Object.freeze([
  "src/product",
  "scripts/tools",
  "scripts/foundation",
  "scripts/diagnostics",
  "scripts/data-boundary",
  "scripts/process-execution/process",
  "scripts/validation/documentation/repository",
  "scripts/package-candidate",
  "scripts/quality",
  "scripts/project-gate"
]);
const GENERIC_BASENAMES = new Set([
  "current",
  "model",
  "types",
  "common",
  "shared",
  "utils",
  "helpers",
  "workflows"
]);
const PACKAGE_ARTIFACT_COMPILER_ROOTS_SOURCE = new RegExp(
  "export const PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS\\s*=\\s*Object\\.freeze\\(\\s*\\[\\s*[\"']src/index\\.ts[\"']\\s*,\\s*PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH\\s*\\]\\s*\\)",
  "u"
);
const PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH_SOURCE = new RegExp(
  "export const PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH\\s*=\\s*[\"']src/package-checks/function-metrics/analyzer-worker\\.ts[\"']",
  "u"
);
const PACKAGE_ARTIFACT_COMPILER_ROOTS_USE = new RegExp(
  "PACKAGE_RUNTIME_COMPILER_SOURCE_PATHS\\.map\\(\\s*\\(sourcePath\\)\\s*=>\\s*join\\(\\s*repositoryRoot\\s*,\\s*sourcePath\\s*\\)\\s*\\)",
  "u"
);
const MODULE_BASENAME_SUFFIX = new RegExp("(?:\\.test-support|\\.test)?\\.ts$", "u");

export function validateRepositoryLayout(
  input: Readonly<{ readonly repositoryRoot?: string }> = {}
): void {
  const root = resolve(input.repositoryRoot ?? repositoryRoot);
  const sourceFiles = [
    ...sourceFilesUnder(root, "src"),
    ...sourceFilesUnder(root, "scripts")
  ].sort();
  const violations: string[] = [];

  validateRetiredSourceDirectories(root, violations);
  validateProductOwners(root, violations);
  validateProjectGateRoot(root, violations);
  validateSourceNames(root, sourceFiles, violations);
  validateImportBoundaries(root, sourceFiles, violations);
  validateFunctionMetricsAnalyzerBoundary(root, sourceFiles, violations);
  validatePackageArtifactEntry(root, violations);

  if (violations.length > 0) {
    throw new Error(`repository layout characterization failed:\n${violations.join("\n")}`);
  }
}

function sourceFilesUnder(root: string, sourceRoot: string): readonly string[] {
  const directory = join(root, sourceRoot);
  if (!existsSync(directory)) return [];
  return walkFiles({ ignoredDirs: FILE_SYSTEM.ignoredDirs, rootDir: directory })
    .filter((filePath) => filePath.endsWith(".ts"))
    .map((filePath) => join(directory, filePath));
}

function validateRetiredSourceDirectories(root: string, violations: string[]): void {
  for (const directory of RETIRED_SOURCE_DIRECTORIES) {
    if (sourceFilesUnder(root, directory).length > 0) {
      violations.push(`retired-source-directory: ${directory}`);
    }
  }
}

function validateProductOwners(root: string, violations: string[]): void {
  const sourceRoot = join(root, "src");
  if (!existsSync(sourceRoot)) {
    violations.push("product-owner-directories: src is missing");
    return;
  }

  const actual = readdirSync(sourceRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !FILE_SYSTEM.ignoredDirs.includes(entry.name))
    .map((entry) => entry.name)
    .sort();
  if (actual.join("\0") !== PRODUCT_OWNER_DIRECTORIES.join("\0")) {
    violations.push(
      `product-owner-directories: expected ${PRODUCT_OWNER_DIRECTORIES.join(", ")}; found ${actual.join(", ")}`
    );
  }
}

function validateSourceNames(
  root: string,
  sourceFiles: readonly string[],
  violations: string[]
): void {
  for (const sourcePath of sourceFiles) {
    const repositoryPath = relativePath(root, sourcePath);
    if (basename(sourcePath) === "index.ts" && repositoryPath !== "src/index.ts") {
      violations.push(`unapproved-index: ${repositoryPath}`);
    }

    const moduleName = moduleBasename(sourcePath);
    if (GENERIC_BASENAMES.has(moduleName)) {
      violations.push(`generic-basename: ${repositoryPath} (${moduleName})`);
    }
  }
}

function validatePackageArtifactEntry(root: string, violations: string[]): void {
  const buildPath = join(root, "scripts/package/artifact/build.ts");
  if (!existsSync(buildPath)) {
    violations.push("package-artifact-entry: scripts/package/artifact/build.ts is missing");
    return;
  }
  const packageContractPath = join(root, "scripts/package/package-contract.ts");
  if (!existsSync(packageContractPath)) {
    violations.push("package-artifact-entry: scripts/package/package-contract.ts is missing");
    return;
  }
  const buildSource = readFileSync(buildPath, "utf8");
  const packageContractSource = readFileSync(packageContractPath, "utf8");
  if (
    !PACKAGE_ARTIFACT_COMPILER_ROOTS_USE.test(buildSource) ||
    !PACKAGE_ARTIFACT_COMPILER_ROOTS_SOURCE.test(packageContractSource) ||
    !PACKAGE_FUNCTION_METRICS_WORKER_SOURCE_PATH_SOURCE.test(packageContractSource)
  ) {
    violations.push(
      "package-artifact-entry: expected exactly src/index.ts and src/package-checks/function-metrics/analyzer-worker.ts compiler roots"
    );
  }
}

function moduleBasename(sourcePath: string): string {
  return basename(sourcePath).replace(MODULE_BASENAME_SUFFIX, "");
}
