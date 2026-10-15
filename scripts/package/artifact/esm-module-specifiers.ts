import { resolve } from "node:path";

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
  return rewriteModuleSpecifierTokens(input.source, relativeJavaScriptSpecifierRanges(input));
}

/**
 * Rewrites the one source-tree Worker URL only after its separately emitted Worker root exists.
 *
 * This deliberately does not normalize ordinary `new URL(...)` values: package runtime code may
 * carry URLs with source-level semantics. The artifact builder invokes it only for emitted
 * `function-metrics/analyzer-worker-port.js` and it rejects any compiler-shape drift instead of
 * guessing.
 */
export function rewriteFunctionMetricsWorkerUrl(input: {
  readonly fileName: string;
  readonly source: string;
}): string {
  const sourceFile = parseEmittedJavaScript(input);
  const matches: ModuleSpecifierRange[] = [];
  const visit = (node: ts.Node): void => {
    if (isFunctionMetricsWorkerUrl(node)) {
      const specifier = node.arguments?.[0];
      if (specifier === undefined || !ts.isStringLiteral(specifier)) {
        throw new Error(`emitted Worker URL has no string specifier: ${input.fileName}`);
      }
      matches.push(
        Object.freeze({
          end: specifier.end,
          start: specifier.getStart(sourceFile),
          text: specifier.text
        })
      );
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  if (matches.length !== 1) {
    throw new Error(
      `emitted function-metrics Worker URL must occur exactly once: ${input.fileName}; received ${matches.length}`
    );
  }
  const match = matches[0];
  if (match === undefined) throw new Error("function-metrics Worker URL match is missing");
  return replaceModuleSpecifierToken(input.source, match, "./analyzer-worker.mjs");
}

function relativeJavaScriptSpecifierRanges(input: {
  readonly fileName: string;
  readonly source: string;
}): readonly ModuleSpecifierRange[] {
  return relativeEsmModuleSpecifierRanges(input)
    .filter((specifier) => specifier.text.endsWith(".js"))
    .sort((left, right) => right.start - left.start);
}

function rewriteModuleSpecifierTokens(
  source: string,
  replacements: readonly ModuleSpecifierRange[]
): string {
  let rewritten = source;
  for (const specifier of replacements) {
    rewritten = replaceModuleSpecifierToken(rewritten, specifier);
  }
  return rewritten;
}

function replaceModuleSpecifierToken(
  source: string,
  specifier: ModuleSpecifierRange,
  replacement = `${specifier.text.slice(0, -".js".length)}.mjs`
): string {
  return `${source.slice(0, specifier.start)}${JSON.stringify(replacement)}${source.slice(specifier.end)}`;
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
  const sourceFile = parseEmittedJavaScript(input);
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

/** Validates syntax and returns that same AST; no dependency resolution, typecheck or emit is needed. */
function parseEmittedJavaScript(input: {
  readonly fileName: string;
  readonly source: string;
}): ts.SourceFile {
  const fileName = resolve(input.fileName).replaceAll("\\", "/");
  const sourceFile = ts.createSourceFile(
    fileName,
    input.source,
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.JS
  );
  const options: ts.CompilerOptions = {
    allowJs: true,
    module: ts.ModuleKind.ESNext,
    noEmit: true,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.ESNext,
    types: []
  };
  const host = ts.createCompilerHost(options);
  host.getSourceFile = (requestedPath) => (requestedPath === fileName ? sourceFile : undefined);
  host.fileExists = (requestedPath) => requestedPath === fileName;
  host.readFile = (requestedPath) => (requestedPath === fileName ? input.source : undefined);
  const program = ts.createProgram([fileName], options, host);
  const diagnostic = program
    .getSyntacticDiagnostics(sourceFile)
    .find((item) => item.category === ts.DiagnosticCategory.Error);
  if (diagnostic !== undefined) {
    throw new Error(
      `could not parse emitted ESM module ${input.fileName}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`
    );
  }
  return sourceFile;
}

function esmModuleSpecifier(node: ts.Node): ts.StringLiteral | undefined {
  return moduleSpecifierFromDeclaration(node) ?? moduleSpecifierFromDynamicImport(node);
}

function moduleSpecifierFromDeclaration(node: ts.Node): ts.StringLiteral | undefined {
  if (!ts.isImportDeclaration(node) && !ts.isExportDeclaration(node)) return undefined;
  const { moduleSpecifier } = node;
  return moduleSpecifier !== undefined && ts.isStringLiteral(moduleSpecifier)
    ? moduleSpecifier
    : undefined;
}

function moduleSpecifierFromDynamicImport(node: ts.Node): ts.StringLiteral | undefined {
  if (!ts.isCallExpression(node) || node.expression.kind !== ts.SyntaxKind.ImportKeyword) {
    return undefined;
  }
  const [specifier] = node.arguments;
  return node.arguments.length === 1 && specifier !== undefined && ts.isStringLiteral(specifier)
    ? specifier
    : undefined;
}

function isFunctionMetricsWorkerUrl(node: ts.Node): node is ts.NewExpression {
  if (!isTwoArgumentUrlConstruction(node)) return false;
  const [specifier, base] = node.arguments;
  return isAnalyzerWorkerSpecifier(specifier) && isImportMetaUrl(base);
}

function isTwoArgumentUrlConstruction(node: ts.Node): node is ts.NewExpression & {
  readonly arguments: readonly [ts.Expression, ts.Expression];
} {
  return (
    ts.isNewExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === "URL" &&
    node.arguments !== undefined &&
    node.arguments.length === 2
  );
}

function isAnalyzerWorkerSpecifier(value: ts.Expression): value is ts.StringLiteral {
  return ts.isStringLiteral(value) && value.text === "./analyzer-worker.ts";
}

function isImportMetaUrl(value: ts.Expression): boolean {
  return (
    ts.isPropertyAccessExpression(value) &&
    ts.isMetaProperty(value.expression) &&
    value.expression.keywordToken === ts.SyntaxKind.ImportKeyword &&
    value.expression.name.text === "meta" &&
    value.name.text === "url"
  );
}

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith("./") || specifier.startsWith("../");
}
