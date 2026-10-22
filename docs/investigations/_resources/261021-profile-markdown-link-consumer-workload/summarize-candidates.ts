/** Read-only audit of the retained isolated experiment. No timing threshold becomes a product gate. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const [directory]=process.argv.slice(2);
if(!directory)throw Error("Pass candidate evidence directory");
const read=(f:string)=>JSON.parse(readFileSync(path.join(directory,f),"utf8"));
const hash=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const identity=read("candidate-identities.json"); const safety=read("candidate-safety.json"); const performanceData=read("candidate-performance.json");
for(const data of [safety,performanceData]){
  assert.equal(data.identitySha256,hash(readFileSync(path.join(directory,"candidate-identities.json"))));
  assert.equal(data.driverSha256,hash(readFileSync(new URL("measure-candidates.ts",import.meta.url))));
  assert.ok(data.finishedAt);
}
for(const[file,digest]of Object.entries(identity.methods)) assert.equal(hash(readFileSync(new URL(file,import.meta.url))),digest);
function median(values:number[]){const s=[...values].sort((a,b)=>a-b); const i=Math.floor(s.length/2);return s.length%2?s[i]!:(s[i-1]!+s[i]!)/2;}
function stats(values:number[]){const m=median(values);return{n:values.length,median:m,min:Math.min(...values),max:Math.max(...values),mad:median(values.map(v=>Math.abs(v-m)))};}

assert.equal(safety.exactNonCancellationResultsAndTracesEqual,true);
assert.equal(safety.samples.length,12);
const safetySummary=[];
for(const runtime of ["bun","node"]){
  const samples=safety.samples.filter((s:any)=>s.runtime===runtime&&s.kind==="safety");
  assert.equal(samples.length,3);
  for(const sample of samples){
    assert.equal(sample.exitCode,0);assert.equal(sample.measured.openHandlesAtEnd,0);assert.equal(sample.measured.cases.length,21);
    assert.deepEqual(sample.measured.cases,samples[0].measured.cases);
    const regression=safety.samples.find((s:any)=>s.runtime===runtime&&s.variant===sample.variant&&s.kind==="regression");
    assert.equal(regression.exitCode,0);
    const transcript=regression.stdout+regression.stderr;
    assert.match(transcript,runtime==="bun"?/29 pass/u:/pass 29/u);
    assert.equal(sample.measured.cancellations.length,8);
    for(const c of sample.measured.cancellations){
      if(c.phase==="unhooked-8000-edges")assert.equal(c.result.kind,"unavailable");
      else {assert.equal(c.result.reason.code,"cancelled");assert.equal("data" in c.result,false);}
      if(sample.variant==="callback"&&c.phase!=="unhooked-8000-edges")assert.equal(c.newOperationsAfterAbort,0);
    }
    safetySummary.push({runtime,variant:sample.variant,cases:21,exactBaselineResultsAndTraces:true,regressionTestsPassed:29,
      cancellations:sample.measured.cancellations.map((c:any)=>({phase:c.phase,trigger:c.trigger,eventDeliveryMs:c.eventDeliveryMs,
        settleAfterAbortMs:c.settleAfterAbortMs,newOperationsAfterAbort:c.newOperationsAfterAbort}))});
  }
}

const variants=["baseline","thin","callback"];
const orders=[[0,1,2],[1,2,0],[2,0,1],[2,1,0],[1,0,2],[0,2,1]];
const plain=performanceData.samples.filter((s:any)=>s.mode==="plain");
const profiles=performanceData.samples.filter((s:any)=>s.mode==="profile");
assert.equal(plain.length,54);assert.equal(profiles.length,9);
// The existing measurement entry emits depth=0 for shape=real. Recover the fixture dimension from
// the retained driver's deterministic serial schedule, validating round and variant at every index.
const normalized=plain.map((sample:any,index:number)=>{
  const round=Math.floor(index/9);const position=Math.floor((index%9)/3);
  assert.equal(sample.round,round+1);assert.equal(sample.variant,variants[orders[round]![index%3]!]);
  assert.equal(sample.depth,0);
  return {...sample,fixtureDepth:[4,22,26][(position+round)%3],rawSampleIndex:index};
});
for(const sample of performanceData.samples){
  assert.equal(sample.outcome.status,"passed");assert.deepEqual(sample.outcome.data,{sourceFileCount:1824,occurrenceCount:1193,targetReadCount:777,findingCount:0,rejectedInputCount:0});
}
const earlier=JSON.parse(readFileSync(new URL("depth-results.json",import.meta.url),"utf8"));
for(const fixture of performanceData.fixtures){
  const old=earlier.fixtures.find((f:any)=>f.depth===fixture.depth);assert.equal(fixture.sourceManifestSha256,old.sourceManifestSha256);
  assert.equal(fixture.sourceBytes,3320000);assert.equal(fixture.sourceCount,1824);
}
const groups=[];const paired=[];
for(const depth of [4,22,26]){
  for(const variant of variants){
    const group=normalized.filter((s:any)=>s.fixtureDepth===depth&&s.variant===variant);
    assert.equal(group.length,6);
    groups.push({depth,variant,elapsedMs:stats(group.map((s:any)=>s.elapsedMs)),
      cpuMs:stats(group.map((s:any)=>(s.cpu.user+s.cpu.system)/1000)),maxRssKiB:stats(group.map((s:any)=>s.maxRssKiB))});
  }
  for(const variant of variants.slice(1)){
    const ratios=Array.from({length:6},(_,i)=>{
      const baseline=normalized.find((s:any)=>s.fixtureDepth===depth&&s.variant==="baseline"&&s.round===i+1)!;
      const candidate=normalized.find((s:any)=>s.fixtureDepth===depth&&s.variant===variant&&s.round===i+1)!;
      return candidate.elapsedMs/baseline.elapsedMs;
    });
    paired.push({depth,variant,ratios,medianRatio:median(ratios),medianSavedFraction:1-median(ratios),fasterPairs:ratios.filter(r=>r<1).length});
  }
}
const profileSummary=profiles.map((sample:any,index:number)=>{
  const depth=[4,22,26][Math.floor(index/3)]!;assert.equal(sample.variant,variants[index%3]);
  const m=sample.profile.metrics,c=sample.profile.counters;
  assert.equal(c.lstatCalls,1984*depth);assert.equal(c.openCalls,1856);assert.equal(c.fileHandleReturnedBytes,3320800);assert.equal(c.fileHandleReadCalls,3712);
  assert.equal(m["markdown-parser.ts:parseMarkdownLinkFacts"]?.calls??0,0);
  assert.equal(m["session.ts:#readCacheFile"].calls,1);
  assert.equal(m["source-traversal.ts:checkpoint"].calls,1835);assert.equal(m["resolver-engine.ts:#checkpoint"].calls,307);
  return {depth,variant:sample.variant,publicRunMs:sample.elapsedMs,
    nativeMs:m["execution.ts:executeMarkdownLinkValidation"].inclusiveMs,
    sourceMs:m["source-traversal.ts:collectSourceReferences"].inclusiveMs,
    resolverMs:m["resolver-engine.ts:resolveAll"].inclusiveMs,
    probeMs:m["filesystem-probes.ts:probeRootContainedPath"].inclusiveMs,
    readerMs:m["filesystem-probes.ts:readRegularFile"].inclusiveMs,
    checkpointMs:m["source-traversal.ts:checkpoint"].inclusiveMs+m["resolver-engine.ts:#checkpoint"].inclusiveMs,counters:c};
});
console.log(JSON.stringify({
  scope:"Isolated virtual A/B probe replacements; Product source unchanged; Bun performance, Bun and Node safety/regression",
  startedAt:performanceData.startedAt,finishedAt:performanceData.finishedAt,plainSamples:54,profileSamples:9,
  fixtureDepthProvenance:"Recovered from the retained driver's fixed serial schedule; raw entry depth=0 is its unused real-mode CLI placeholder",
  allAssertionsPassed:true,groups,paired,profiles:profileSummary,safety:safetySummary,
  normalizedSampleIndex:normalized.map((s:any)=>({rawSampleIndex:s.rawSampleIndex,fixtureDepth:s.fixtureDepth,variant:s.variant,round:s.round}))
},null,2));
