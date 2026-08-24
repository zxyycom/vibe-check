import * as ts from "typescript";

interface ModuleSpecifierRange {
  readonly end: number;
  readonly text: string;
  readonly start: number;
}

/** Rewrites only relative ESM module specifiers that TypeScript emitted with a .js extension. */
export function rewriteRelativeEsmModuleExtensions(input: {
  readonly fileName: string;
  readonly source: string;
}): string {
  const replacements = relativeEsmModuleSpecifierRanges(input)
    .filter((specifier) => specifier.text.endsWith(".js"))
    .sort((left, right) => right.start - left.start);
  let rewritten = input.source;
  for (const specifier of replacements) {
    rewritten = `${rewritten.slice(0, specifier.start)}${JSON.stringify(
      `${specifier.text.slice(0, -".js".length)}.mjs`
    )}${rewritten.slice(specifier.end)}`;
  }
  return rewritten;
}

/** Returns every relative ESM static, re-export, and dynamic module specifier in a source file. */
export function relativeEsmModuleSpecifiers(input: {
  readonly fileName: string;
  readonly source: string;
}): readonly string[] {
  return Object.freeze(relativeEsmModuleSpecifierRanges(input).map((specifier) => specifier.text));
}

function relativeEsmModuleSpecifierRanges(input: {
  readonly fileName: string;
  readonly source: string;
}): readonly ModuleSpecifierRange[] {
  assertValidEmittedJavaScript(input);
  const sourceFile = ts.createSourceFile(
    input.fileName,
    input.source,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.JS
  );
  const specifiers: ModuleSpecifierRange[] = [];
  const visit = (node: ts.Node): void => {
    const moduleSpecifier = esmModuleSpecifier(node);
    if (moduleSpecifier !== undefined && isRelativeSpecifier(moduleSpecifier.text)) {
      specifiers.push(
        Object.freeze({
          end: moduleSpecifier.end,
          start: moduleSpecifier.getStart(sourceFile),
          text: moduleSpecifier.text
        })
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return Object.freeze(specifiers);
}

function assertValidEmittedJavaScript(input: {
  readonly fileName: string;
  readonly source: string;
}): void {
  const diagnostic = ts
    .transpileModule(input.source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ESNext },
      fileName: input.fileName,
      reportDiagnostics: true
    })
    .diagnostics?.find((item) => item.category === ts.DiagnosticCategory.Error);
  if (diagnostic !== undefined) {
    throw new Error(
      `could not parse emitted ESM module ${input.fileName}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
    );
  }
}

function esmModuleSpecifier(node: ts.Node): ts.StringLiteral | undefined {
  if (
    (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
    node.moduleSpecifier !== undefined &&
    ts.isStringLiteral(node.moduleSpecifier)
  ) {
    return node.moduleSpecifier;
  }
  if (
    ts.isCallExpression(node) &&
    node.expression.kind === ts.SyntaxKind.ImportKeyword &&
    node.arguments.length === 1 &&
    ts.isStringLiteral(node.arguments[0])
  ) {
    return node.arguments[0];
  }
  return undefined;
}

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}
