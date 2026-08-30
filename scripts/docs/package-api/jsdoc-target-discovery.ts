import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";

interface JSDocTarget {
  readonly declarationName: string;
  readonly sourcePath: string;
}

const supportedExportDeclaration = new RegExp(
  "^\\s*export\\s+(?:async\\s+)?(?:function|const|class|interface|type)\\s+([A-Za-z_$][A-Za-z0-9_$]*)(?:\\b|<)"
);

function repositoryFilePath(repositoryRoot: string, repositoryPath: string): string {
  const filePath = resolve(repositoryRoot, repositoryPath);
  const relativePath = relative(repositoryRoot, filePath);
  if (relativePath === "" || relativePath === ".." || relativePath.startsWith(`..${sep}`)) {
    throw new Error(`package API documentation path escapes repository root: ${repositoryPath}`);
  }
  return filePath;
}

function sourcePathsIn(productRoot: string): readonly string[] {
  const sourcePaths: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (
        entry.isFile() &&
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts") &&
        !entry.name.endsWith(".test-support.ts")
      )
        sourcePaths.push(path);
    }
  };
  visit(productRoot);
  return Object.freeze(sourcePaths.sort());
}

function targetFromExampleComment(
  source: string,
  sourcePath: string,
  comment: string,
  commentStart: number
): JSDocTarget {
  const lines = comment.split("\n");
  const firstExample = lines.findIndex((line) => /^ \* @example\b/.test(line));
  if (firstExample === -1) throw new Error(`invalid package API JSDoc example in ${sourcePath}`);
  validateExampleTail(lines.slice(firstExample + 1), sourcePath);
  const declaration = exportedDeclarationAfter(source, commentStart + comment.length);
  if (declaration === null)
    throw new Error(
      `package API JSDoc @example is not adjacent to a supported export in ${sourcePath}`
    );
  return Object.freeze({ declarationName: declaration[1], sourcePath });
}

function validateExampleTail(lines: readonly string[], sourcePath: string): void {
  for (const line of lines) {
    const tag = /^ \* @([^\s]+)/.exec(line)?.[1];
    if (tag !== undefined && tag !== "example") {
      throw new Error(`non-example JSDoc tag follows @example in ${sourcePath}: @${tag}`);
    }
  }
}

function exportedDeclarationAfter(source: string, commentEnd: number): RegExpExecArray | null {
  return supportedExportDeclaration.exec(source.slice(commentEnd));
}

function toRepositoryPath(repositoryRoot: string, filePath: string): string {
  return relative(repositoryRoot, filePath).split(sep).join("/");
}

/** Finds every existing source JSDoc example target before projection replacement. */
export function discoverJSDocExampleTargets(repositoryRoot: string): readonly JSDocTarget[] {
  const targets = new Map<string, JSDocTarget>();
  for (const sourcePath of sourcePathsIn(repositoryFilePath(repositoryRoot, "src"))) {
    const source = readFileSync(sourcePath, "utf8");
    if (!source.includes("@example")) continue;
    const repositoryPath = toRepositoryPath(repositoryRoot, sourcePath);
    for (const match of source.matchAll(/\/\*\*[\s\S]*?\*\//g)) {
      if (match.index === undefined || !match[0].includes("@example")) continue;
      const target = targetFromExampleComment(source, repositoryPath, match[0], match.index);
      const key = `${target.sourcePath}#${target.declarationName}`;
      if (targets.has(key)) throw new Error(`duplicate package API JSDoc target: ${key}`);
      targets.set(key, target);
    }
  }
  return Object.freeze([...targets.values()]);
}
