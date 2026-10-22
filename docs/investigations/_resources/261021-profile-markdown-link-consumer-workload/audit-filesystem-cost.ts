/** Diagnostic only: observe current Product I/O, then replay its ordered lstat calls.
 * Replay has no resolver, authorization, cancellation or publication claim; sync is NOT a Product candidate.
 * Usage: bun run <this file> <fresh owned directory under this workspace>
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeConsumerFixture } from "./consumer-fixture.ts";

const [directory] = process.argv.slice(2);
if (!directory) throw new Error("Pass a fresh owned output directory");
const output = path.resolve(directory);
mkdirSync(output, { recursive: true });
const root = process.cwd();
const entry = path.join(root, "src/package-checks/markdown-link-validation/measurement.test-support.ts");
const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const inputs: Record<string, string> = {};
const transformed: Record<string, string> = {};
function once(source: string, before: string, after: string) {
  if (source.split(before).length !== 2) throw new Error(`Missing or ambiguous seam: ${before}`);
  return source.replace(before, after);
}
const prelude = String.raw`
import { lstat as __auditNativeLstat, open as __auditNativeOpen } from "node:fs/promises";
import { lstat as __auditCallbackLstat, lstatSync as __auditSyncLstat } from "node:fs";
import { createHash as __auditHash } from "node:crypto";
let __auditPaths = [], __auditMetrics = {}, __auditBytes = 0, __auditActive = false;
function __auditRecord(key, start) {
  const row = __auditMetrics[key] ??= { calls: 0, inclusiveMs: 0 };
  row.calls++; row.inclusiveMs += performance.now()-start;
}
globalThis.__auditReset = () => { __auditPaths=[]; __auditMetrics={}; __auditBytes=0; __auditActive=true; };
globalThis.__auditLstat = async p => {
  if (!__auditActive) return __auditNativeLstat(p);
  __auditPaths.push(p); const start=performance.now();
  try { return await __auditNativeLstat(p); } finally { __auditRecord("lstat",start); }
};
globalThis.__auditOpen = async (p, flags) => {
  if (!__auditActive) return __auditNativeOpen(p,flags);
  const start=performance.now(); let h;
  try { h=await __auditNativeOpen(p,flags); } finally { __auditRecord("open",start); }
  return {
    stat: async () => { const t=performance.now(); try { return await h.stat(); } finally { __auditRecord("fstat",t); } },
    read: async (...args) => { const t=performance.now(); const r=await h.read(...args);
      __auditRecord(r.bytesRead===0 ? "readEof" : "readData",t); __auditBytes+=r.bytesRead; return r; },
    close: async () => { const t=performance.now(); try { return await h.close(); } finally { __auditRecord("close",t); } }
  };
};
globalThis.__auditSnapshot = root => {
  __auditActive=false;
  const frequencies=new Map();
  const relative=__auditPaths.map(p => p.slice(root.length+1));
  for(const p of relative) frequencies.set(p,(frequencies.get(p)??0)+1);
  const unique=[...frequencies.keys()];
  return { metrics: __auditMetrics, returnedBytes: __auditBytes, componentCalls:relative.length,
    orderedRelativePathsSha256:__auditHash("sha256").update(JSON.stringify(relative)).digest("hex"),
    uniqueComponentPaths:unique.length, repeatedComponentObservations:relative.length-unique.length,
    frequencyHistogram:Object.fromEntries([...frequencies.values()].reduce((m,n)=>m.set(n,(m.get(n)??0)+1),new Map())),
    hottestPaths:[...frequencies.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,5),
    // This is string/component traffic, NOT measured kernel pathname-walk or disk I/O.
    relativePathCharacters:relative.reduce((n,p)=>n+p.length,0),
    relativeComponentTraffic:relative.reduce((n,p)=>n+p.split("/").length,0) };
};
globalThis.__auditReplay = async () => {
  const paths=__auditPaths; const samples=[];
  const permutations=[["promise","callback","sync"],["callback","sync","promise"],["sync","promise","callback"]];
  for(let round=0;round<permutations.length;round++) for(const api of permutations[round]) {
    const cpu=process.cpuUsage(), start=performance.now(); let calls=0,links=0;
    if(api==="promise") {
      for(const p of paths) { const s=await __auditNativeLstat(p); links+=Number(s.isSymbolicLink()); calls++; }
    } else if(api==="sync") {
      for(const p of paths) { const s=__auditSyncLstat(p); links+=Number(s.isSymbolicLink()); calls++; }
    } else {
      await new Promise((resolve,reject)=>{
        let i=0;
        const next=()=>{
          if(i===paths.length) { resolve(); return; }
          __auditCallbackLstat(paths[i++],(error,s)=>{
            if(error) { reject(error); return; }
            links+=Number(s.isSymbolicLink()); calls++; next();
          });
        };
        next();
      });
    }
    samples.push({round:round+1,api,elapsedMs:performance.now()-start,cpu:process.cpuUsage(cpu),calls,links});
  }
  return samples;
};
`;
const built = await Bun.build({entrypoints:[entry], outdir:output, target:"node", format:"esm", packages:"external", naming:"io-audit.mjs",
  plugins:[{name:"observe-private-io-only",setup(build) {
    build.onLoad({filter:/\.ts$/u},({path:file})=>{
      const original=readFileSync(file,"utf8");
      inputs[path.relative(root,file)]=digest(original);
      let source=original;
      if(file===entry) {
        source=once(source,'"docs/**/*.md"','"docs/testing/cases/**/*.md"');
        source=once(source,'"changes/**/*.md"','"docs/guides/**/*.md"');
        source=once(source,"limits: { maxOccurrences: 100_000, maxTargetReads: 10_000 },",
          "limits: { maxMarkdownBytes: 1048576, maxOccurrences: false, maxTargetReads: false },");
        source=once(source,"const started = performance.now();",
          "globalThis.__auditReset(); const __cpu=process.cpuUsage(); const started = performance.now();");
        source=once(source,"const elapsedMs = performance.now() - started;",
          "const elapsedMs = performance.now() - started; const cpu=process.cpuUsage(__cpu); const ioAudit=globalThis.__auditSnapshot(root); const replays=await globalThis.__auditReplay();");
        source=once(source,"elapsedMs,\n        maxRssKiB:","elapsedMs, cpu, ioAudit, replays,\n        maxRssKiB:");
        source=prelude+source;
      } else if(file.endsWith("/markdown-link-validation/filesystem-probes.ts")) {
        source=once(source,'import { lstat, open, readlink } from "node:fs/promises";',
          'import { readlink } from "node:fs/promises"; const lstat=(p)=>globalThis.__auditLstat(p); const open=(p,f)=>globalThis.__auditOpen(p,f);');
      }
      if(source!==original) transformed[path.relative(root,file)]=digest(source);
      return {contents:source,loader:"ts"};
    });
  }}]});
if(!built.success) throw new Error(built.logs.map(String).join("\n"));
const identities={head:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim(),inputs,transformed,
  bundleSha256:digest(readFileSync(path.join(output,"io-audit.mjs"))),
  methods:Object.fromEntries(["audit-filesystem-cost.ts","consumer-fixture.ts"].map(f=>[f,digest(readFileSync(new URL(f,import.meta.url)))]))};
const evidence:any={startedAt:new Date().toISOString(),
  scope:"Current Product public single-Check Run with I/O observation; then sequential lstat API replay of exactly its ordered paths. No Product edits, no replay safety/cancellation claim, no sync Product candidate.",
  timing:"One untimed Product warmup; one instrumented Product run; replay outside Product timing, 3 rotating API orders. Warm OS metadata, host not exclusive, not physical disk latency.",
  environment:{bun:Bun.version,node:execFileSync("node",["--version"],{encoding:"utf8"}).trim(),platform:process.platform,
    architecture:process.arch,kernel:os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length},
  identities,fixtures:[],samples:[]};
const save=()=>writeFileSync(path.join(output,"filesystem-cost-results.json"),JSON.stringify(evidence,null,2)+"\n");
for(const depth of [4,22,26]) {
  const fixture=makeConsumerFixture(path.join(output,`depth-${depth}.tgz`),1824,depth,true);
  const {sourceManifest,...metadata}=fixture;
  evidence.fixtures.push({...metadata,sourceManifestSha256:digest(JSON.stringify(sourceManifest))});
}
save();
for(const [runtime,depth] of [["bun",4],["bun",22],["bun",26],["node",26]] as const) {
  const start=new Date().toISOString();
  const child=Bun.spawn([runtime,path.join(output,"io-audit.mjs"),path.join(output,`depth-${depth}.tgz`),"real","0",String(depth),"hit"],
    {stdout:"pipe",stderr:"pipe"});
  const [stdout,stderr,code]=await Promise.all([new Response(child.stdout).text(),new Response(child.stderr).text(),child.exited]);
  if(code!==0) throw new Error(`${runtime}/${depth}: ${stdout}\n${stderr}`);
  const measured=JSON.parse(stdout.trim());
  if(measured.depth!==depth || measured.outcome.status!=="passed" || measured.outcome.data.sourceFileCount!==1824 ||
    measured.outcome.data.occurrenceCount!==1193 || measured.outcome.data.targetReadCount!==777 ||
    measured.outcome.data.findingCount!==0 || measured.ioAudit.componentCalls!==1984*depth ||
    measured.ioAudit.returnedBytes!==3320800 || measured.replays.some((s:any)=>s.calls!==1984*depth||s.links!==0)) {
    throw new Error("Workload or ordered replay invariant failed");
  }
  evidence.samples.push({runtime,fixtureDepth:depth,startedAt:start,finishedAt:new Date().toISOString(),...measured});
  evidence.updatedAt=new Date().toISOString(); save();
  console.log(JSON.stringify({runtime,depth,elapsedMs:measured.elapsedMs,metrics:measured.ioAudit.metrics,replays:measured.replays}));
}
for(const [file,expected] of Object.entries(inputs)) if(digest(readFileSync(path.join(root,file)))!==expected) throw new Error(`Input drift: ${file}`);
