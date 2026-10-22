/** Builds temporary Product-owned entry views. No src writes, dependencies, native addon, or public API change. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { once } from "./path-candidates.ts";
import { transformReader, transformProbeRuntime } from "./io-experiment-transform.ts";
import { transformCollectionExperiment } from "./collection-experiment.ts";

const [directory] = process.argv.slice(2);
if (!directory) throw Error("Pass a fresh owned output directory");
const output = path.resolve(directory), root = process.cwd(); mkdirSync(output, { recursive: true });
const entry = path.join(root, "src/package-checks/markdown-link-validation/measurement.test-support.ts");
const resources = path.dirname(import.meta.filename);
const variants = ["fast", "reader-direct", "reader-worker", "collection-local", "collection-prefix", "combined"];
const inputs: any = {}, transforms: any = {}, bundles: any = {};
const hash = (b: string | Uint8Array) => createHash("sha256").update(b).digest("hex");
function syncRegion(region: string) {
  return region.replace(/\basync /gu, "").replace(/\bawait /gu, "")
    .replace(/\blstat\(/gu, "batchLstatSync(").replace(/\breadlink\(/gu, "batchReadlinkSync(");
}
function renamedRegion(region: string) {
  for (const name of ["probeRootContainedPath", "isRootContainedPathProbeState", "advanceRootContainedPathProbe", "rootContainedPathStatus", "advanceThroughContainedSymlink"])
    region = region.replaceAll(name, "__sync_" + name);
  return region;
}
function profileFunctions(source: string, file: string) {
  const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true), edits:{position:number;text:string}[]=[];
  const wanted=new Set(["executeMarkdownLinkValidation","collectSourceReferences","resolveAll","readRegularFile","parseMarkdownLinkFacts","checkpoint","#checkpoint"]);
  function visit(n:ts.Node) {
    if((ts.isFunctionDeclaration(n)||ts.isMethodDeclaration(n))&&n.body&&n.name&&wanted.has(n.name.getText(ast))) {
      const key=path.basename(file)+":"+n.name.getText(ast), async=n.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword);
      edits.push({position:n.body.getStart(ast)+1,text:`const __t=performance.now();try{${async?"return await(async()=>{":""}`});
      edits.push({position:n.body.getEnd()-1,text:`${async?"})();":""}}finally{globalThis.__batchRecord(${JSON.stringify(key)},performance.now()-__t);}`});
    }
    ts.forEachChild(n,visit);
  }
  visit(ast);for(const e of edits.sort((a,b)=>b.position-a.position))source=source.slice(0,e.position)+e.text+source.slice(e.position);
  return source;
}
function wiring(source: string, file: string) {
  if (file.endsWith("/source-reader.ts")) {
    source = once(source, "readonly signal: AbortSignal;", "readonly signal: AbortSignal; readonly probeSession?: any;");
    source = once(source, "probeRootContainedPath(request.canonicalProjectRoot, sourcePath)",
      "probeRootContainedPath(request.canonicalProjectRoot, sourcePath, request.signal, request.probeSession)");
  }
  if (file.endsWith("/target-observation.ts")) {
    source = once(source, "export async function authorizeTargetNode(\n  node: TargetNode,\n  root: string",
      "export async function authorizeTargetNode(\n  node: TargetNode,\n  root: string, signal?: AbortSignal, probeSession?: any");
    source = once(source, "observeContainedEndpoint(node, root)", "observeContainedEndpoint(node, root, signal, probeSession)");
    source = once(source, "async function observeContainedEndpoint(\n  node: TargetNode,\n  root: string",
      "async function observeContainedEndpoint(\n  node: TargetNode,\n  root: string, signal?: AbortSignal, probeSession?: any");
    source = once(source, "probeRootContainedPath(root, node.path)", "probeRootContainedPath(root, node.path, signal, probeSession)");
  }
  if (file.endsWith("/resolver-engine.ts")) {
    source = 'import { createProbeSession, closeProbeSession } from "mdlink-probe-experiment";\n' + source;
    source = once(source, "#targetReadCount = 0;", "#targetReadCount = 0; readonly #probeSession: any;");
    source = once(source, "this.#signal = signal;", "this.#signal = signal; this.#probeSession = createProbeSession(signal);");
    source = once(source, "finalize(): Promise<void> {\n    return this.#parseFactsCache.finalize(this.#signal);\n  }",
      "async finalize(): Promise<void> { try { await this.#parseFactsCache.finalize(this.#signal); } finally { await closeProbeSession(this.#probeSession); } }");
    source = once(source, "rootRelativePath,\n      signal: this.#signal", "rootRelativePath,\n      probeSession: this.#probeSession, signal: this.#signal");
    source = once(source, "authorizeTargetNode(node, this.#canonicalProjectRoot)",
      "authorizeTargetNode(node, this.#canonicalProjectRoot, this.#signal, this.#probeSession)");
  }
  return source;
}
function filesystem(source: string, role: string) {
  const start = source.indexOf("interface RootContainedPathProbeState"), end = source.indexOf("export async function probeEndpoint(");
  let region = source.slice(start, end);
  if (start < 0 || end < start) throw Error("Probe source seam changed");
  const imports = 'import { executeProbe, batchLstatAsync, batchReadlinkAsync, batchLstatSync, batchReadlinkSync } from "mdlink-probe-experiment";\n';
  if (role === "worker") {
    source = source.slice(0, start) + syncRegion(region) + source.slice(end);
    source = once(source, 'import { lstat, open, readlink } from "node:fs/promises";',
      'import { open } from "node:fs/promises"; const lstat=batchLstatAsync, readlink=batchReadlinkAsync;');
    return imports + source;
  }
  let sync = renamedRegion(syncRegion(region)).replaceAll("interface RootContainedPathProbeState", "interface __sync_RootContainedPathProbeState")
    .replace(/\bRootContainedPathProbeState\b/gu, "__sync_RootContainedPathProbeState")
    .replace(/\bRootContainedPathProbeAdvance\b/gu, "__sync_RootContainedPathProbeAdvance")
    .replace(/\bRootContainedPathStatus\b/gu, "__sync_RootContainedPathStatus");
  region = once(region, "export async function probeRootContainedPath(", "async function __originalProbe(");
  const wrapper = `export async function probeRootContainedPath(root:string,p:string,signal?:AbortSignal,session?:any):Promise<RootProbe> {
    return executeProbe(root,p,signal,session,()=>__originalProbe(root,p),()=>__sync_probeRootContainedPath(root,p));
  }\n`;
  source = imports + source.slice(0, start) + region + sync + wrapper + source.slice(end);
  return source;
}
const prelude = `
const __batchCounters={};globalThis.__batchCount=(k,n=1)=>{__batchCounters[k]=(__batchCounters[k]??0)+n;};
const __batchMetrics={};globalThis.__batchRecord=(k,ms)=>{const r=__batchMetrics[k]??={calls:0,inclusiveMs:0};r.calls++;r.inclusiveMs+=ms;};
globalThis.__batchReset=()=>{for(const k of Object.keys(__batchCounters))delete __batchCounters[k];for(const k of Object.keys(__batchMetrics))delete __batchMetrics[k];};
globalThis.__batchSnapshot=()=>({...__batchCounters});
`;
const regressions = ["local-resolver.test.ts", "local-resolver.endpoints.test.ts", "graph-behavior.test.ts", "unavailable-outcomes.test.ts",
  "execution-outcomes.test.ts", "cache-behavior.test.ts", "input-rejection.test.ts", "../markdown-lint/constructor.test.ts"];
for (const variant of variants) for (const mode of ["plain", "profile", "safety", "regression"]) {
  for (const role of ["worker", "parent"]) {
    const naming = `${variant}-${mode}-${role}${mode === "regression" && role === "parent" ? ".test" : ""}.mjs`;
    const workerFile = path.join(output, `${variant}-${mode}-worker.mjs`);
    const built = await Bun.build({ entrypoints: [entry], outdir: output, target: "node", format: "esm", packages: "external", naming,
      define: { __BATCH_VARIANT__: JSON.stringify("worker-sync"), __IO_VARIANT__:JSON.stringify(variant), __BATCH_MODE__: JSON.stringify(mode), __BATCH_WORKER_FILE__: JSON.stringify(workerFile) },
      plugins: [{ name: "reader-collection-isolation", setup(build) {
        build.onResolve({ filter: /^mdlink-reader-experiment$/u }, () => ({ path: path.join(resources, "io-experiment-runtime.ts") }));
        build.onResolve({ filter: /^mdlink-probe-experiment$/u }, () => ({ path: path.join(resources, "probe-batch-runtime.ts") }));
        build.onLoad({ filter: /\.ts$/u }, ({ path: file }) => {
          const original = readFileSync(file, "utf8"), relative = path.relative(root, file);
          if (!file.startsWith(resources + path.sep)) inputs[relative] = hash(original);
          let source = original;
          if (file === entry) {
            if (role === "worker") source = 'import { serveProbe } from "mdlink-probe-experiment"; import { probeRootContainedPath, __syncReadRegularFile } from "./filesystem-probes.ts"; serveProbe(probeRootContainedPath,__syncReadRegularFile);';
            else if (mode === "regression") source = 'import { after } from "node:test"; import { closeAllProbeSessions } from "mdlink-probe-experiment"; after(closeAllProbeSessions);\n' + regressions.map(f => `import ${JSON.stringify("./" + f)};`).join("\n");
            else if (mode === "safety") source = readFileSync(path.join(resources, "io-experiment-safety.ts"), "utf8");
            else {
              source = once(source, '"docs/**/*.md"', '"docs/testing/cases/**/*.md"');
              source = once(source, '"changes/**/*.md"', '"docs/guides/**/*.md"');
              source = once(source, "limits: { maxOccurrences: 100_000, maxTargetReads: 10_000 },", "limits: { maxMarkdownBytes: 1048576, maxOccurrences: false, maxTargetReads: false },");
              source = once(source, "const started = performance.now();", "globalThis.__batchReset(); const cpuStart=process.cpuUsage(); const started = performance.now();");
              source = once(source, "elapsedMs,\n        maxRssKiB:", "elapsedMs, cpu:process.cpuUsage(cpuStart), counters:globalThis.__batchSnapshot(), metrics:__batchMetrics,\n        maxRssKiB:");
            }
            source = prelude + source;
          } else if (file.endsWith("/markdown-link-validation/filesystem-probes.ts")) source = filesystem(source, role);
          else if (role === "parent" && file.includes("/src/package-checks/markdown-link-validation/")) source = wiring(source, file);
          if(file.endsWith("/probe-batch-runtime.ts")) source=transformProbeRuntime(source);
          source=transformReader(source,file,mode);
          source=transformCollectionExperiment(source,file,{memoizePolicies:["collection-local","collection-prefix","combined"].includes(variant),memoizePrefixes:["collection-prefix","combined"].includes(variant),profile:mode==="profile",safetyObserve:mode==="safety"});
          if(role==="parent"&&mode==="profile"&&file!==entry&&file.includes("/src/package-checks/markdown-link-validation/"))source=profileFunctions(source,file);
          if (source !== original) transforms[`${variant}/${mode}/${role}/${relative}`] = hash(source);
          return { contents: source, loader: "ts" };
        });
      } }] });
    if (!built.success) throw Error(built.logs.map(String).join("\n"));
    bundles[naming] = hash(readFileSync(path.join(output, naming)));
  }
  console.log(JSON.stringify({ variant, mode }));
}
writeFileSync(path.join(output, "io-experiment-identities.json"), JSON.stringify({ formedAt: new Date().toISOString(), bun: Bun.version, inputs, transforms, bundles,
  methods: Object.fromEntries(["build-io-experiment.ts", "io-experiment-transform.ts", "io-experiment-runtime.ts", "io-experiment-safety.ts", "collection-experiment.ts", "consumer-fixture.ts", "measure-io-experiment.ts", "probe-batch-runtime.ts", "path-candidates.ts"].map(f => [f, hash(readFileSync(path.join(resources, f)))])) }, null, 2) + "\n");
