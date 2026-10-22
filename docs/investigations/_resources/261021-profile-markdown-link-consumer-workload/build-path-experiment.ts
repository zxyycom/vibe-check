/** Build isolated variants of the Product-owned measurement entry and existing regression sources. */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { once, transform, type Variant } from "./path-candidates.ts";

const [directory] = process.argv.slice(2);
if (!directory) throw new Error("Pass a fresh owned directory under the workspace");
const output = path.resolve(directory);
mkdirSync(output, { recursive: true });
const root = process.cwd();
const entry = path.join(root, "src/package-checks/markdown-link-validation/measurement.test-support.ts");
const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const inputs: Record<string, string> = {};
const transformed: Record<string, Record<string, string>> = {};
const bundles: Record<string, string> = {};
const wanted = new Set(["probeRootContainedPath", "readRegularFile", "collectSourceReferences", "resolveAll",
  "executeMarkdownLinkValidation", "parseMarkdownLinkFacts", "#restore", "#readCacheFile", "checkpoint", "#checkpoint"]);

function instrument(source: string, file: string) {
  if (source.includes("export function probeRootContainedPath(")) source = once(source,
    "export function probeRootContainedPath(", "export async function probeRootContainedPath(");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits: { position: number; text: string }[] = [];
  function visit(node: ts.Node) {
    if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.body && node.name && wanted.has(node.name.getText(ast))) {
      const key = path.basename(file) + ":" + node.name.getText(ast);
      const asynchronous = node.modifiers?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword);
      edits.push({ position: node.body.getStart(ast) + 1, text:
        `const __start = performance.now(); try {${asynchronous ? " return await (async () => {" : ""}\n` });
      edits.push({ position: node.body.getEnd() - 1, text:
        `\n${asynchronous ? "})();" : ""}} finally { globalThis.__candidateRecord(${JSON.stringify(key)}, performance.now()-__start); }` });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  for (const edit of edits.sort((a,b) => b.position-a.position)) source = source.slice(0,edit.position)+edit.text+source.slice(edit.position);
  return source;
}
const prelude = `
const __metrics = {}; const __counters = {};
globalThis.__candidateRecord = (key, ms) => { const row = __metrics[key] ??= { calls: 0, inclusiveMs: 0 }; row.calls++; row.inclusiveMs += ms; };
globalThis.__candidateCount = (key, n=1) => { __counters[key] = (__counters[key] ?? 0)+n; };
globalThis.__candidateReset = () => { for (const k of Object.keys(__metrics)) delete __metrics[k]; for(const k of Object.keys(__counters)) delete __counters[k]; };
globalThis.__candidateSnapshot = () => ({ metrics: __metrics, counters: __counters });
`;

function wrapFilesystem(source: string, variant: Variant, mode: string) {
  source = once(source, 'import { lstat, open, readlink } from "node:fs/promises";',
    'import { lstat as __lstat, open as __open, readlink as __readlink } from "node:fs/promises";');
  if (variant === "callback") source = once(source,
    'lstat as lstatCallback, readlink as readlinkCallback', 'lstat as __cbLstat, readlink as __cbReadlink');
  let wrappers = "";
  for (const [name, native] of [["lstat","__lstat"],["readlink","__readlink"],["open","__open"]]) {
    wrappers += mode === "profile"
      ? `function ${name}(p,...args) { globalThis.__candidateCount('${name}Calls'); return ${native}(p,...args); }\n`
      : `function ${name}(p,...args) { const hook=globalThis.__candidateObserve; return hook ? hook('${name}',p,args,()=>${native}(p,...args)) : ${native}(p,...args); }\n`;
  }
  if (variant === "callback") for (const [name,native,op] of [
    ["lstatCallback","__cbLstat","lstat"],["readlinkCallback","__cbReadlink","readlink"]
  ]) {
    wrappers += mode === "profile"
      ? `function ${name}(p,cb) { globalThis.__candidateCount('${op}Calls'); return ${native}(p,cb); }\n`
      : `function ${name}(p,cb) { const hook=globalThis.__candidateObserve; if(!hook) return ${native}(p,cb); hook('${op}',p,[],()=>new Promise((resolve,reject)=>${native}(p,(err,value)=>err?reject(err):resolve(value)))).then(v=>cb(null,v),e=>cb(e)); }\n`;
  }
  if (mode === "profile") {
    source = once(source, "const bytes = new Uint8Array(maxBytes + 1);",
      "const bytes = new Uint8Array(maxBytes + 1); globalThis.__candidateCount('bufferAllocationBytes', bytes.byteLength);");
    source = once(source, "const result = await handle.read(bytes, offset, bytes.byteLength - offset, offset);",
      "globalThis.__candidateCount('fileHandleReadCalls'); const result = await handle.read(bytes, offset, bytes.byteLength - offset, offset); globalThis.__candidateCount('fileHandleReturnedBytes',result.bytesRead);");
  }
  return source + "\n" + wrappers;
}

const regressions = ["local-resolver.test.ts", "local-resolver.endpoints.test.ts", "graph-behavior.test.ts",
  "unavailable-outcomes.test.ts", "execution-outcomes.test.ts", "cache-behavior.test.ts", "input-rejection.test.ts",
  "../markdown-lint/constructor.test.ts"];
for (const variant of ["baseline", "thin", "callback"] as Variant[]) {
  transformed[variant] = {};
  for (const mode of ["plain", "profile", "safety", "regression"]) {
    const naming = `${variant}-${mode}${mode === "regression" ? ".test" : ""}.mjs`;
    const built = await Bun.build({ entrypoints: [entry], outdir: output, target: "node", format: "esm", packages: "external", naming,
      plugins: [{ name: "isolated-path-candidate", setup(build) {
        build.onLoad({ filter: /\.ts$/u }, async ({ path: file }) => {
          const original = readFileSync(file, "utf8");
          const relative = path.relative(root, file);
          const hash = digest(original);
          if (inputs[relative] && inputs[relative] !== hash) throw new Error(`Source drift: ${relative}`);
          inputs[relative] = hash;
          let source = transform(original, file, variant);
          if (source !== original) transformed[variant]![relative] = digest(source);
          if (file === entry) {
            if (mode === "regression") source = regressions.map(f => `import ${JSON.stringify("./"+f)};`).join("\n");
            else if (mode === "safety") source = readFileSync(new URL("probe-safety.ts", import.meta.url), "utf8");
            else {
              source = once(source, '"docs/**/*.md"', '"docs/testing/cases/**/*.md"');
              source = once(source, '"changes/**/*.md"', '"docs/guides/**/*.md"');
              source = once(source, "limits: { maxOccurrences: 100_000, maxTargetReads: 10_000 },",
                "limits: { maxMarkdownBytes: 1048576, maxOccurrences: false, maxTargetReads: false },");
              source = once(source, "const started = performance.now();",
                "globalThis.__candidateReset(); const cpuStart=process.cpuUsage(); const started = performance.now();");
              source = once(source, "elapsedMs,\n        maxRssKiB:", "elapsedMs, cpu: process.cpuUsage(cpuStart), profile: globalThis.__candidateSnapshot(),\n        maxRssKiB:");
            }
            source = prelude + source;
          } else if (file.endsWith("/markdown-link-validation/filesystem-probes.ts") && ["profile","safety"].includes(mode)) {
            source = wrapFilesystem(source, variant, mode);
          }
          if (mode === "profile" && file.includes("/src/package-checks/markdown-link-validation/") && file !== entry) source = instrument(source, file);
          return { contents: source, loader: "ts" };
        });
      } }] });
    if (!built.success) throw new Error(built.logs.map(String).join("\n"));
    bundles[naming] = digest(readFileSync(path.join(output,naming)));
    console.log(JSON.stringify({variant,mode,naming}));
  }
}
writeFileSync(path.join(output,"candidate-identities.json"),JSON.stringify({formedAt:new Date().toISOString(),bun:Bun.version,
  methods:Object.fromEntries(["path-candidates.ts","build-path-experiment.ts","probe-safety.ts"].map(f=>[f,digest(readFileSync(new URL(f,import.meta.url)))])),
  inputs,transformed,bundles},null,2)+"\n");
