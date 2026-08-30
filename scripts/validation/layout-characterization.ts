import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { walkFiles } from "../repository-files/files.ts";
import { FILE_SYSTEM } from "./documentation/task-contract.ts";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const PRODUCT_OWNER_DIRECTORIES = Object.freeze([
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
  "scripts/project-gate",
  "scripts/project/gate/checks"
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
const PRIVATE_PROCESS_EXECUTION_FILES = new Set([
  "scripts/process-execution/contract.ts",
  "scripts/process-execution/failure.ts",
  "scripts/process-execution/plain-text-environment.ts",
  "scripts/process-execution/result.ts",
  "scripts/process-execution/runner.ts"
]);
const PACKAGE_ARTIFACT_ENTRY_SOURCE = new RegExp(
  "join\\(\\s*repositoryRoot\\s*,\\s*[\"']src/index\\.ts[\"']\\s*\\)",
  "u"
);
const MODULE_BASENAME_SUFFIX = new RegExp("(?:\\.test-support|\\.test)?\\.ts$", "u");
const MODULE_SPECIFIER_FROM_PATTERN = new RegExp(
  "\\b(?:import|export)\\s+(type\\s+)?[\\s\\S]*?\\sfrom\\s*[\"']([^\"']+)[\"']",
  "gu"
);
const SIDE_EFFECT_IMPORT_PATTERN = new RegExp("\\bimport\\s*[\"']([^\"']+)[\"']", "gu");
const DYNAMIC_IMPORT_PATTERN = new RegExp("\\bimport\\s*\\(\\s*[\"']([^\"']+)[\"']\\s*\\)", "gu");

interface ImportBoundaryInput {
  readonly repositoryPath: string;
  readonly root: string;
  readonly source: string;
  readonly sourcePath: string;
  readonly violations: string[];
}

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
  validateSourceNames(root, sourceFiles, violations);
  validateImportBoundaries(root, sourceFiles, violations);
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

function validateImportBoundaries(
  root: string,
  sourceFiles: readonly string[],
  violations: string[]
): void {
  for (const sourcePath of sourceFiles) {
    const input: ImportBoundaryInput = {
      repositoryPath: relativePath(root, sourcePath),
      root,
      source: readFileSync(sourcePath, "utf8"),
      sourcePath,
      violations
    };
    validateProductImportsScripts(input);
    validateProjectImportsProduct(input);
    validatePackageImportsProject(input);
    validateEnvironmentImportsProcessExecution(input);
    validateScriptPrivateProcessExecutionImports(input);
  }
}

function validateProductImportsScripts(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("src/")) return;
  reportImportsUnder(
    input,
    valueModuleSpecifiers(input.source),
    "scripts",
    "product-imports-scripts"
  );
}

function validateProjectImportsProduct(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("scripts/project/")) return;
  reportImportsUnder(input, moduleSpecifiers(input.source), "src", "project-deep-imports-product");
}

function validatePackageImportsProject(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("scripts/package/")) return;
  reportImportsUnder(
    input,
    moduleSpecifiers(input.source),
    "scripts/project",
    "package-imports-project"
  );
}

function validateEnvironmentImportsProcessExecution(input: ImportBoundaryInput): void {
  if (input.repositoryPath !== "scripts/environment/manage.ts") return;
  reportImportsUnder(
    input,
    moduleSpecifiers(input.source),
    "scripts/process-execution",
    "environment-imports-process-execution"
  );
}

function reportImportsUnder(
  input: ImportBoundaryInput,
  specifiers: readonly string[],
  targetRoot: string,
  violationCode: string
): void {
  for (const specifier of specifiers) {
    if (resolvesUnder(input.root, input.sourcePath, specifier, targetRoot)) {
      input.violations.push(`${violationCode}: ${input.repositoryPath} -> ${specifier}`);
    }
  }
}

function validateScriptPrivateProcessExecutionImports(input: ImportBoundaryInput): void {
  if (
    !input.repositoryPath.startsWith("scripts/") ||
    input.repositoryPath.startsWith("scripts/process-execution/")
  ) {
    return;
  }
  for (const specifier of moduleSpecifiers(input.source)) {
    const targetPath = resolvedRelativeModulePath(input.root, input.sourcePath, specifier);
    if (targetPath !== undefined && PRIVATE_PROCESS_EXECUTION_FILES.has(targetPath)) {
      input.violations.push(
        `script-deep-imports-process-execution: ${input.repositoryPath} -> ${specifier}`
      );
    }
  }
}

function validatePackageArtifactEntry(root: string, violations: string[]): void {
  const buildPath = join(root, "scripts/package/artifact/build.ts");
  if (!existsSync(buildPath)) {
    violations.push("package-artifact-entry: scripts/package/artifact/build.ts is missing");
    return;
  }
  const source = readFileSync(buildPath, "utf8");
  if (!PACKAGE_ARTIFACT_ENTRY_SOURCE.test(source)) {
    violations.push("package-artifact-entry: expected src/index.ts");
  }
}

function moduleBasename(sourcePath: string): string {
  return basename(sourcePath).replace(MODULE_BASENAME_SUFFIX, "");
}

function relativePath(root: string, absolutePath: string): string {
  return relative(root, absolutePath).split("\\").join("/");
}

function resolvesUnder(
  root: string,
  sourcePath: string,
  specifier: string,
  targetRoot: string
): boolean {
  const targetPath = resolvedRelativeModulePath(root, sourcePath, specifier);
  if (targetPath === undefined) return false;
  return targetPath === targetRoot || targetPath.startsWith(`${targetRoot}/`);
}

function resolvedRelativeModulePath(
  root: string,
  sourcePath: string,
  specifier: string
): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  return relativePath(root, resolve(dirname(sourcePath), specifier));
}

function valueModuleSpecifiers(source: string): readonly string[] {
  return moduleSpecifiers(source, { includeTypeOnly: false });
}

function moduleSpecifiers(
  source: string,
  options: Readonly<{ readonly includeTypeOnly?: boolean }> = {}
): readonly string[] {
  const specifiers = new Set<string>();
  for (const match of source.matchAll(MODULE_SPECIFIER_FROM_PATTERN)) {
    if (options.includeTypeOnly === false && match[1] !== undefined) continue;
    const specifier = match[2];
    if (specifier !== undefined) specifiers.add(specifier);
  }
  for (const match of source.matchAll(SIDE_EFFECT_IMPORT_PATTERN)) {
    const specifier = match[1];
    if (specifier !== undefined) specifiers.add(specifier);
  }
  for (const match of source.matchAll(DYNAMIC_IMPORT_PATTERN)) {
    const specifier = match[1];
    if (specifier !== undefined) specifiers.add(specifier);
  }
  return [...specifiers];
}
