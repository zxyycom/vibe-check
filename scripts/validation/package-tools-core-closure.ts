import { readFileSync } from "node:fs";

import * as ts from "typescript";

import {
  collectModuleEdges,
  isProductionPath,
  isUnder,
  productionSourceFilesUnder,
  repositoryRelativePath,
  resolveModule
} from "./package-tools-module-graph.ts";

const PACKAGE_TOOLS_DIRECTORY = "src/package-tools";
const CORE_ROOT_DIRECTORIES = Object.freeze([
  "src/check",
  "src/check-settlement",
  "src/data-boundary",
  "src/machine-output",
  "src/project-definition",
  "src/project-run"
]);

interface CoreClosureInput {
  readonly pending: string[];
  readonly repositoryPath: string;
  readonly root: string;
  readonly violations: string[];
}

/** Traverses the declared Core roots and reports imports that escape the Core production closure. */
export function validateCoreClosure(
  root: string,
  options: ts.CompilerOptions,
  violations: string[]
): readonly string[] {
  const pending = CORE_ROOT_DIRECTORIES.flatMap((directory) =>
    productionSourceFilesUnder(root, directory)
  );
  const visited = new Set<string>();
  while (pending.length > 0) {
    const sourcePath = pending.pop();
    if (sourcePath === undefined || visited.has(sourcePath)) continue;
    visited.add(sourcePath);
    collectCoreDependencies(root, sourcePath, options, pending, violations);
  }
  return [...visited].sort();
}

/** Runs the no-emit proof only for the production files reached from the Core roots. */
export function validateCoreNoEmit(
  rootNames: readonly string[],
  options: ts.CompilerOptions,
  violations: string[]
): void {
  const program = ts.createProgram({ options, rootNames });
  for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
    const sourcePath =
      diagnostic.file === undefined ? "unknown" : diagnostic.file.fileName.split("\\").join("/");
    violations.push(
      `package-tools-core-no-emit: ${sourcePath}: TS${diagnostic.code} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, " ")}`
    );
  }
}

function collectCoreDependencies(
  root: string,
  sourcePath: string,
  options: ts.CompilerOptions,
  pending: string[],
  violations: string[]
): void {
  const sourceFile = ts.createSourceFile(
    sourcePath,
    readFileSync(sourcePath, "utf8"),
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
  );
  const repositoryPath = repositoryRelativePath(root, sourcePath);
  const edges = collectModuleEdges(sourceFile, {
    codePrefix: "package-tools-core",
    repositoryPath,
    strict: false,
    violations
  });
  const input: CoreClosureInput = { pending, repositoryPath, root, violations };
  for (const edge of edges) {
    const resolution = resolveModule(root, sourcePath, edge.specifier, options);
    if (resolution === undefined) {
      violations.push(
        `package-tools-core-unresolved-import: ${repositoryPath} -> ${edge.specifier}`
      );
      continue;
    }
    if (resolution.kind === "external") continue;
    addCoreDependency(input, edge.specifier, resolution.sourcePath);
  }
}

function addCoreDependency(input: CoreClosureInput, specifier: string, sourcePath: string): void {
  const targetPath = repositoryRelativePath(input.root, sourcePath);
  if (!isUnder(targetPath, "src")) {
    input.violations.push(
      `package-tools-core-imports-nonproduct: ${input.repositoryPath} -> ${specifier}`
    );
    return;
  }
  if (!isProductionPath(targetPath)) {
    input.violations.push(
      `package-tools-core-imports-test-material: ${input.repositoryPath} -> ${specifier}`
    );
    return;
  }
  if (isUnder(targetPath, PACKAGE_TOOLS_DIRECTORY)) {
    input.violations.push(
      `package-tools-core-imports-non-core: ${input.repositoryPath} -> ${specifier}`
    );
    return;
  }
  input.pending.push(sourcePath);
}
