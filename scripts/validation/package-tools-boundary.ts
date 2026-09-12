import { existsSync } from "node:fs";
import { join } from "node:path";

import * as ts from "typescript";

import { validateCoreClosure, validateCoreNoEmit } from "./package-tools-core-closure.ts";
import {
  collectModuleEdges,
  isProductionPath,
  isUnder,
  productionSourceFilesUnder,
  repositoryRelativePath,
  resolveModule,
  type ModuleEdge,
  type ResolvedModule
} from "./package-tools-module-graph.ts";

const PACKAGE_TOOLS_DIRECTORY = "src/package-tools";
const PACKAGE_ENTRY_PATH = "src/index.ts";
const ALLOWED_EXTERNAL_MODULES = new Set(["node:crypto", "node:fs", "node:path"]);

interface PublicSymbol {
  readonly symbol: ts.Symbol;
  readonly type: boolean;
  readonly value: boolean;
}

interface BoundaryValidationInput {
  readonly checker: ts.TypeChecker;
  readonly edge: ModuleEdge;
  readonly options: ts.CompilerOptions;
  readonly publicSymbols: readonly PublicSymbol[];
  readonly repositoryPath: string;
  readonly root: string;
  readonly sourceFile: ts.SourceFile;
  readonly violations: string[];
}

/** Enforces that optional package tools depend only on public Product identities. */
export function validatePackageToolsBoundary(root: string, violations: string[]): void {
  const toolFiles = productionSourceFilesUnder(root, PACKAGE_TOOLS_DIRECTORY);
  if (toolFiles.length === 0) return;

  const options = compilerOptions(root, violations);
  const program = ts.createProgram({
    options,
    rootNames: productionSourceFilesUnder(root, "src")
  });
  const checker = program.getTypeChecker();
  const publicSymbols = publicSymbolsFromEntry(root, program, checker, violations);

  for (const sourcePath of toolFiles) {
    const sourceFile = sourceFileFor(program, sourcePath, root, violations);
    if (sourceFile === undefined) continue;
    const repositoryPath = repositoryRelativePath(root, sourcePath);
    const edges = collectModuleEdges(sourceFile, {
      codePrefix: "package-tools",
      repositoryPath,
      strict: true,
      violations
    });
    for (const edge of edges) {
      validateToolEdge({
        checker,
        edge,
        options,
        publicSymbols,
        repositoryPath,
        root,
        sourceFile,
        violations
      });
    }
  }

  validateCoreClosure(root, options, violations);
}

/** Runs the Core-only TypeScript no-emit proof after the dependency closure is closed. */
export function validatePackageToolsCoreNoEmit(root: string): number {
  const violations: string[] = [];
  const options = compilerOptions(root, violations);
  const rootNames = validateCoreClosure(root, options, violations);
  validateCoreNoEmit(rootNames, options, violations);
  if (violations.length > 0) {
    throw new Error(`package-tools Core no-emit validation failed:\n${violations.join("\n")}`);
  }
  return rootNames.length;
}

function compilerOptions(root: string, violations: string[]): ts.CompilerOptions {
  const configPath = join(root, "tsconfig.json");
  if (!existsSync(configPath)) return fallbackCompilerOptions();

  const loaded = ts.readConfigFile(configPath, (fileName) => ts.sys.readFile(fileName));
  if (loaded.error !== undefined) {
    appendTsconfigDiagnostic(violations, configPath, loaded.error);
    return fallbackCompilerOptions();
  }
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, root, undefined, configPath);
  for (const diagnostic of parsed.errors)
    appendTsconfigDiagnostic(violations, configPath, diagnostic);
  return { ...fallbackCompilerOptions(), ...parsed.options, noEmit: true, skipLibCheck: true };
}

function fallbackCompilerOptions(): ts.CompilerOptions {
  return {
    allowImportingTsExtensions: true,
    allowUnreachableCode: false,
    exactOptionalPropertyTypes: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    noImplicitOverride: true,
    noImplicitReturns: true,
    noUncheckedIndexedAccess: true,
    rewriteRelativeImportExtensions: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
    types: ["node"],
    verbatimModuleSyntax: true
  };
}

function appendTsconfigDiagnostic(
  violations: string[],
  configPath: string,
  diagnostic: ts.Diagnostic
): void {
  violations.push(
    `package-tools-tsconfig: ${configPath}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`
  );
}

function publicSymbolsFromEntry(
  root: string,
  program: ts.Program,
  checker: ts.TypeChecker,
  violations: string[]
): readonly PublicSymbol[] {
  const entry = sourceFileFor(program, join(root, PACKAGE_ENTRY_PATH), root, violations);
  if (entry === undefined) return [];
  const moduleSymbol = checker.getSymbolAtLocation(entry);
  if (moduleSymbol === undefined) {
    violations.push(`package-tools-public-entry: ${PACKAGE_ENTRY_PATH} has no module symbol`);
    return [];
  }
  const exportsByName = new Map(
    checker.getExportsOfModule(moduleSymbol).map((symbol) => [symbol.getName(), symbol] as const)
  );
  return namedEntryExports(entry).flatMap((entryExport) =>
    publicSymbolForExport(checker, exportsByName, entryExport, violations)
  );
}

function namedEntryExports(sourceFile: ts.SourceFile): readonly EntryExport[] {
  return sourceFile.statements.flatMap((statement) => {
    if (!ts.isExportDeclaration(statement)) return [];
    const exportClause = statement.exportClause;
    if (exportClause === undefined || !ts.isNamedExports(exportClause)) return [];
    return exportClause.elements.map((element) => ({
      exportedName: element.name.text,
      typeOnly: statement.isTypeOnly || element.isTypeOnly
    }));
  });
}

interface EntryExport {
  readonly exportedName: string;
  readonly typeOnly: boolean;
}

function publicSymbolForExport(
  checker: ts.TypeChecker,
  exportsByName: ReadonlyMap<string, ts.Symbol>,
  entryExport: EntryExport,
  violations: string[]
): readonly PublicSymbol[] {
  const exportedSymbol = exportsByName.get(entryExport.exportedName);
  if (exportedSymbol === undefined) {
    violations.push(
      `package-tools-public-entry: ${PACKAGE_ENTRY_PATH} cannot resolve export ${entryExport.exportedName}`
    );
    return [];
  }
  const symbol = resolveAlias(checker, exportedSymbol);
  return [
    {
      symbol,
      type: hasTypeIdentity(symbol),
      value: !entryExport.typeOnly && hasValueIdentity(symbol)
    }
  ];
}

function validateToolEdge(input: BoundaryValidationInput): void {
  const resolvedModule = resolveModule(
    input.root,
    input.sourceFile.fileName,
    input.edge.specifier,
    input.options
  );
  if (resolvedModule === undefined) {
    reportUnresolvedToolModule(input, input.edge.specifier);
    return;
  }
  if (resolvedModule.kind === "external") {
    if (!ALLOWED_EXTERNAL_MODULES.has(input.edge.specifier)) {
      reportUnresolvedToolModule(input, input.edge.specifier);
    }
    return;
  }
  validateWorkspaceToolEdge(input, resolvedModule);
}

function validateWorkspaceToolEdge(
  input: BoundaryValidationInput,
  resolvedModule: Extract<ResolvedModule, { readonly kind: "workspace" }>
): void {
  const targetPath = repositoryRelativePath(input.root, resolvedModule.sourcePath);
  if (!isProductionPath(targetPath)) {
    input.violations.push(
      `package-tools-imports-test-material: ${input.repositoryPath} -> ${input.edge.specifier}`
    );
    return;
  }
  if (isUnder(targetPath, PACKAGE_TOOLS_DIRECTORY)) return;
  if (!isUnder(targetPath, "src")) {
    input.violations.push(
      `package-tools-imports-nonproduct: ${input.repositoryPath} -> ${input.edge.specifier}`
    );
    return;
  }
  if (targetPath === PACKAGE_ENTRY_PATH) {
    input.violations.push(
      `package-tools-imports-public-entry: ${input.repositoryPath} -> ${input.edge.specifier}`
    );
    return;
  }
  for (const binding of input.edge.bindings)
    validateToolBinding(input, binding.name, binding.typeOnly);
}

function validateToolBinding(
  input: BoundaryValidationInput,
  bindingName: ts.ModuleExportName,
  typeOnly: boolean
): void {
  const importedSymbol = input.checker.getSymbolAtLocation(bindingName);
  if (importedSymbol === undefined) {
    input.violations.push(
      `package-tools-unresolved-symbol: ${input.repositoryPath} -> ${input.edge.specifier} (${bindingName.text})`
    );
    return;
  }
  const publicSymbol = input.publicSymbols.find(
    (candidate) => candidate.symbol === resolveAlias(input.checker, importedSymbol)
  );
  if (publicSymbol === undefined) {
    input.violations.push(
      `package-tools-private-product-symbol: ${input.repositoryPath} -> ${input.edge.specifier} (${bindingName.text})`
    );
    return;
  }
  if (typeOnly ? !publicSymbol.type : !publicSymbol.value) {
    input.violations.push(
      `package-tools-public-symbol-kind: ${input.repositoryPath} -> ${input.edge.specifier} (${bindingName.text})`
    );
  }
}

function reportUnresolvedToolModule(
  input: Readonly<{ readonly repositoryPath: string; readonly violations: string[] }>,
  specifier: string
): void {
  input.violations.push(
    `${unresolvedToolModuleCode(specifier)}: ${input.repositoryPath} -> ${specifier}`
  );
}

function unresolvedToolModuleCode(specifier: string): string {
  if (specifier.startsWith(".")) return "package-tools-unresolved-repository-import";
  return "package-tools-unapproved-external-import";
}

function sourceFileFor(
  program: ts.Program,
  sourcePath: string,
  root: string,
  violations: string[]
): ts.SourceFile | undefined {
  const sourceFile = program.getSourceFile(sourcePath);
  if (sourceFile !== undefined) return sourceFile;
  violations.push(
    `package-tools-program-source: ${repositoryRelativePath(root, sourcePath)} is unavailable`
  );
  return undefined;
}

function resolveAlias(checker: ts.TypeChecker, symbol: ts.Symbol): ts.Symbol {
  return (symbol.flags & ts.SymbolFlags.Alias) === 0 ? symbol : checker.getAliasedSymbol(symbol);
}

function hasTypeIdentity(symbol: ts.Symbol): boolean {
  return (symbol.flags & ts.SymbolFlags.Type) !== 0;
}

function hasValueIdentity(symbol: ts.Symbol): boolean {
  return (symbol.flags & ts.SymbolFlags.Value) !== 0;
}
