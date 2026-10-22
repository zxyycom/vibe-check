/** Correctness-only transform smoke. Pass an owned fresh ignored output directory. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { transformCollectionExperiment } from "./collection-experiment.ts";

const [authoredOutput] = process.argv.slice(2);
if (!authoredOutput) throw new Error("Pass a fresh owned output directory");
const output = path.resolve(authoredOutput);
fs.mkdirSync(output, { recursive: true });
const root = process.cwd();
const sourceRoot = path.join(root, "src/package-checks/project-files");
const hash = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");
const inputIdentities: Record<string, string> = {};
const methods = Object.fromEntries(["collection-experiment.ts", "collection-experiment-smoke.ts"].map(file => [file, hash(fs.readFileSync(path.join(import.meta.dir, file)))]));
const results: any[] = [];

async function build(name: string, candidate: "baseline" | "local" | "prefix", profile: boolean, regression: boolean, safetyObserve = false) {
  const entry = regression ? path.join(root, "src/package-checks/markdown-link-validation/measurement.test-support.ts") : path.join(sourceRoot, "collection.ts");
  const target = path.join(output, name + (regression ? ".test.mjs" : ".mjs"));
  const result = await Bun.build({ entrypoints: [entry], outdir: output, naming: path.basename(target), target: "node", packages: "external", format: "esm",
    plugins: [{ name: "collection-experiment-smoke", setup(builder) {
      builder.onLoad({ filter: /\.ts$/u }, ({ path: file }) => {
        let original = fs.readFileSync(file, "utf8");
        inputIdentities[path.relative(root, file)] = hash(original);
        if (file === entry && regression) original = ["collection.test.ts", "collection-path-identity.test.ts", "public-collection.test.ts"].map(file => `import ${JSON.stringify(path.join(sourceRoot, file))};`).join("\n");
        return { contents: transformCollectionExperiment(original, file, { memoizePolicies: candidate !== "baseline", memoizePrefixes: candidate === "prefix", profile, safetyObserve }), loader: "ts" };
      });
    } }]
  });
  if (!result.success) throw new Error(result.logs.map(String).join("\n"));
  return target;
}

for (const candidate of ["baseline", "local", "prefix"] as const) {
  const bundle = await build(candidate + "-regression", candidate, false, true);
  for (const runtime of [process.execPath, "node"]) {
    const args = runtime === process.execPath ? ["test", bundle] : ["--test", bundle];
    const result = spawnSync(runtime, args, { encoding: "utf8", cwd: root });
    results.push({ kind: "regression", candidate, runtime, status: result.status, stdout: result.stdout, stderr: result.stderr, bundleSha256: hash(fs.readFileSync(bundle)) });
    if (result.status !== 0) throw new Error(`${runtime} ${bundle}\n${result.stdout}\n${result.stderr}`);
  }
}

const fixture = path.join(output, "fixture");
for (const file of ["docs/a/b/c/d/source.md", "docs/a/b/c/d/target.md", "docs/other.md", "src/code.ts", "node_modules/pkg/ignored.md"]) {
  const target = path.join(fixture, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, "body\n");
}
const selections = { source: { patterns: ["docs/**/*.md"] }, literal: { patterns: ["src/code.ts", "docs/other.md"] }, negative: { patterns: ["**/*", "!node_modules/**"] } };
let previous: any;
for (const candidate of ["baseline", "local", "prefix"] as const) {
  const bundle = await build(candidate + "-profile", candidate, true, false);
  const api = await import(bundle);
  const counters: Record<string, number> = {}, metrics: Record<string, any> = {}, trace: any[] = [];
  (globalThis as any).__batchCount = (key: string, n = 1) => { counters[key] = (counters[key] ?? 0) + n; };
  (globalThis as any).__batchRecord = (key: string, ms: number) => { const r = metrics[key] ??= { calls: 0, inclusiveMs: 0 }; r.calls++; r.inclusiveMs += ms; };
  const lstat = fs.lstatSync, readdir = fs.readdirSync;
  Reflect.set(fs, "lstatSync", (...args: any[]) => { trace.push(["lstat", String(args[0])]); return Reflect.apply(lstat, fs, args); });
  Reflect.set(fs, "readdirSync", (...args: any[]) => { trace.push(["readdir", String(args[0])]); return Reflect.apply(readdir, fs, args); });
  let selected;
  try { selected = [...api.collectProjectFileSets(fixture, selections)]; }
  finally { Reflect.set(fs, "lstatSync", lstat); Reflect.set(fs, "readdirSync", readdir); }
  const value = { selected, trace };
  if (previous) assert.deepEqual(value, previous);
  previous = value;
  results.push({ kind: "profile", candidate, profile: true, selected, trace, counters, metrics, bundleSha256: hash(fs.readFileSync(bundle)) });
}
delete (globalThis as any).__batchCount;
delete (globalThis as any).__batchRecord;
const expectedObserverTrace = previous.trace.flatMap(([op, target]: [string, string]) => [["before", op, target], ["after", op, target]]);
for (const candidate of ["baseline", "local", "prefix"] as const) for (const profile of [false, true]) {
  const bundle = await build(candidate + "-safety-" + (profile ? "profile" : "plain"), candidate, profile, false, true);
  const api = await import(bundle);
  const noHook = [...api.collectProjectFileSets(fixture, selections)];
  assert.deepEqual(noHook, previous.selected);
  const controller = new AbortController(), trace: any[] = [];
  (globalThis as any).__collectionObserve = (event: any) => {
    trace.push([event.stage, event.op, String(event.path)]);
    if (event.stage === "before" && event.op === "readdir") controller.abort();
  };
  const selected = [...api.collectProjectFileSets(fixture, selections)];
  assert.equal(controller.signal.aborted, true);
  // Collection is a synchronous no-signal API; the owning Check must map the abort afterwards.
  assert.deepEqual(selected, previous.selected);
  assert.deepEqual(trace, expectedObserverTrace);
  const failures = [];
  for (const op of ["lstat", "readdir"]) for (const stage of ["before", "after"]) {
    (globalThis as any).__collectionObserve = (event: any) => {
      if (event.op === op && event.stage === stage) throw Object.assign(new Error("injected collection observation failure"), { code: "EACCES" });
    };
    assert.throws(() => api.collectProjectFileSets(fixture, selections), (error: any) => error.cause?.code === "EACCES" && error.message.includes(fixture));
    failures.push({ op, stage, passed: true });
  }
  (globalThis as any).__collectionObserve = () => Promise.resolve();
  assert.throws(() => api.collectProjectFileSets(fixture, selections), /observation hook must be synchronous/u);
  delete (globalThis as any).__collectionObserve;
  results.push({ kind: "safety", candidate, profile, selected, trace, synchronousAbortDidNotPreemptCollection: true, failures, asyncObserverRejected: true, bundleSha256: hash(fs.readFileSync(bundle)) });
}
const summary = { formedAt: new Date().toISOString(), bun: Bun.version, node: spawnSync("node", ["--version"], { encoding: "utf8" }).stdout.trim(), methods, inputs: inputIdentities, results };
fs.writeFileSync(path.join(output, "collection-smoke-results.json"), JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ regressions: results.filter(r => r.kind === "regression").map(r => ({ candidate: r.candidate, runtime: r.runtime, status: r.status })), profiles: results.filter(r => r.kind === "profile").map(r => ({ candidate: r.candidate, counters: r.counters })), safety: results.filter(r => r.kind === "safety").map(r => ({ candidate: r.candidate, profile: r.profile, traceMatches: true, failures: r.failures.length, synchronousAbortDidNotPreemptCollection: r.synchronousAbortDidNotPreemptCollection })) }, null, 2));
