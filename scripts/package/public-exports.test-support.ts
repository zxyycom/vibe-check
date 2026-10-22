import assert from "node:assert/strict";
import { resolve } from "node:path";

import ts from "typescript";

/** Reads the real module graph; direct declarations, aliases and wildcard re-exports share TS symbol semantics. */
export function publicRootExportNames(entryPath: string): Readonly<{
  runtime: readonly string[];
  types: readonly string[];
}> {
  const graph = readRootExportGraph(entryPath);
  const typeOnlyWildcardNames = typeOnlyWildcardExportNames(graph);
  const runtime: string[] = [];
  const types: string[] = [];
  for (const symbol of graph.symbols) {
    const spaces = publicExportSpaces(graph.checker, symbol, typeOnlyWildcardNames);
    if (spaces.type) types.push(symbol.name);
    if (spaces.runtime) runtime.push(symbol.name);
  }
  return { runtime: runtime.sort(), types: types.sort() };
}

interface RootExportGraph {
  readonly checker: ts.TypeChecker;
  readonly source: ts.SourceFile;
  readonly symbols: readonly ts.Symbol[];
}

/** A validated root and its export table belong to the same compiler/checker invocation. */
function readRootExportGraph(entryPath: string): RootExportGraph {
  const program = ts.createProgram([resolve(entryPath)], {
    allowImportingTsExtensions: true,
    allowJs: true,
    module: ts.ModuleKind.NodeNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    noEmit: true,
    // Inventory resolves symbol identities only; full authoring types have their own compiler acceptance.
    noLib: true,
    strict: true,
    target: ts.ScriptTarget.ESNext,
    types: []
  });
  const source = program.getSourceFile(resolve(entryPath));
  assert.ok(source, `missing root module: ${entryPath}`);
  const diagnostics = [
    ...program.getSyntacticDiagnostics(source),
    ...program.getSemanticDiagnostics(source)
  ];
  assert.deepEqual(
    diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")),
    []
  );
  const checker = program.getTypeChecker();
  const module = checker.getSymbolAtLocation(source);
  assert.ok(module, `root must be an external module: ${entryPath}`);
  return { checker, source, symbols: checker.getExportsOfModule(module) };
}

/** Wildcard type edges do not attach a named ExportSpecifier to each provider symbol. */
function typeOnlyWildcardExportNames(graph: RootExportGraph): ReadonlySet<string> {
  const names = new Set<string>();
  for (const statement of graph.source.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.isTypeOnly ||
      statement.exportClause !== undefined
    )
      continue;
    assert.ok(statement.moduleSpecifier, "type-only wildcard must name its provider");
    const provider = graph.checker.getSymbolAtLocation(statement.moduleSpecifier);
    assert.ok(provider, "type-only wildcard must resolve its provider");
    for (const exported of graph.checker.getExportsOfModule(provider)) names.add(exported.name);
  }
  return names;
}

/** A symbol can inhabit both spaces; explicit type-only syntax suppresses its runtime binding. */
function publicExportSpaces(
  checker: ts.TypeChecker,
  symbol: ts.Symbol,
  typeOnlyWildcardNames: ReadonlySet<string>
): Readonly<{ runtime: boolean; type: boolean }> {
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const typeOnly =
    typeOnlyWildcardNames.has(symbol.name) ||
    (symbol.declarations?.some(isTypeOnlyNamedExport) ?? false);
  const type = typeOnly || (target.flags & ts.SymbolFlags.Type) !== 0;
  const runtime = !typeOnly && (target.flags & ts.SymbolFlags.Value) !== 0;
  assert.ok(type || runtime, `unsupported root export: ${symbol.name}`);
  return { runtime, type };
}

function isTypeOnlyNamedExport(declaration: ts.Declaration): boolean {
  return (
    ts.isExportSpecifier(declaration) &&
    (declaration.isTypeOnly || declaration.parent.parent.isTypeOnly)
  );
}
