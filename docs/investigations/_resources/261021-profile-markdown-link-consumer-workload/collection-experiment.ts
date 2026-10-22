/** Investigation-only virtual-source transforms. Product source is never written. */
import ts from "typescript";

export interface CollectionExperimentOptions {
  /** Memoize only pure glob policy decisions for this collection, never FS observations. */
  readonly memoizePolicies?: boolean;
  /** Additionally reuse pure per-policy ancestor-prefix exclusion decisions. */
  readonly memoizePrefixes?: boolean;
  /** Nested inclusive profile; do not sum its timers as an exclusive breakdown. */
  readonly profile?: boolean;
  /** Safety-only synchronous observation around real host lstat/readdir calls. */
  readonly safetyObserve?: boolean;
}

function replaceOnce(source: string, before: string, after: string): string {
  if (source.split(before).length !== 2) throw new Error(`Collection seam changed: ${before}`);
  return source.replace(before, after);
}

const helper = `
function __collectionCount(key: string, count = 1): void {
  (globalThis as any).__batchCount?.("collection." + key, count);
}
function __collectionRecord(key: string, elapsed: number): void {
  (globalThis as any).__batchRecord?.("collection." + key, elapsed);
}
function __collectionMeasure<T>(key: string, body: () => T): T {
  const started = performance.now();
  try { return body(); } finally { __collectionRecord(key, performance.now() - started); }
}
`;

const observationHelper = `
function __collectionHostOperation<T>(op: "lstat" | "readdir", path: string | Buffer, body: () => T): T {
  const observer = (globalThis as any).__collectionObserve;
  if (observer === undefined) return body();
  function observe(stage: "before" | "after"): void {
    const returned = observer({ stage, op, path });
    if (returned?.then) throw new TypeError("Collection observation hook must be synchronous");
  }
  observe("before");
  const result = body();
  observe("after");
  return result;
}
`;

function policyHelper(memoize: boolean, profile: boolean): string {
  return `
function __collectionPolicy(key: string, predicate: (path: string) => boolean): (path: string) => boolean {
  ${memoize ? "const decisions = new Map<string, boolean>();" : ""}
  return (path) => {
    ${profile ? `__collectionCount(key + ".requests"); __collectionCount(key + ".requestedPathChars", path.length);` : ""}
    ${memoize ? `if (decisions.has(path)) { ${profile ? '__collectionCount(key + ".hits");' : ""} return decisions.get(path)!; }` : ""}
    ${profile ? `__collectionCount(key + ".computations"); const started = performance.now();` : ""}
    ${profile ? "try {" : ""}
      const result = predicate(path);
      ${memoize ? "decisions.set(path, result);" : ""}
      return result;
    ${profile ? `} finally { __collectionRecord(key + ".compute", performance.now() - started); }` : ""}
  };
}
`;
}

function prefixHelper(memoize: boolean, profile: boolean): string {
  return `
function __collectionPrefix(prefix: string, excludes: readonly ((path: string) => boolean)[]${memoize ? ", decisions: Map<string, boolean>" : ""}): boolean {
  ${profile ? '__collectionCount("prune.prefix.requests"); __collectionCount("prune.prefix.requestedPathChars", prefix.length);' : ""}
  ${memoize ? `if (decisions.has(prefix)) { ${profile ? '__collectionCount("prune.prefix.hits");' : ""} return decisions.get(prefix)!; }` : ""}
  ${profile ? '__collectionCount("prune.prefix.computations"); const started = performance.now(); try {' : ""}
    const result = excludes.some((matches) => { ${profile ? '__collectionCount("prune.matcherCalls"); __collectionCount("prune.matcherPathChars", prefix.length);' : ""} return matches(prefix); });
    ${memoize ? "decisions.set(prefix, result);" : ""}
    return result;
  ${profile ? '} finally { __collectionRecord("prune.prefix.compute", performance.now() - started); }' : ""}
}
`;
}

function wrapFunctions(source: string, file: string, wanted: ReadonlySet<string>): string {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits: { position: number; text: string }[] = [];
  function visit(node: ts.Node): void {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.body && node.name) {
      const name = node.name.getText(ast);
      if (wanted.has(name)) {
        edits.push({ position: node.body.getStart(ast) + 1, text: `const __collectionStarted=performance.now();try{` });
        edits.push({ position: node.body.getEnd() - 1, text: `}finally{__collectionRecord(${JSON.stringify(name)},performance.now()-__collectionStarted);}` });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const edit of edits.sort((a, b) => b.position - a.position)) {
    source = source.slice(0, edit.position) + edit.text + source.slice(edit.position);
  }
  return source;
}

/**
 * Apply once per file, after any independent mdlink probe/read transform.
 * Plain baseline is byte-identical. Candidate changes only policy evaluation count.
 * Profile uses the probe experiment's __batchCount/__batchRecord global callbacks.
 */
export function transformCollectionExperiment(
  source: string,
  file: string,
  options: CollectionExperimentOptions = {}
): string {
  const profile = options.profile === true;
  const memoize = options.memoizePolicies === true;
  const prefixMemo = options.memoizePrefixes === true;
  const safetyObserve = options.safetyObserve === true;
  const normalized = file.replaceAll("\\", "/");
  if (!profile && !memoize && !prefixMemo && !safetyObserve) return source;
  if (normalized.endsWith("/src/package-checks/project-files/filesystem-collection.ts")) {
    source = replaceOnce(source,
      "const selectedPath = createSelectedPathPredicate(selections);",
      'const selectedPath = __collectionPolicy("selectedPath", createSelectedPathPredicate(selections));');
    source = replaceOnce(source,
      "const access = new CollectionDirectoryAccess(root, createSubtreePruner(selections), selectedPath);",
      'const access = new CollectionDirectoryAccess(root, __collectionPolicy("noDemand", createSubtreePruner(selections)), selectedPath);');
    if (prefixMemo) {
      source = replaceOnce(source,
        "excludes: subtreeExclusions(selection).map((pattern) =>\n      micromatch.matcher(pattern, CONFIG_GLOB_OPTIONS)\n    )\n  }));",
        "excludes: subtreeExclusions(selection).map((pattern) =>\n      micromatch.matcher(pattern, CONFIG_GLOB_OPTIONS)\n    ), prefixDecisions: new Map<string, boolean>()\n  }));");
      source = replaceOnce(source,
        "return policies.every(({ isEmpty, excludes }) => {",
        "return policies.every(({ isEmpty, excludes, prefixDecisions }) => {");
    }
    if (profile || prefixMemo) source = replaceOnce(source,
      "if (excludes.some((matches) => matches(prefix))) return true;",
      `if (__collectionPrefix(prefix, excludes${prefixMemo ? ", prefixDecisions" : ""})) return true;`);
    if (profile) {
      source = replaceOnce(source,
        "const cached = this.directories.get(path);\n    if (cached !== undefined) return cached;",
        'const cached = this.directories.get(path); __collectionCount("directory.requests");\n    if (cached !== undefined) { __collectionCount("directory.hits"); return cached; } __collectionCount("directory.misses");');
      source = replaceOnce(source,
        'const matching = this.readDirectory(parent).entriesByName.get(name) ?? [];',
        'const matching = this.readDirectory(parent).entriesByName.get(name) ?? []; __collectionCount("validatedEntry.calls"); __collectionCount("validatedEntry.candidates", matching.length);');
      source = replaceOnce(source,
        "for (const [index, part] of parts.entries()) {",
        'for (const [index, part] of parts.entries()) { __collectionCount("targetEntry.componentVisits");');
      source = replaceOnce(source,
        'const name = nameBytes.toString("utf8");',
        '__collectionCount("entry.count"); __collectionCount("entry.nameBytes", nameBytes.byteLength); const name = nameBytes.toString("utf8");');
      source = replaceOnce(source,
        "stats ??= inspectPath(physicalPath);",
        'if (stats === undefined) __collectionCount("entry.statMisses"); else __collectionCount("entry.statHits"); stats ??= inspectPath(physicalPath);');
      // Retain the exact byte-name readdir overload; count the real host acquisition, not adapter calls.
      source = replaceOnce(source,
        "entries = fs\n        .readdirSync(path, { withFileTypes: true, encoding: \"buffer\" })",
        'entries = __collectionMeasure("physical.readdirSync", () => { __collectionCount("physical.readdirSync.calls"); return fs.readdirSync(path, { withFileTypes: true, encoding: "buffer" }); })');
      source = replaceOnce(source,
        "return fs.lstatSync(path);",
        'return __collectionMeasure("physical.lstatSync", () => { __collectionCount("physical.lstatSync.calls"); return fs.lstatSync(path); });');
      source = replaceOnce(source,
        "excludes: subtreeExclusions(selection).map((pattern) =>\n      micromatch.matcher(pattern, CONFIG_GLOB_OPTIONS)\n    )",
        'excludes: subtreeExclusions(selection).map((pattern) =>\n      __collectionMeasure("prune.compile", () => { __collectionCount("prune.patternsCompiled"); return micromatch.matcher(pattern, CONFIG_GLOB_OPTIONS); })\n    )');
      source = replaceOnce(source,
        "return defaultExclusions.some((matches) => matches(path));",
        'return defaultExclusions.some((matches) => { __collectionCount("default.matcherCalls"); return matches(path); });');
      source = wrapFunctions(source, file, new Set([
        "collectionCandidatePatterns", "createCollectionFilesystem", "readTarget", "targetEntry",
        "validatedDirectoryEntry", "demandedPath", "retainEntry", "readDirectory", "createCollectionEntry",
        "createSubtreePruner", "createSelectedPathPredicate", "createUserPathPredicate", "slashRelative"
      ]));
    }
    if (safetyObserve) {
      source = replaceOnce(source, "fs.lstatSync(path)", '__collectionHostOperation("lstat", path, () => fs.lstatSync(path))');
      source = replaceOnce(source,
        profile ? 'fs.readdirSync(path, { withFileTypes: true, encoding: "buffer" })' : 'fs\n        .readdirSync(path, { withFileTypes: true, encoding: "buffer" })',
        '__collectionHostOperation("readdir", path, () => fs.readdirSync(path, { withFileTypes: true, encoding: "buffer" }))');
    }
    return (profile ? helper : "") + (safetyObserve ? observationHelper : "") + policyHelper(memoize, profile) + (profile || prefixMemo ? prefixHelper(prefixMemo, profile) : "") + source;
  }
  if (profile && normalized.endsWith("/src/package-checks/project-files/collection.ts")) {
    source = replaceOnce(source,
      'const filesystem = createCollectionFilesystem(root, policies);',
      'const filesystem = __collectionMeasure("setup.filesystem", () => createCollectionFilesystem(root, policies));');
    source = replaceOnce(source,
      "const patterns = collectionCandidatePatterns(policies);",
      'const patterns = __collectionMeasure("setup.candidatePatterns", () => collectionCandidatePatterns(policies));');
    source = replaceOnce(source,
      "const candidates =\n    patterns.length === 0",
      'const candidates = __collectionMeasure("backend.fastGlobAndNormalize", () =>\n    patterns.length === 0');
    source = replaceOnce(source,
      '.map((path) => path.replace(/^(?:\\.\\/)+/u, ""));',
      '.map((path) => path.replace(/^(?:\\.\\/)+/u, ""))); __collectionCount("candidates", candidates.length);');
    source = replaceOnce(source,
      "let paths = selectConfigPaths(candidates, selection.patterns);",
      'let paths = __collectionMeasure("final.userSelection", () => selectConfigPaths(candidates, selection.patterns));');
    source = replaceOnce(source,
      "const excluded = new Set(selectConfigPaths(paths, DEFAULT_PROJECT_FILE_EXCLUDES));",
      'const excluded = new Set(__collectionMeasure("final.defaultSelection", () => selectConfigPaths(paths, DEFAULT_PROJECT_FILE_EXCLUDES)));');
    source = replaceOnce(source,
      "selected.set(id, freezeProjectPaths(root, paths));",
      'const frozen = __collectionMeasure("final.freezeProjectPaths", () => freezeProjectPaths(root, paths)); __collectionCount("selectedPaths", frozen.length); selected.set(id, frozen);');
    source = wrapFunctions(source, file, new Set(["collectProjectFileSets", "collectProjectFiles", "freezeProjectPaths"]));
    return helper + source;
  }
  return source;
}
