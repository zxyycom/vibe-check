import { existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import * as ts from "typescript";

import { walkFiles } from "../repository-files/files.ts";
import { FILE_SYSTEM } from "./documentation/task-contract.ts";

export interface ModuleEdge {
  readonly bindings: readonly ModuleBinding[];
  readonly specifier: string;
}

interface ModuleBinding {
  readonly name: ts.ModuleExportName;
  readonly typeOnly: boolean;
}

export type ResolvedModule =
  | Readonly<{ readonly kind: "external" }>
  | Readonly<{ readonly kind: "workspace"; readonly sourcePath: string }>;

type ModuleSyntaxPolicy = Readonly<{
  readonly codePrefix: string;
  readonly repositoryPath: string;
  readonly strict: boolean;
  readonly violations: string[];
}>;

/** Lists production TypeScript files while excluding test-only materials from dependency proofs. */
export function productionSourceFilesUnder(root: string, directory: string): readonly string[] {
  const absoluteDirectory = join(root, directory);
  if (!existsSync(absoluteDirectory)) return [];
  return walkFiles({ ignoredDirs: FILE_SYSTEM.ignoredDirs, rootDir: absoluteDirectory })
    .filter((path) => path.endsWith(".ts") && isProductionPath(`${directory}/${path}`))
    .map((path) => join(absoluteDirectory, path));
}

/** Keeps production traversal from treating test and fixture material as ordinary source. */
export function isProductionPath(path: string): boolean {
  return (
    !path.endsWith(".test.ts") &&
    !path.endsWith(".type-test.ts") &&
    !path.endsWith(".test-support.ts") &&
    !path.includes("/fixtures/") &&
    !path.includes("/test-support/")
  );
}

/** Collects literal module edges and reports unsupported loading forms for the current boundary. */
export function collectModuleEdges(
  sourceFile: ts.SourceFile,
  policy: ModuleSyntaxPolicy
): readonly ModuleEdge[] {
  const edges = sourceFile.statements.flatMap((statement) => staticModuleEdges(statement, policy));
  inspectUnsupportedLoadingSyntax(sourceFile, policy, edges);
  return edges;
}

/** Resolves a literal with the current TypeScript project resolution rules. */
export function resolveModule(
  root: string,
  sourcePath: string,
  specifier: string,
  options: ts.CompilerOptions
): ResolvedModule | undefined {
  const resolution = ts.resolveModuleName(specifier, sourcePath, options, ts.sys).resolvedModule;
  if (resolution === undefined)
    return specifier.startsWith("node:") ? { kind: "external" } : undefined;
  const path = resolve(resolution.resolvedFileName);
  return isWorkspaceModulePath(root, path)
    ? { kind: "workspace", sourcePath: path }
    : { kind: "external" };
}

/** Normalizes an absolute path into the slash-separated repository identity used in diagnostics. */
export function repositoryRelativePath(root: string, path: string): string {
  return relative(root, path).split("\\").join("/");
}

/** Tests a repository-relative path against an owned directory. */
export function isUnder(path: string, directory: string): boolean {
  return path === directory || path.startsWith(`${directory}/`);
}

function staticModuleEdges(
  statement: ts.Statement,
  policy: ModuleSyntaxPolicy
): readonly ModuleEdge[] {
  if (ts.isImportDeclaration(statement)) return importEdges(statement, policy);
  if (ts.isExportDeclaration(statement)) return exportEdges(statement, policy);
  if (ts.isImportEqualsDeclaration(statement)) unsupported(policy, "import equals");
  if (ts.isExportAssignment(statement)) unsupported(policy, "export assignment");
  return [];
}

function importEdges(
  statement: ts.ImportDeclaration,
  policy: ModuleSyntaxPolicy
): readonly ModuleEdge[] {
  const specifier = moduleSpecifierText(statement.moduleSpecifier);
  if (specifier === undefined) {
    unsupported(policy, "nonliteral import");
    return [];
  }
  const importClause = statement.importClause;
  if (importClause === undefined) {
    unsupported(policy, "side-effect import");
    return [{ bindings: [], specifier }];
  }
  if (importClause.name !== undefined && policy.strict) {
    unsupported(policy, "default import");
    return [];
  }
  if (isNamespaceImport(importClause) && policy.strict) {
    unsupported(policy, "namespace import");
    return [];
  }
  return [{ bindings: namedImportBindings(importClause), specifier }];
}

function exportEdges(
  statement: ts.ExportDeclaration,
  policy: ModuleSyntaxPolicy
): readonly ModuleEdge[] {
  if (statement.moduleSpecifier === undefined) return [];
  const specifier = moduleSpecifierText(statement.moduleSpecifier);
  if (specifier === undefined) {
    unsupported(policy, "nonliteral re-export");
    return [];
  }
  if (statement.exportClause === undefined || !ts.isNamedExports(statement.exportClause)) {
    if (policy.strict) {
      unsupported(policy, "export star");
      return [];
    }
    return [{ bindings: [], specifier }];
  }
  return [
    {
      bindings: statement.exportClause.elements.map((element) => ({
        name: element.propertyName ?? element.name,
        typeOnly: statement.isTypeOnly || element.isTypeOnly
      })),
      specifier
    }
  ];
}

function isNamespaceImport(importClause: ts.ImportClause): boolean {
  return (
    importClause.namedBindings !== undefined && ts.isNamespaceImport(importClause.namedBindings)
  );
}

function namedImportBindings(importClause: ts.ImportClause): readonly ModuleBinding[] {
  const namedBindings = importClause.namedBindings;
  if (namedBindings === undefined || ts.isNamespaceImport(namedBindings)) return [];
  return namedBindings.elements.map((element) => ({
    name: element.name,
    typeOnly: isTypeOnlyImportClause(importClause) || element.isTypeOnly
  }));
}

function inspectUnsupportedLoadingSyntax(
  sourceFile: ts.SourceFile,
  policy: ModuleSyntaxPolicy,
  edges: ModuleEdge[]
): void {
  const visit = (node: ts.Node): void => {
    if (ts.isImportTypeNode(node)) inspectImportTypeNode(node, policy, edges);
    if (ts.isCallExpression(node)) inspectLoadingCall(node, policy, edges);
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sourceFile, visit);
}

function inspectImportTypeNode(
  node: ts.ImportTypeNode,
  policy: ModuleSyntaxPolicy,
  edges: ModuleEdge[]
): void {
  if (policy.strict) {
    unsupported(policy, "import type query");
    return;
  }
  const argument = node.argument;
  const specifier = ts.isLiteralTypeNode(argument)
    ? moduleSpecifierText(argument.literal)
    : undefined;
  addCoreLiteralEdge(specifier, policy, edges, "nonliteral import type query");
}

function inspectLoadingCall(
  node: ts.CallExpression,
  policy: ModuleSyntaxPolicy,
  edges: ModuleEdge[]
): void {
  if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    if (policy.strict) {
      unsupported(policy, "dynamic import");
      return;
    }
    addCoreLiteralEdge(
      moduleSpecifierText(node.arguments[0]),
      policy,
      edges,
      "nonliteral dynamic import"
    );
    return;
  }
  if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
    unsupported(policy, "require");
  }
}

function addCoreLiteralEdge(
  specifier: string | undefined,
  policy: ModuleSyntaxPolicy,
  edges: ModuleEdge[],
  nonliteralSyntax: string
): void {
  if (specifier === undefined) {
    unsupported(policy, nonliteralSyntax);
    return;
  }
  edges.push({ bindings: [], specifier });
}

function moduleSpecifierText(moduleSpecifier: ts.Expression | undefined): string | undefined {
  return moduleSpecifier !== undefined &&
    (ts.isStringLiteral(moduleSpecifier) || ts.isNoSubstitutionTemplateLiteral(moduleSpecifier))
    ? moduleSpecifier.text
    : undefined;
}

function isTypeOnlyImportClause(importClause: ts.ImportClause): boolean {
  return importClause.phaseModifier === ts.SyntaxKind.TypeKeyword;
}

function unsupported(policy: ModuleSyntaxPolicy, syntax: string): void {
  if (
    !policy.strict &&
    syntax !== "import equals" &&
    syntax !== "require" &&
    !syntax.startsWith("nonliteral")
  )
    return;
  policy.violations.push(
    `${policy.codePrefix}-unsupported-module-syntax: ${policy.repositoryPath} (${syntax})`
  );
}

function isWorkspaceModulePath(root: string, path: string): boolean {
  const pathFromRoot = repositoryRelativePath(root, path);
  return (
    pathFromRoot !== ".." &&
    !pathFromRoot.startsWith("../") &&
    !pathFromRoot.split("/").includes("node_modules")
  );
}
