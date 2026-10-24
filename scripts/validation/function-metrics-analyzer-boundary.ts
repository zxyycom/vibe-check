import {
  isFixtureSourcePath,
  relativePath,
  resolvedRelativeModulePath
} from "./import-boundaries.ts";
import {
  readModuleSpecifierAnalysis,
  appendModuleSpecifierDiagnostics,
  type ModuleSpecifierAnalysis
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
  violations: string[],
  analysesBySourcePath = new Map<string, ModuleSpecifierAnalysis>()
): void {
  const modules = new Map<string, ModuleSpecifierAnalysis>();
  for (const sourcePath of sourceFiles) {
    const repositoryPath = relativePath(root, sourcePath);
    if (isFixtureSourcePath(repositoryPath)) continue;
    modules.set(
      repositoryPath,
      readModuleSpecifierAnalysis({
        sourcePath,
        repositoryPath,
        analysesBySourcePath
      })
    );
  }
  validateFunctionMetricsAnalyzerModules(modules, violations);
}

/** Applies the private port's cross-module dependency policy to the discovered source analyses. */
export function validateFunctionMetricsAnalyzerModules(
  modules: ReadonlyMap<string, ModuleSpecifierAnalysis>,
  violations: string[]
): void {
  validateAnalyzerBoundaryFiles(modules, violations);
  const portFacadeConsumers = new Set<string>();
  for (const [repositoryPath, analysis] of modules) {
    if (isFixtureSourcePath(repositoryPath)) continue;
    appendModuleSpecifierDiagnostics(violations, analysis);
    const input: AnalyzerBoundaryInput = { repositoryPath, violations };
    const resolvedSpecifiers = resolveModuleSpecifiers(repositoryPath, analysis.moduleSpecifiers);

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
  validateRequiredFunctionMetricsAdapterImports(modules, violations);
  validateFunctionMetricsPrivatePublicEntry(modules, violations);
}

function validateAnalyzerBoundaryFiles(
  modules: ReadonlyMap<string, ModuleSpecifierAnalysis>,
  violations: string[]
): void {
  if (!modules.has(FUNCTION_METRICS_PORT_FACADE_PATH)) {
    violations.push(
      `function-metrics-port-facade: ${FUNCTION_METRICS_PORT_FACADE_PATH} is missing`
    );
  }
  if (!modules.has(FUNCTION_METRICS_ADAPTER_PATH)) {
    violations.push(
      `function-metrics-analyzer-adapter: ${FUNCTION_METRICS_ADAPTER_PATH} is missing`
    );
  }
}

function resolveModuleSpecifiers(
  repositoryPath: string,
  specifiers: readonly string[]
): readonly ResolvedModuleSpecifier[] {
  return specifiers.flatMap((specifier) => {
    const targetPath = resolvedRelativeModulePath(repositoryPath, specifier);
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
  modules: ReadonlyMap<string, ModuleSpecifierAnalysis>,
  violations: string[]
): void {
  for (const consumerPath of FUNCTION_METRICS_REQUIRED_ADAPTER_CONSUMERS) {
    const analysis = modules.get(consumerPath);
    if (analysis === undefined) {
      violations.push(`function-metrics-required-adapter-import: ${consumerPath} is missing`);
      continue;
    }
    if (
      !analysis.valueImportSpecifiers.some(
        (specifier) =>
          resolvedRelativeModulePath(consumerPath, specifier) === FUNCTION_METRICS_ADAPTER_PATH
      )
    ) {
      violations.push(
        `function-metrics-required-adapter-import: ${consumerPath} must value-import ${FUNCTION_METRICS_ADAPTER_PATH}`
      );
    }
  }
}

function validateFunctionMetricsPrivatePublicEntry(
  modules: ReadonlyMap<string, ModuleSpecifierAnalysis>,
  violations: string[]
): void {
  const analysis = modules.get("src/index.ts");
  if (analysis === undefined) {
    violations.push("function-metrics-private-public-entry: src/index.ts is missing");
    return;
  }
  appendModuleSpecifierDiagnostics(violations, analysis);
  for (const specifier of analysis.moduleSpecifiers) {
    const targetPath = resolvedRelativeModulePath("src/index.ts", specifier);
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
