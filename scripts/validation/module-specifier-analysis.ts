import * as ts from "typescript";

export interface ModuleSpecifierAnalysis {
  readonly diagnostics: readonly string[];
  readonly moduleSpecifiers: readonly string[];
  readonly valueModuleSpecifiers: readonly string[];
}

/** Parses one source text once and returns its stable module-specifier views. */
export function analyzeModuleSpecifiers(
  source: string,
  repositoryPath: string
): ModuleSpecifierAnalysis {
  const sourceFile = ts.createSourceFile(
    "layout-characterization.ts",
    source,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
  const diagnostics = syntaxDiagnostics(sourceFile, repositoryPath);
  if (diagnostics.length > 0) return emptyAnalysis(diagnostics);

  const moduleSpecifiers = new Set<string>();
  const valueModuleSpecifiers = new Set<string>();
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement)) {
      addStaticModuleSpecifier(moduleSpecifiers, statement.moduleSpecifier);
      if (statement.importClause === undefined || hasValueImportBinding(statement.importClause)) {
        addStaticModuleSpecifier(valueModuleSpecifiers, statement.moduleSpecifier);
      }
      continue;
    }
    if (ts.isExportDeclaration(statement)) {
      addStaticModuleSpecifier(moduleSpecifiers, statement.moduleSpecifier);
      if (!statement.isTypeOnly) {
        addStaticModuleSpecifier(valueModuleSpecifiers, statement.moduleSpecifier);
      }
    }
  }
  collectDynamicImportSpecifiers(sourceFile, moduleSpecifiers, valueModuleSpecifiers);
  return {
    diagnostics,
    moduleSpecifiers: [...moduleSpecifiers],
    valueModuleSpecifiers: [...valueModuleSpecifiers]
  };
}

/** Appends syntax diagnostics once while callers preserve their existing violation order. */
export function appendModuleSpecifierDiagnostics(
  violations: string[],
  analysis: ModuleSpecifierAnalysis
): void {
  for (const diagnostic of analysis.diagnostics) {
    if (!violations.includes(diagnostic)) violations.push(diagnostic);
  }
}

function emptyAnalysis(diagnostics: readonly string[]): ModuleSpecifierAnalysis {
  return {
    diagnostics,
    moduleSpecifiers: [],
    valueModuleSpecifiers: []
  };
}

function syntaxDiagnostics(sourceFile: ts.SourceFile, repositoryPath: string): readonly string[] {
  const parseDiagnostics: unknown = Reflect.get(sourceFile, "parseDiagnostics");
  if (!Array.isArray(parseDiagnostics)) {
    return [
      `module-specifier-parse: ${repositoryPath}: TypeScript parser diagnostics are unavailable`
    ];
  }
  return parseDiagnostics.map((diagnostic) =>
    syntaxDiagnostic(sourceFile, repositoryPath, diagnostic)
  );
}

function syntaxDiagnostic(
  sourceFile: ts.SourceFile,
  repositoryPath: string,
  diagnostic: unknown
): string {
  const diagnosticRecord =
    typeof diagnostic === "object" && diagnostic !== null ? diagnostic : undefined;
  const diagnosticStart: unknown =
    diagnosticRecord === undefined ? undefined : Reflect.get(diagnosticRecord, "start");
  const start = typeof diagnosticStart === "number" ? diagnosticStart : 0;
  const position = sourceFile.getLineAndCharacterOfPosition(start);
  const diagnosticCode: unknown =
    diagnosticRecord === undefined ? undefined : Reflect.get(diagnosticRecord, "code");
  const code = typeof diagnosticCode === "number" ? ` TS${diagnosticCode}` : "";
  return `module-specifier-parse: ${repositoryPath}:${position.line + 1}:${position.character + 1}: syntax error${code}`;
}

export function hasValueImportBinding(importClause: ts.ImportClause | undefined): boolean {
  if (importClause === undefined || importClause.phaseModifier === ts.SyntaxKind.TypeKeyword) {
    return false;
  }
  if (importClause.name !== undefined) return true;
  if (importClause.namedBindings === undefined) return false;
  if (ts.isNamespaceImport(importClause.namedBindings)) return true;
  return importClause.namedBindings.elements.some((element) => !element.isTypeOnly);
}

function addStaticModuleSpecifier(
  specifiers: Set<string>,
  moduleSpecifier: ts.Expression | undefined
): void {
  const specifier = staticModuleSpecifier(moduleSpecifier);
  if (specifier !== undefined) specifiers.add(specifier);
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

function collectDynamicImportSpecifiers(
  node: ts.Node,
  moduleSpecifiers: Set<string>,
  valueModuleSpecifiers: Set<string>
): void {
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length > 0
  ) {
    const [moduleSpecifier] = node.arguments;
    if (moduleSpecifier !== undefined) {
      addStaticModuleSpecifier(moduleSpecifiers, moduleSpecifier);
      addStaticModuleSpecifier(valueModuleSpecifiers, moduleSpecifier);
    }
  }
  ts.forEachChild(node, (child) =>
    collectDynamicImportSpecifiers(child, moduleSpecifiers, valueModuleSpecifiers)
  );
}
