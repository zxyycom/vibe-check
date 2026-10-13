import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { assertNoArguments } from "./helper-inputs.ts";

assertNoArguments(process.argv.slice(2), "prepare-experiment-copies.ts");
const root = process.cwd(),
  base = resolve(root, "tmp/optimization-20261012/file-selection");
for (const kind of ["profile", "literal"]) {
  const dest = resolve(base, kind);
  mkdirSync(dest, { recursive: true });
  for (const path of [
    "src/package-checks/project-files/filesystem-collection.ts",
    "src/package-checks/project-files/collection.ts",
    "src/package-checks/project-files/public-collection.ts",
    "src/data-boundary/config-glob.ts"
  ]) {
    let source = readFileSync(resolve(root, path), "utf8");
    source = source.replace(
      /(from\s+")([.][^"\n]+)(")/g,
      (_match: string, prefix: string, specifier: string, suffix: string) => {
        const target = resolve(root, dirname(path), specifier);
        const fileName = target.split("/").at(-1)!;
        const isCopiedOwner =
          ["filesystem-collection.ts", "collection.ts", "config-glob.ts"].includes(fileName) &&
          target !== resolve(root, "src/package-checks/project-files/config-glob.ts");
        const routedTarget = isCopiedOwner ? resolve(dest, fileName) : target;
        return `${prefix}${routedTarget}${suffix}`;
      }
    );
    if (kind === "profile" && path === "src/data-boundary/config-glob.ts")
      source = source.replace(
        "return micromatch([...paths], [...patterns], CONFIG_GLOB_OPTIONS);",
        `const start = performance.now(); const result = micromatch([...paths], [...patterns], CONFIG_GLOB_OPTIONS); const key = paths.length === 1 ? "singleton" : "batch"; const store = (globalThis as any).__selectionProfile ??= {}; const row = store[key] ??= {calls:0, elapsedMs:0, paths:0, patterns:0}; row.calls++; row.elapsedMs += performance.now()-start; row.paths += paths.length; row.patterns += patterns.length; return result;`
      );
    if (
      kind === "literal" &&
      path === "src/package-checks/project-files/filesystem-collection.ts"
    ) {
      source = source.replace(
        "const access = new CollectionDirectoryAccess",
        `const literalSelections = new Map(selections.map(selection => [selection, selection.patterns.every(pattern => pattern.split("/").every(part => /^[A-Za-z0-9_.-]+$/u.test(part) && part !== "." && part !== "..")) ? new Set(selection.patterns) : undefined]));\n  const defaultExclusions = DEFAULT_PROJECT_FILE_EXCLUDES.map(pattern => micromatch.matcher(pattern, CONFIG_GLOB_OPTIONS));\n  function matchesSelection(path: string, selection: ProjectFileSelection): boolean { const literal = literalSelections.get(selection); return (literal === undefined ? matchesConfigPatterns(path, selection.patterns) : literal.has(path)) && (selection.useDefaultExcludes === false || !defaultExclusions.some(matches => matches(path))); }\n  const access = new CollectionDirectoryAccess`
      );
      // Probe carries predicate through the existing single filesystem operation only.
      source = source.replace(
        "createSubtreePruner(selections), selections)",
        "createSubtreePruner(selections), selections, matchesSelection)"
      );
      source = source
        .replaceAll("selectedPath(", "thisSelectedPath(")
        .replace("function thisSelectedPath(", "function selectedPath(");
      source = source.replace(
        "selections.some((selection) => thisSelectedPath(relativePath, selection))",
        "selections.some((selection) => matchesSelection(relativePath, selection))"
      );
      source = source.replace(
        "constructor(root: string, noDemand: SubtreePruner, selections: readonly ProjectFileSelection[]) {",
        "constructor(root: string, noDemand: SubtreePruner, selections: readonly ProjectFileSelection[], thisSelectedPath: typeof selectedPath) {"
      );
      source = source
        .replace(
          "private readonly root: string;",
          "private readonly root: string; private readonly thisSelectedPath: typeof selectedPath;"
        )
        .replace(
          "this.root = root;",
          "this.root = root; this.thisSelectedPath = thisSelectedPath;"
        );
      source = source.replaceAll(
        "thisSelectedPath(path, selection)",
        "this.thisSelectedPath(path, selection)"
      );
      source = source
        .replace("this.selections, entry)", "this.selections, entry, this.thisSelectedPath)")
        .replace("this.selections)", "this.selections, undefined, this.thisSelectedPath)");
      source = source.replace(
        "knownType?: fs.Dirent<Buffer>",
        "knownType?: fs.Dirent<Buffer>, thisSelectedPath: typeof selectedPath = selectedPath"
      );
    }
    writeFileSync(resolve(dest, path.split("/").at(-1)!), source);
  }
}
