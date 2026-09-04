import { readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import {
  analyzeModuleSpecifiers,
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
  readonly root: string;
  readonly source: string;
  readonly sourcePath: string;
  readonly violations: string[];
}

export function validateImportBoundaries(
  root: string,
  sourceFiles: readonly string[],
  violations: string[]
): void {
  for (const sourcePath of sourceFiles) {
    const repositoryPath = relativePath(root, sourcePath);
    if (isFixtureSourcePath(repositoryPath)) continue;
    const input: ImportBoundaryInput = {
      repositoryPath,
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

export function relativePath(root: string, absolutePath: string): string {
  return relative(root, absolutePath).split("\\").join("/");
}

export function resolvedRelativeModulePath(
  root: string,
  sourcePath: string,
  specifier: string
): string | undefined {
  if (!specifier.startsWith(".")) return undefined;
  return relativePath(root, resolve(dirname(sourcePath), specifier));
}

/** Fixture text may deliberately be malformed source rather than parsable TypeScript. */
export function isFixtureSourcePath(repositoryPath: string): boolean {
  return repositoryPath.includes("/fixtures/");
}

function validateProductImportsScripts(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("src/")) return;
  reportImportsUnder(input, valueModuleSpecifiers(input), "scripts", "product-imports-scripts");
}

function validateProjectImportsProduct(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("scripts/project/")) return;
  reportImportsUnder(input, moduleSpecifiers(input), "src", "project-deep-imports-product");
}

function validatePackageImportsProject(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("scripts/package/")) return;
  reportImportsUnder(input, moduleSpecifiers(input), "scripts/project", "package-imports-project");
}

function validateEnvironmentImportsProcessExecution(input: ImportBoundaryInput): void {
  if (input.repositoryPath !== "scripts/environment/manage.ts") return;
  reportImportsUnder(
    input,
    moduleSpecifiers(input),
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
  for (const specifier of moduleSpecifiers(input)) {
    const targetPath = resolvedRelativeModulePath(input.root, input.sourcePath, specifier);
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
    if (resolvesUnder(input.root, input.sourcePath, specifier, targetRoot)) {
      input.violations.push(`${violationCode}: ${input.repositoryPath} -> ${specifier}`);
    }
  }
}

function moduleSpecifiers(input: ImportBoundaryInput): readonly string[] {
  return analyzeImportBoundarySource(input).moduleSpecifiers;
}

function valueModuleSpecifiers(input: ImportBoundaryInput): readonly string[] {
  return analyzeImportBoundarySource(input).valueModuleSpecifiers;
}

function analyzeImportBoundarySource(input: ImportBoundaryInput): ModuleSpecifierAnalysis {
  const analysis = analyzeModuleSpecifiers(input.source, input.repositoryPath);
  appendModuleSpecifierDiagnostics(input.violations, analysis);
  return analysis;
}

function resolvesUnder(
  root: string,
  sourcePath: string,
  specifier: string,
  targetRoot: string
): boolean {
  const targetPath = resolvedRelativeModulePath(root, sourcePath, specifier);
  return targetPath === targetRoot || targetPath?.startsWith(`${targetRoot}/`) === true;
}
