/** Read-only independent summary of retained whole-Run trials and semantic checks. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
const [directory]=process.argv.slice(2);if(!directory)throw Error("Pass evidence directory");
const read=(f:string)=>JSON.parse(readFileSync(path.join(directory,f),"utf8"));
const hash=(b:string|Uint8Array)=>createHash("sha256").update(b).digest("hex");
const perf=read("probe-batch-performance.json"),safe=read("probe-batch-safety.json"),identity=read("probe-batch-identities.json");
assert.equal(perf.identitySha256,hash(readFileSync(path.join(directory,"probe-batch-identities.json"))));
assert.equal(safe.identitySha256,perf.identitySha256);assert.equal(safe.normalizedBehaviorAndTracesEqual,true);
const median=(v:number[])=>{const s=[...v].sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]!:(s[i-1]!+s[i]!)/2;};
const stats=(v:number[])=>{const m=median(v);return{n:v.length,medianMs:m,minMs:Math.min(...v),maxMs:Math.max(...v),madMs:median(v.map(n=>Math.abs(n-m)))};};
const variants=["baseline","direct-sync","worker-sync","worker-async","worker-fine","adaptive"];
for(const f of perf.fixtures){assert.equal(f.sourceCount,1824);assert.equal(f.sourceBytes,3320000);assert.equal(f.occurrenceCount,1193);assert.equal(f.logicalDirectCount,777);}
const groups:any[]=[];
for(const runtime of ["bun","node"])for(const D of runtime==="bun"?[0,4,22,26]:[0,26])for(const variant of variants){
  const rows=perf.samples.filter((s:any)=>s.runtime===runtime&&s.fixtureDepth===D&&s.variant===variant&&s.mode==="plain");
  assert.equal(rows.length,runtime==="bun"?6:3);
  for(const s of rows){assert.equal(s.outcome.status,"passed");assert.equal(s.outcome.data.sourceFileCount,D?1824:10);assert.equal(s.outcome.data.findingCount,0);assert.equal(s.depth,D||4);}
  const baseline=perf.samples.filter((s:any)=>s.runtime===runtime&&s.fixtureDepth===D&&s.variant==="baseline"&&s.mode==="plain");
  const ratios=rows.map((s:any)=>s.elapsedMs/baseline.find((b:any)=>b.round===s.round).elapsedMs);
  groups.push({runtime,fixtureDepth:D,variant,...stats(rows.map((s:any)=>s.elapsedMs)),
    pairedMedianSavedFraction:1-median(ratios),fasterPairs:ratios.filter((r:number)=>r<1).length,
    medianCpuMs:median(rows.map((s:any)=>(s.cpu.user+s.cpu.system)/1000)),
    processPeakRssKiB:{median:median(rows.map((s:any)=>s.maxRssKiB)),min:Math.min(...rows.map((s:any)=>s.maxRssKiB)),max:Math.max(...rows.map((s:any)=>s.maxRssKiB))}});
}
const profiles=perf.samples.filter((s:any)=>s.mode==="profile").map((s:any)=>{
  const c=s.counters,D=s.fixtureDepth;
  assert.equal(c.lstatCalls,1984*D);assert.equal(c.openCalls,1856);assert.equal(c.fstatCalls,1856);assert.equal(c.closeCalls,1856);
  assert.equal(c.fileHandleReadCalls,3712);assert.equal(c.fileHandleReturnedBytes,3320800);
  assert.equal(c.bufferAllocationBytes,s.variant==="adaptive"?3322656:1946158912);
  assert.equal(s.metrics["markdown-parser.ts:parseMarkdownLinkFacts"]?.calls??0,0);
  assert.equal(s.metrics["source-traversal.ts:checkpoint"].calls,1835);assert.equal(s.metrics["resolver-engine.ts:#checkpoint"].calls,307);
  if(s.variant.startsWith("worker-")){assert.equal(c.workersStarted,1);assert.equal(c.workersExited,1);assert.equal(c.workerExitCodeSum,0);
    assert.equal(c.workerRequests,s.variant==="worker-fine"?1984*D:1984);assert.equal(c.listenerRegistrationFallbacks??0,0);}
  return{variant:s.variant,depth:D,elapsedMs:s.elapsedMs,counters:c,metrics:s.metrics};
});assert.equal(profiles.length,18);
const safety=safe.samples.filter((s:any)=>s.kind==="safety").map((s:any)=>{
  assert.equal(s.exitCode,0);assert.equal(s.measured.handlesAtEnd,0);
  assert.equal(s.measured.counters.workersStarted??0,s.measured.counters.workersExited??0);
  assert.equal(s.measured.cases.length,s.variant.startsWith("worker-")?25:24);
  assert.equal(s.measured.cancellations.length,5);
  return{runtime:s.runtime,variant:s.variant,cases:s.measured.cases.length,
    cancellations:s.measured.cancellations,responsiveness:s.measured.responsiveness,
    workersStarted:s.measured.counters.workersStarted??0,workersExited:s.measured.counters.workersExited??0};
});assert.equal(safety.length,12);
const regressions=safe.samples.filter((s:any)=>s.kind==="regression");assert.equal(regressions.length,12);
for(const r of regressions)assert.equal(r.exitCode,0);
const regressionCounts=regressions.map((r:any)=>{
  const log=r.stdout+"\n"+r.stderr, match=log.match(/(?:# tests |ℹ tests )(\d+)/u)??log.match(/(\d+) pass\b/u);
  assert.ok(match);assert.equal(Number(match[1]),29);return{runtime:r.runtime,variant:r.variant,tests:Number(match[1])};
});
const commonCases=(s:any)=>s.measured.cases.filter((c:any)=>c.name!=="worker-abnormal-exit").map((c:any)=>({...c,
  ...(c.trace?{trace:c.trace.map(({requested,...rest}:any)=>rest)}:{})}));
for(const runtime of ["bun","node"]){const ss=safe.samples.filter((s:any)=>s.kind==="safety"&&s.runtime===runtime);for(const s of ss)assert.deepEqual(commonCases(s),commonCases(ss[0]));}
console.log(JSON.stringify({scope:perf.scope,startedAt:perf.startedAt,finishedAt:perf.finishedAt,
  allAssertionsPassed:true,plainSamples:perf.samples.filter((s:any)=>s.mode==="plain").length,profileSamples:profiles.length,
  semanticBoundary:"Operation barriers validate ordered effects, not production timing. Adaptive normal traces ignore requested capacity only; actual results/bytes agree. Delayed host calls are controlled surrogates, not real slow-storage benchmarks.",
  groups,profiles,safety,regressionCombinations:regressions.length,regressionCounts,
  summaryMethodSha256:hash(readFileSync(import.meta.filename)),driverSha256:perf.driverSha256,
  identities:{sourceInputCount:Object.keys(identity.inputs).length,methods:identity.methods},
  evidenceSha256:Object.fromEntries(["probe-batch-performance.json","probe-batch-safety.json","probe-batch-identities.json"].map(f=>[f,hash(readFileSync(path.join(directory,f)))]))},null,2));
