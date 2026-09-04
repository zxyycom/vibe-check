import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";

import {
  isFixtureSourcePath,
  relativePath,
  resolvedRelativeModulePath
} from "./import-boundaries.ts";
import {
  analyzeModuleSpecifiers,
  appendModuleSpecifierDiagnostics,
  hasValueImportBinding
} from "./module-specifier-analysis.ts";

const FUNCTION_METRICS_DIRECTORY = "src/package-checks/function-metrics";
const FUNCTION_METRICS_ANALYZER_DIRECTORY = `${FUNCTION_METRICS_DIRECTORY}/analyzer`;
const FUNCTION_METRICS_ADAPTER_PATH = `${FUNCTION_METRICS_DIRECTORY}/analyzer-adapter.ts`;
const FUNCTION_METRICS_PORT_FACADE_PATH = `${FUNCTION_METRICS_ANALYZER_DIRECTORY}/port-facade.ts`;
const FUNCTION_METRICS_WORKER_PATH = `${FUNCTION_METRICS_DIRECTORY}/analyzer-worker.ts`;
const FUNCTION_METRICS_REQUIRED_ADAPTER_CONSUMERS = Object.freeze([
  FUNCTION_METRICS_WORKER_PATH,
  `${FUNCTION_METRICS_DIRECTORY}/target-files.ts`
]);

interface AnalyzerBoundaryInput {
  readonly repositoryPath: string;
  readonly root: string;
  readonly sourcePath: string;
  readonly violations: string[];
}

interface ResolvedModuleSpecifier {
  readonly specifier: string;
  readonly targetPath: string;
}

/**
 * Enforces the private Lizard-port path policy without inferring a caller's
 * intent from import spelling. Port-root tests may inspect same-root internals;
 * every Product test outside that root must stay at the adapter boundary.
 */
export function validateFunctionMetricsAnalyzerBoundary(
  root: string,
  sourceFiles: readonly string[],
  violations: string[]
): void {
  validateAnalyzerBoundaryFiles(root, violations);
  const portFacadeConsumers = new Set<string>();
  for (const sourcePath of sourceFiles) {
    const repositoryPath = relativePath(root, sourcePath);
    if (isFixtureSourcePath(repositoryPath)) continue;
    const analysis = analyzeModuleSpecifiers(readFileSync(sourcePath, "utf8"), repositoryPath);
    appendModuleSpecifierDiagnostics(violations, analysis);
    const input: AnalyzerBoundaryInput = { repositoryPath, root, sourcePath, violations };
    const resolvedSpecifiers = resolveModuleSpecifiers(root, sourcePath, analysis.moduleSpecifiers);

    if (isFunctionMetricsAnalyzerPath(repositoryPath)) {
      validateAnalyzerInternalImports(input, resolvedSpecifiers);
      continue;
    }
    if (isProductTestPath(repositoryPath)) {
      validateProductTestAnalyzerImports(input, resolvedSpecifiers);
      continue;
    }
    if (isProductProductionPath(repositoryPath)) {
      validateProductAnalyzerImports(input, resolvedSpecifiers, portFacadeConsumers);
      continue;
    }
    validateNonProductAnalyzerImports(input, resolvedSpecifiers);
  }

  validatePortFacadeConsumers(portFacadeConsumers, violations);
  validateRequiredFunctionMetricsAdapterImports(root, sourceFiles, violations);
  validateFunctionMetricsPrivatePublicEntry(root, violations);
}

function validateAnalyzerBoundaryFiles(root: string, violations: string[]): void {
  if (!existsSync(join(root, FUNCTION_METRICS_PORT_FACADE_PATH))) {
    violations.push(
      `function-metrics-port-facade: ${FUNCTION_METRICS_PORT_FACADE_PATH} is missing`
    );
  }
  if (!existsSync(join(root, FUNCTION_METRICS_ADAPTER_PATH))) {
    violations.push(
      `function-metrics-analyzer-adapter: ${FUNCTION_METRICS_ADAPTER_PATH} is missing`
    );
  }
}

function resolveModuleSpecifiers(
  root: string,
  sourcePath: string,
  specifiers: readonly string[]
): readonly ResolvedModuleSpecifier[] {
  return specifiers.flatMap((specifier) => {
    const targetPath = resolvedRelativeModulePath(root, sourcePath, specifier);
    return targetPath === undefined ? [] : [{ specifier, targetPath }];
  });
}

function validateAnalyzerInternalImports(
  input: AnalyzerBoundaryInput,
  resolvedSpecifiers: readonly ResolvedModuleSpecifier[]
): void {
  for (const { specifier, targetPath } of resolvedSpecifiers) {
    if (!isFunctionMetricsAnalyzerPath(targetPath)) {
      input.violations.push(
        `function-metrics-analyzer-imports-product: ${input.repositoryPath} -> ${specifier}`
      );
    }
  }
}

function validateProductTestAnalyzerImports(
  input: AnalyzerBoundaryInput,
  resolvedSpecifiers: readonly ResolvedModuleSpecifier[]
): void {
  for (const { specifier, targetPath } of resolvedSpecifiers) {
    if (isFunctionMetricsAnalyzerPath(targetPath)) {
      input.violations.push(
        `function-metrics-test-deep-imports-analyzer: ${input.repositoryPath} -> ${specifier}`
      );
    }
  }
}

function validateProductAnalyzerImports(
  input: AnalyzerBoundaryInput,
  resolvedSpecifiers: readonly ResolvedModuleSpecifier[],
  portFacadeConsumers: Set<string>
): void {
  for (const { specifier, targetPath } of resolvedSpecifiers) {
    if (!isFunctionMetricsAnalyzerPath(targetPath)) continue;
    if (
      input.repositoryPath === FUNCTION_METRICS_ADAPTER_PATH &&
      targetPath === FUNCTION_METRICS_PORT_FACADE_PATH
    ) {
      portFacadeConsumers.add(input.repositoryPath);
      continue;
    }
    if (input.repositoryPath === FUNCTION_METRICS_ADAPTER_PATH) {
      input.violations.push(
        `function-metrics-adapter-deep-imports-analyzer: ${input.repositoryPath} -> ${specifier}`
      );
      continue;
    }
    if (input.repositoryPath === "src/index.ts") continue;
    input.violations.push(
      `function-metrics-product-deep-imports-analyzer: ${input.repositoryPath} -> ${specifier}`
    );
  }
}

function validateNonProductAnalyzerImports(
  input: AnalyzerBoundaryInput,
  resolvedSpecifiers: readonly ResolvedModuleSpecifier[]
): void {
  for (const { specifier, targetPath } of resolvedSpecifiers) {
    if (isFunctionMetricsAnalyzerPath(targetPath)) {
      input.violations.push(
        `function-metrics-nonproduct-imports-analyzer: ${input.repositoryPath} -> ${specifier}`
      );
    }
  }
}

function validatePortFacadeConsumers(portFacadeConsumers: Set<string>, violations: string[]): void {
  const expectedPortFacadeConsumers = [FUNCTION_METRICS_ADAPTER_PATH];
  const actualPortFacadeConsumers = [...portFacadeConsumers].sort();
  if (
    actualPortFacadeConsumers.length !== expectedPortFacadeConsumers.length ||
    actualPortFacadeConsumers[0] !== expectedPortFacadeConsumers[0]
  ) {
    violations.push(
      `function-metrics-port-facade-consumers: expected only ${FUNCTION_METRICS_ADAPTER_PATH} to import ${FUNCTION_METRICS_PORT_FACADE_PATH}; found ${actualPortFacadeConsumers.join(", ") || "none"}`
    );
  }
}

function validateRequiredFunctionMetricsAdapterImports(
  root: string,
  sourceFiles: readonly string[],
  violations: string[]
): void {
  const sourcePaths = new Map(
    sourceFiles.map((sourcePath) => [relativePath(root, sourcePath), sourcePath])
  );
  for (const consumerPath of FUNCTION_METRICS_REQUIRED_ADAPTER_CONSUMERS) {
    const sourcePath = sourcePaths.get(consumerPath);
    if (sourcePath === undefined) {
      violations.push(`function-metrics-required-adapter-import: ${consumerPath} is missing`);
      continue;
    }
    if (!hasFunctionMetricsAdapterValueImport(root, sourcePath)) {
      violations.push(
        `function-metrics-required-adapter-import: ${consumerPath} must value-import ${FUNCTION_METRICS_ADAPTER_PATH}`
      );
    }
  }
}

/** Required consumers keep this predicate independent from parse-failed extraction views. */
function hasFunctionMetricsAdapterValueImport(root: string, sourcePath: string): boolean {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    readFileSync(sourcePath, "utf8"),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
  return sourceFile.statements.some((statement) => {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) {
      return false;
    }
    if (!hasValueImportBinding(statement.importClause)) return false;
    return (
      resolvedRelativeModulePath(root, sourcePath, statement.moduleSpecifier.text) ===
      FUNCTION_METRICS_ADAPTER_PATH
    );
  });
}

function validateFunctionMetricsPrivatePublicEntry(root: string, violations: string[]): void {
  const packageEntryPath = join(root, "src/index.ts");
  if (!existsSync(packageEntryPath)) {
    violations.push("function-metrics-private-public-entry: src/index.ts is missing");
    return;
  }
  const analysis = analyzeModuleSpecifiers(readFileSync(packageEntryPath, "utf8"), "src/index.ts");
  appendModuleSpecifierDiagnostics(violations, analysis);
  for (const specifier of analysis.moduleSpecifiers) {
    const targetPath = resolvedRelativeModulePath(root, packageEntryPath, specifier);
    if (targetPath !== undefined && isFunctionMetricsPrivatePath(targetPath)) {
      violations.push(`function-metrics-private-public-entry: src/index.ts -> ${specifier}`);
    }
  }
}

function isFunctionMetricsAnalyzerPath(repositoryPath: string): boolean {
  return (
    repositoryPath === FUNCTION_METRICS_ANALYZER_DIRECTORY ||
    repositoryPath.startsWith(`${FUNCTION_METRICS_ANALYZER_DIRECTORY}/`)
  );
}

function isFunctionMetricsPrivatePath(repositoryPath: string): boolean {
  return (
    isFunctionMetricsAnalyzerPath(repositoryPath) ||
    repositoryPath === FUNCTION_METRICS_ADAPTER_PATH ||
    repositoryPath === FUNCTION_METRICS_WORKER_PATH
  );
}

function isProductProductionPath(repositoryPath: string): boolean {
  return repositoryPath.startsWith("src/") && !isProductTestPath(repositoryPath);
}

function isProductTestPath(repositoryPath: string): boolean {
  return (
    repositoryPath.startsWith("src/") &&
    (repositoryPath.endsWith(".test.ts") || repositoryPath.endsWith(".test-support.ts"))
  );
}
