import { posix, relative } from "node:path";

import {
  readModuleSpecifierAnalysis,
  appendModuleSpecifierDiagnostics,
  type ModuleSpecifierAnalysis
} from "./module-specifier-analysis.ts";

const PRIVATE_PROCESS_EXECUTION_FILES = new Set([
  "scripts/process-execution/contract.ts",
  "scripts/process-execution/failure.ts",
  "scripts/process-execution/plain-text-environment.ts",
  "scripts/process-execution/result.ts",
  "scripts/process-execution/runner.ts"
]);

interface ImportBoundaryInput {
  readonly repositoryPath: string;
  readonly analysis: ModuleSpecifierAnalysis;
  readonly violations: string[];
}

export function validateImportBoundaries(
  root: string,
  sourceFiles: readonly string[],
  violations: string[],
  analysesBySourcePath = new Map<string, ModuleSpecifierAnalysis>()
): void {
  for (const sourcePath of sourceFiles) {
    const repositoryPath = relativePath(root, sourcePath);
    if (isFixtureSourcePath(repositoryPath)) continue;
    validateModuleImportBoundaries(
      repositoryPath,
      readModuleSpecifierAnalysis({ sourcePath, repositoryPath, analysesBySourcePath }),
      violations
    );
  }
}

/** Applies dependency policy to one repository-relative module analysis, without filesystem IO. */
export function validateModuleImportBoundaries(
  repositoryPath: string,
  analysis: ModuleSpecifierAnalysis,
  violations: string[]
): void {
  if (isFixtureSourcePath(repositoryPath)) return;
  appendModuleSpecifierDiagnostics(violations, analysis);
  const input: ImportBoundaryInput = { repositoryPath, analysis, violations };
  validateProductImportsScripts(input);
  validateProjectImportsProduct(input);
  validatePackageImportsProject(input);
  validateEnvironmentImportsProcessExecution(input);
  validateScriptPrivateProcessExecutionImports(input);
}

export function relativePath(root: string, absolutePath: string): string {
  return relative(root, absolutePath).split("\\").join("/");
}

export function resolvedRelativeModulePath(
  repositoryPath: string,
  specifier: string
): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  return posix.normalize(posix.join(posix.dirname(repositoryPath), specifier));
}

/** Fixture text may deliberately be malformed source rather than parsable TypeScript. */
export function isFixtureSourcePath(repositoryPath: string): boolean {
  return repositoryPath.includes("/fixtures/");
}

function validateProductImportsScripts(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("src/")) return;
  reportImportsUnder(
    input,
    input.analysis.valueModuleSpecifiers,
    "scripts",
    "product-imports-scripts"
  );
}

function validateProjectImportsProduct(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("scripts/project/")) return;
  reportImportsUnder(input, input.analysis.moduleSpecifiers, "src", "project-deep-imports-product");
}

function validatePackageImportsProject(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("scripts/package/")) return;
  reportImportsUnder(
    input,
    input.analysis.moduleSpecifiers,
    "scripts/project",
    "package-imports-project"
  );
}

function validateEnvironmentImportsProcessExecution(input: ImportBoundaryInput): void {
  if (input.repositoryPath !== "scripts/environment/manage.ts") return;
  reportImportsUnder(
    input,
    input.analysis.moduleSpecifiers,
    "scripts/process-execution",
    "environment-imports-process-execution"
  );
}

function validateScriptPrivateProcessExecutionImports(input: ImportBoundaryInput): void {
  if (
    !input.repositoryPath.startsWith("scripts/") ||
    input.repositoryPath.startsWith("scripts/process-execution/")
  ) {
    return;
  }
  for (const specifier of input.analysis.moduleSpecifiers) {
    const targetPath = resolvedRelativeModulePath(input.repositoryPath, specifier);
    if (targetPath !== undefined && PRIVATE_PROCESS_EXECUTION_FILES.has(targetPath)) {
      input.violations.push(
        `script-deep-imports-process-execution: ${input.repositoryPath} -> ${specifier}`
      );
    }
  }
}

function reportImportsUnder(
  input: ImportBoundaryInput,
  specifiers: readonly string[],
  targetRoot: string,
  violationCode: string
): void {
  for (const specifier of specifiers) {
    if (resolvesUnder(input.repositoryPath, specifier, targetRoot)) {
      input.violations.push(`${violationCode}: ${input.repositoryPath} -> ${specifier}`);
    }
  }
}

function resolvesUnder(repositoryPath: string, specifier: string, targetRoot: string): boolean {
  const targetPath = resolvedRelativeModulePath(repositoryPath, specifier);
  return targetPath === targetRoot || targetPath?.startsWith(`${targetRoot}/`) === true;
}
