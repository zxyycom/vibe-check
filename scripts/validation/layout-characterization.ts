import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

import { walkFiles } from "../repository-files/files.ts";
import { FILE_SYSTEM } from "./documentation/task-contract.ts";
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
const PRIVATE_PROCESS_EXECUTION_FILES = new Set([
  "scripts/process-execution/contract.ts",
  "scripts/process-execution/failure.ts",
  "scripts/process-execution/plain-text-environment.ts",
  "scripts/process-execution/result.ts",
  "scripts/process-execution/runner.ts"
]);
const FUNCTION_METRICS_DIRECTORY = "src/package-checks/function-metrics";
const FUNCTION_METRICS_ANALYZER_DIRECTORY = `${FUNCTION_METRICS_DIRECTORY}/analyzer`;
const FUNCTION_METRICS_ADAPTER_PATH = `${FUNCTION_METRICS_DIRECTORY}/analyzer-adapter.ts`;
const FUNCTION_METRICS_PORT_FACADE_PATH = `${FUNCTION_METRICS_ANALYZER_DIRECTORY}/port-facade.ts`;
const FUNCTION_METRICS_WORKER_PATH = `${FUNCTION_METRICS_DIRECTORY}/analyzer-worker.ts`;
const FUNCTION_METRICS_REQUIRED_ADAPTER_CONSUMERS = Object.freeze([
  FUNCTION_METRICS_WORKER_PATH,
  `${FUNCTION_METRICS_DIRECTORY}/target-files.ts`
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

function validateImportBoundaries(
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

/**
 * Enforces the private Lizard-port path policy without inferring a caller's
 * intent from import spelling. Port-root tests may inspect same-root internals;
 * every Product test outside that root must stay at the adapter boundary.
 */
function validateFunctionMetricsAnalyzerBoundary(
  root: string,
  sourceFiles: readonly string[],
  violations: string[]
): void {
  const portFacade = join(root, FUNCTION_METRICS_PORT_FACADE_PATH);
  const adapter = join(root, FUNCTION_METRICS_ADAPTER_PATH);
  if (!existsSync(portFacade)) {
    violations.push(
      `function-metrics-port-facade: ${FUNCTION_METRICS_PORT_FACADE_PATH} is missing`
    );
  }
  if (!existsSync(adapter)) {
    violations.push(
      `function-metrics-analyzer-adapter: ${FUNCTION_METRICS_ADAPTER_PATH} is missing`
    );
  }

  const portFacadeConsumers = new Set<string>();
  for (const sourcePath of sourceFiles) {
    const repositoryPath = relativePath(root, sourcePath);
    if (isFixtureSourcePath(repositoryPath)) continue;
    const source = readFileSync(sourcePath, "utf8");
    const input: ImportBoundaryInput = {
      repositoryPath,
      root,
      source,
      sourcePath,
      violations
    };
    const resolvedSpecifiers = moduleSpecifiers(source, repositoryPath, violations).flatMap(
      (specifier) => {
        const targetPath = resolvedRelativeModulePath(root, sourcePath, specifier);
        return targetPath === undefined ? [] : [{ specifier, targetPath }];
      }
    );

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

  validateRequiredFunctionMetricsAdapterImports(root, sourceFiles, violations);
  validateFunctionMetricsPrivatePublicEntry(root, violations);
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
    const importsAdapter = hasFunctionMetricsAdapterValueImport(root, sourcePath);
    if (!importsAdapter) {
      violations.push(
        `function-metrics-required-adapter-import: ${consumerPath} must value-import ${FUNCTION_METRICS_ADAPTER_PATH}`
      );
    }
  }
}

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

function hasValueImportBinding(importClause: ts.ImportClause | undefined): boolean {
  if (importClause === undefined || importClause.phaseModifier === ts.SyntaxKind.TypeKeyword) {
    return false;
  }
  if (importClause.name !== undefined) return true;
  if (importClause.namedBindings === undefined) return false;
  if (ts.isNamespaceImport(importClause.namedBindings)) return true;
  return importClause.namedBindings.elements.some((element) => !element.isTypeOnly);
}

function validateAnalyzerInternalImports(
  input: ImportBoundaryInput,
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
  input: ImportBoundaryInput,
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
  input: ImportBoundaryInput,
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
  input: ImportBoundaryInput,
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

function validateFunctionMetricsPrivatePublicEntry(root: string, violations: string[]): void {
  const packageEntryPath = join(root, "src/index.ts");
  if (!existsSync(packageEntryPath)) {
    violations.push("function-metrics-private-public-entry: src/index.ts is missing");
    return;
  }
  const packageEntry = readFileSync(packageEntryPath, "utf8");
  for (const specifier of moduleSpecifiers(packageEntry, "src/index.ts", violations)) {
    const targetPath = resolvedRelativeModulePath(root, packageEntryPath, specifier);
    if (targetPath !== undefined && isFunctionMetricsPrivatePath(targetPath)) {
      violations.push(`function-metrics-private-public-entry: src/index.ts -> ${specifier}`);
    }
  }
}

interface ResolvedModuleSpecifier {
  readonly specifier: string;
  readonly targetPath: string;
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

/** Fixture text may deliberately be malformed source rather than parsable TypeScript. */
function isFixtureSourcePath(repositoryPath: string): boolean {
  return repositoryPath.includes("/fixtures/");
}

function validateProductImportsScripts(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("src/")) return;
  reportImportsUnder(
    input,
    valueModuleSpecifiers(input.source, input.repositoryPath, input.violations),
    "scripts",
    "product-imports-scripts"
  );
}

function validateProjectImportsProduct(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("scripts/project/")) return;
  reportImportsUnder(
    input,
    moduleSpecifiers(input.source, input.repositoryPath, input.violations),
    "src",
    "project-deep-imports-product"
  );
}

function validatePackageImportsProject(input: ImportBoundaryInput): void {
  if (!input.repositoryPath.startsWith("scripts/package/")) return;
  reportImportsUnder(
    input,
    moduleSpecifiers(input.source, input.repositoryPath, input.violations),
    "scripts/project",
    "package-imports-project"
  );
}

function validateEnvironmentImportsProcessExecution(input: ImportBoundaryInput): void {
  if (input.repositoryPath !== "scripts/environment/manage.ts") return;
  reportImportsUnder(
    input,
    moduleSpecifiers(input.source, input.repositoryPath, input.violations),
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
  for (const specifier of moduleSpecifiers(input.source, input.repositoryPath, input.violations)) {
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

function valueModuleSpecifiers(
  source: string,
  repositoryPath: string,
  violations: string[]
): readonly string[] {
  return moduleSpecifiers(source, repositoryPath, violations, { includeTypeOnly: false });
}

function moduleSpecifiers(
  source: string,
  repositoryPath: string,
  violations: string[],
  options: Readonly<{ readonly includeTypeOnly?: boolean }> = {}
): readonly string[] {
  const sourceFile = ts.createSourceFile(
    "layout-characterization.ts",
    source,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
  const parseDiagnostics: unknown = Reflect.get(sourceFile, "parseDiagnostics");
  if (!Array.isArray(parseDiagnostics)) {
    violations.push(
      `module-specifier-parse: ${repositoryPath}: TypeScript parser diagnostics are unavailable`
    );
    return [];
  }
  if (parseDiagnostics.length > 0) {
    for (let index = 0; index < parseDiagnostics.length; index += 1) {
      const diagnostic: unknown = Reflect.get(parseDiagnostics, index);
      const diagnosticRecord =
        typeof diagnostic === "object" && diagnostic !== null ? diagnostic : undefined;
      const diagnosticStart: unknown =
        diagnosticRecord === undefined ? undefined : Reflect.get(diagnosticRecord, "start");
      const start = typeof diagnosticStart === "number" ? diagnosticStart : 0;
      const position = sourceFile.getLineAndCharacterOfPosition(start);
      const diagnosticCode: unknown =
        diagnosticRecord === undefined ? undefined : Reflect.get(diagnosticRecord, "code");
      const code = typeof diagnosticCode === "number" ? ` TS${diagnosticCode}` : "";
      const violation = `module-specifier-parse: ${repositoryPath}:${position.line + 1}:${position.character + 1}: syntax error${code}`;
      if (!violations.includes(violation)) violations.push(violation);
    }
    return [];
  }
  const specifiers = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      if (
        options.includeTypeOnly === false &&
        statement.importClause !== undefined &&
        !hasValueImportBinding(statement.importClause)
      ) {
        continue;
      }
      addStringModuleSpecifier(specifiers, statement.moduleSpecifier);
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      if (options.includeTypeOnly === false && statement.isTypeOnly) continue;
      addStringModuleSpecifier(specifiers, statement.moduleSpecifier);
    }
  }
  collectDynamicImportSpecifiers(sourceFile, specifiers);
  return [...specifiers];
}

function addStringModuleSpecifier(
  specifiers: Set<string>,
  moduleSpecifier: ts.Expression | undefined
): void {
  const staticSpecifier = staticModuleSpecifier(moduleSpecifier);
  if (staticSpecifier !== undefined) specifiers.add(staticSpecifier);
}

function staticModuleSpecifier(expression: ts.Expression | undefined): string | undefined {
  if (expression === undefined) return undefined;
  const unwrapped = unwrapStaticModuleSpecifier(expression);
  return ts.isStringLiteral(unwrapped) || ts.isNoSubstitutionTemplateLiteral(unwrapped)
    ? unwrapped.text
    : undefined;
}

function unwrapStaticModuleSpecifier(expression: ts.Expression): ts.Expression {
  let unwrapped = expression;
  while (
    ts.isAsExpression(unwrapped) ||
    ts.isParenthesizedExpression(unwrapped) ||
    ts.isSatisfiesExpression(unwrapped) ||
    ts.isTypeAssertionExpression(unwrapped)
  ) {
    unwrapped = unwrapped.expression;
  }
  return unwrapped;
}

function collectDynamicImportSpecifiers(node: ts.Node, specifiers: Set<string>): void {
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length > 0
  ) {
    const [moduleSpecifier] = node.arguments;
    if (moduleSpecifier !== undefined) addStringModuleSpecifier(specifiers, moduleSpecifier);
  }
  ts.forEachChild(node, (child) => collectDynamicImportSpecifiers(child, specifiers));
}
