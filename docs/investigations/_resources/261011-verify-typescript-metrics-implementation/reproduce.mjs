import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(process.argv[2] ?? ".");
const sourceMode = process.argv[3] === "--source";
const baseline = process.argv[4] === "--baseline";
const extension = sourceMode ? ".ts" : ".mjs";
const api = await import(pathToFileURL(join(root, sourceMode ? "src/index.ts" : "index.mjs")));
const analyzer = join(root, sourceMode ? "src/package-checks/function-metrics/analyzer" : "dist/esm/package-checks/function-metrics/analyzer");
const { analyzeLizardSource } = await import(pathToFileURL(join(analyzer, "port-facade" + extension)));
const { TypeScriptReader } = await import(pathToFileURL(join(analyzer, "readers/typescript" + extension)));
const marker = typed => `function marker()${typed ? ": string" : ""} {\n  return "marker";\n}\n`;
const tail = "if (true) {\n  for (const value of [1]) {\n    if (true) {\n      void value;\n    }\n  }\n}\n";
const defaults = (expressions, parameters = "a: number | undefined") => `function defaults(${parameters}) {\n  return [${expressions.join(", ")}];\n}\n`;
const parameters = "a: number | undefined, b: number | undefined, c: number | undefined, d: number | undefined";
const samples = {
  "typed-only.ts": marker(true), "inferred-only.ts": marker(false),
  "typed-tail.ts": marker(true) + tail, "inferred-tail.ts": marker(false) + tail,
  "baseline-four.ts": defaults(["a", "b", "c", "d"], parameters),
  "coalesce-one.ts": defaults(["a ?? 0"]),
  "coalesce-four.ts": defaults(["a ?? 0", "b ?? 0", "c ?? 0", "d ?? 0"], parameters),
  "coalesce-compact.ts": defaults(["a??0"]),
  "optional-parameter.ts": defaults(["a"], "a?: number"),
  "ternary-one.ts": defaults(["a == null ? 0 : a"]),
  "ternary-four.ts": defaults(["a == null ? 0 : a", "b == null ? 0 : b", "c == null ? 0 : c", "d == null ? 0 : d"], parameters)
};
const expected = baseline
  ? [[1,0],[1,0],[4,3],[1,0],[1,0],[3,2],[9,8],[2,1],[1,0],[2,1],[5,4]]
  : [[1,0],[1,0],[1,0],[1,0],[1,0],[2,1],[5,4],[2,1],[1,0],[2,1],[5,4]];
const analyses = Object.entries(samples).map(([filename, sourceCode], index) => {
  const functions = analyzeLizardSource({filename, sourceCode})?.function_list;
  assert.equal(functions?.length, 1);
  const f = functions[0];
  const endLine = baseline && filename === "typed-tail.ts" ? 10 : 3;
  assert.equal(f.end_line, endLine);
  assert.equal(f.nloc, endLine);
  assert.equal(f.cyclomatic_complexity, expected[index][0]);
  assert.equal(f.max_nesting_depth, expected[index][1]);
  return {filename, sourceCode, questionTokens: [...TypeScriptReader.generateTokens(sourceCode)].filter(token => token.includes("?")), functions};
});
const fixtureRoot = mkdtempSync(join(tmpdir(), "vibe-check-ts-fixed-"));
const profiles = [];
try {
  for (const [filename, sourceCode] of Object.entries(samples)) writeFileSync(join(fixtureRoot, filename), sourceCode);
  for (const diagnostic of [true, false]) {
    const check = api.functionMetrics({findingPolicy: "blocking", codeAreas: {samples: {
      files: {patterns: ["*.ts"], useDefaultExcludes: false},
      ...(diagnostic ? {limits: {cyclomaticComplexity: {maximum:1}, nestingDepth: {maximum:1}}} : {})
    }}});
    const result = await api.run(api.defineConfig({checks:[check], outputs: {
      machinePublication: {enabled:false}, diagnosticLogging: {enabled:false}, progressRendering: {enabled:false}
    }}), {projectRoot: fixtureRoot});
    assert.equal(result.kind, "completed");
    const findingCount = diagnostic ? (baseline ? 10 : 7) : (baseline ? 1 : 0);
    assert.deepEqual(JSON.parse(JSON.stringify(result.snapshot.checks[0].outcome)), {status: findingCount > 0 ? "failed" : "passed", data: {findingCount, blockingFindingCount: findingCount}});
    profiles.push({name:diagnostic ? "diagnostic-limits" : "default-limits", aggregate:result.aggregate, outcome:result.snapshot.checks[0].outcome, records: result.snapshot.records, messages: result.checkMessages});
  }
} finally { rmSync(fixtureRoot, {recursive:true, force:true}); }
console.log(JSON.stringify({
  target: {version: JSON.parse(readFileSync(join(root,"package.json"),"utf8")).version, host:process.versions.bun ? "bun" : "node", hostVersion:process.versions.bun ?? process.version, sourceMode, baseline},
  analyses, profiles
},null,2));
