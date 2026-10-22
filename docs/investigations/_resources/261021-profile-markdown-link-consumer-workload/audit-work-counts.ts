/** Read-only theory/count reconciliation. Does not run or change Product.
 * Usage: bun run <this file> <evidence directory> [filesystem-cost-results.json]
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const [directory, ioFile] = process.argv.slice(2);
if(!directory) throw new Error("Pass evidence directory");
const read=(file:string)=>JSON.parse(readFileSync(path.join(directory,file),"utf8"));
const digest=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const depth=read("depth-results.json"), candidates=read("candidate-performance.json");
const median=(v:number[])=>{const s=[...v].sort((a,b)=>a-b),i=Math.floor(s.length/2);return s.length%2?s[i]!:(s[i-1]!+s[i]!)/2;};
const N=1824,E=1193,L=777,T=296,O=136,H=32;
const Q=N+T-O, R=N+H, B=3320000+H*25, M=1048576, C=N+1;
const sourceCheckpoints=N+3+2*Math.floor(E/256);
const resolverCheckpoints=T+3+2*Math.floor(E/256);
const expected=(D:number)=>({
  "filesystem-probes.ts:probeRootContainedPath":Q,
  "filesystem-probes.ts:advanceRootContainedPathProbe":Q*D,
  "filesystem-probes.ts:rootContainedPathStatus":Q*D,
  "filesystem-probes.ts:endpointFromStatus":Q,
  "filesystem-probes.ts:readRegularFile":R,
  "filesystem-probes.ts:readBoundedBytes":R,
  "resolver-engine.ts:readSource":N,
  "resolver-engine.ts:#observe":T,
  "resolver-engine.ts:#chargeBatch":T,
  "resolver-engine.ts:#checkpoint":resolverCheckpoints,
  "source-traversal.ts:checkpoint":sourceCheckpoints,
  "source-traversal.ts:registerSourceOccurrences":N,
  "source-traversal.ts:exceedsOccurrenceBudget":E,
  "reference-graph.ts:referenceNode":N+L,
  "reference-graph.ts:registerReference":E,
  "reference-graph.ts:settleTargetEdge":L,
  "records.ts:buildMarkdownLinkRecordCandidate":E,
  "target-observation.ts:authorizeTargetNode":T,
  "target-observation.ts:observeContainedEndpoint":T-O,
  "target-observation.ts:observeTargetDemand":T,
  "target-observation.ts:readTargetFacts":H,
  "session.ts:parse":R,
  "session.ts:#cachedFacts":R,
  "session.ts:#restoreOnce":R,
  "session.ts:#restore":1,
  "session.ts:#readCacheFile":1,
  "session.ts:#restoreContents":1,
  "session.ts:#parseFreshFacts":0,
  "session.ts:decodeMarkdownBytes":1,
  "session.ts:#publish":1,
  "payload.ts:markdownBytesDigest":R,
  "payload.ts:parseCacheEnvelopeLine":C,
  "payload.ts:parseMarkdownLinkParseFactsPayload":C,
  "payload.ts:parseSourceRange":C+E,
  "payload.ts:parseSourcePosition":2*(C+E),
  "markdown-parser.ts:parseMarkdownLinkFacts":0
});
const reconcile=(sample:any)=>{
  const D=sample.fixtureDepth, metrics=sample.profile.metrics, rows=Object.entries(expected(D)).map(([key,predicted])=>{
    const observed=metrics[key]?.calls??0;
    if(observed!==predicted) throw new Error(`${D} ${key}: expected ${predicted}, got ${observed}`);
    return {key,predicted,observed};
  });
  const counters={bufferAllocationBytes:R*(M+1),fileHandleReadCalls:2*R,fileHandleReturnedBytes:B};
  for(const [k,v] of Object.entries(counters)) if(sample.profile.counters[k]!==v) throw new Error(`Counter mismatch: ${k}`);
  const ms=(key:string)=>metrics[key]?.inclusiveMs??0;
  return {depth:D,allCountsMatch:true,rows,counters,publicRunMs:sample.elapsedMs,
    componentStatusUsPerCall:1000*ms("filesystem-probes.ts:rootContainedPathStatus")/(Q*D),
    nativeMs:ms("execution.ts:executeMarkdownLinkValidation"),
    probeMs:ms("filesystem-probes.ts:probeRootContainedPath"),
    collectionMs:ms("collection.ts:collectProjectFiles"),readerMs:ms("filesystem-probes.ts:readRegularFile"),
    cacheParseSessionMs:ms("session.ts:parse"),
    checkpointMs:ms("source-traversal.ts:checkpoint")+ms("resolver-engine.ts:#checkpoint")};
};
const profiles=depth.samples.filter((s:any)=>s.mode==="trace").map(reconcile);
const candidateProfiles=candidates.samples.filter((s:any)=>s.mode==="profile").map((s:any,index:number)=>{
  // This driver's real-mode depth=0 is a CLI placeholder; fixed retained serial schedule is authoritative.
  const D=[4,22,26][Math.floor(index/3)]!;
  if(s.variant!==["baseline","thin","callback"][index%3]||s.round!==1) throw new Error("Candidate profile schedule mismatch");
  const c=s.profile.counters;
  const wanted={lstatCalls:Q*D,openCalls:R,fileHandleReadCalls:2*R,fileHandleReturnedBytes:B,bufferAllocationBytes:R*(M+1)};
  for(const [k,v] of Object.entries(wanted)) if(c[k]!==v) throw new Error(`Candidate counter mismatch ${index}/${k}`);
  return {rawSampleIndex:candidates.samples.indexOf(s),depth:D,variant:s.variant,counts:wanted};
});
if(profiles.length!==3||candidateProfiles.length!==9) throw new Error("Missing profiles");
const groups=[4,10,16,22,26].map(D=>({depth:D,medianMs:median(depth.samples.filter((s:any)=>
  s.phase==="confirm"&&s.mode==="plain"&&s.fixtureDepth===D).map((s:any)=>s.elapsedMs))}));
const slope=(groups[1]!.medianMs-groups[0]!.medianMs)/(10-4), intercept=groups[0]!.medianMs-slope*4;
const holdout=groups.slice(2).map(g=>({depth:g.depth,predictedMs:intercept+slope*g.depth,observedMs:g.medianMs,
  errorFraction:(intercept+slope*g.depth-g.medianMs)/g.medianMs}));
const result:any={scope:"Theory from fixed fixture and current algorithm, reconciled against retained full profiles and isolated candidate counters",
  inputs:{N,E,L,T,sourceTargetOverlap:O,targetOnlyMarkdown:H,observedPaths:Q,regularReads:R,bodyBytes:B,maxMarkdownBytes:M,cacheLines:C},
  equations:{components:"K=(N+T-O)*D, for these uniform-depth, symlink-free paths",
    regularReads:"R=N+H",fileHandleReads:"2R, one complete data result plus EOF for these small unchanged files",
    allocation:"R*(M+1); cumulative allocation, not live RSS or physical bytes touched",
    sourceCheckpoints:"N+3+2*floor(E/256)",resolverCheckpoints:"T+3+2*floor(E/256)",
    cacheLines:"N+1, because the 32 pure Markdown targets have identical content",
    pathComponentTraffic:"Q*D*(D+1)/2; a lexical traffic model, not a count of kernel operations"},
  profiles,candidateProfiles,
  shallowCalibratedWallModel:{calibrationDepths:[4,10],interceptMs:intercept,slopeMsPerDepth:slope,
    effectiveUsPerAddedComponent:1000*slope/Q,holdout,
    limitation:"Retrospective shape check, not an independent prospective prediction or portable latency bound"},
  allocationAmplification:R*(M+1)/B,
  methodSha256:digest(readFileSync(new URL(import.meta.url))),
  inputSha256:Object.fromEntries(["depth-results.json","candidate-performance.json"].map(f=>[f,digest(readFileSync(path.join(directory,f)))]))};
if(ioFile) {
  const io=JSON.parse(readFileSync(ioFile,"utf8"));
  result.inputSha256["filesystem-cost-results.json"]=digest(readFileSync(ioFile));
  const previousIdentity=read("depth-bundle-identities.json");
  const shared=Object.keys(previousIdentity.inputs).filter(k=>io.identities.inputs[k]);
  if(shared.some(k=>previousIdentity.inputs[k]!==io.identities.inputs[k])) throw new Error("Historical input drift");
  for(const fixture of io.fixtures) {
    const previous=depth.fixtures.find((f:any)=>f.depth===fixture.depth);
    if(!previous||previous.sourceManifestSha256!==fixture.sourceManifestSha256) throw new Error("Fixture manifest drift");
  }
  result.ioIdentity={sameHistoricalInputCount:shared.length,fixtureManifestHashesMatch:true};
  result.io=io.samples.map((s:any)=>{
    const D=s.fixtureDepth, a=s.ioAudit;
    if(a.componentCalls!==Q*D||a.relativeComponentTraffic!==Q*D*(D+1)/2||a.returnedBytes!==B) throw new Error("I/O trace model mismatch");
    for(const k of ["open","fstat","readData","readEof","close"]) if(a.metrics[k].calls!==R) throw new Error(`I/O operation mismatch ${k}`);
    const apis=["promise","callback","sync"].map(api=>{
      const samples=s.replays.filter((r:any)=>r.api===api);
      if(samples.length!==3||samples.some((r:any)=>r.calls!==Q*D||r.links!==0)) throw new Error("Replay mismatch");
      return {api,n:samples.length,medianMs:median(samples.map((r:any)=>r.elapsedMs)),
        minMs:Math.min(...samples.map((r:any)=>r.elapsedMs)),maxMs:Math.max(...samples.map((r:any)=>r.elapsedMs)),
        medianCpuMs:median(samples.map((r:any)=>(r.cpu.user+r.cpu.system)/1000))};
    });
    return {runtime:s.runtime,depth:D,publicInstrumentedRunMs:s.elapsedMs,componentCalls:a.componentCalls,
      uniqueComponentPaths:a.uniqueComponentPaths,repeatedComponentObservations:a.repeatedComponentObservations,
      repeatedFraction:a.repeatedComponentObservations/a.componentCalls,
      relativePathCharacters:a.relativePathCharacters,relativeComponentTraffic:a.relativeComponentTraffic,
      metrics:a.metrics,apiReplay:apis,promiseToSyncRatio:apis[0]!.medianMs/apis[2]!.medianMs};
  });
}
console.log(JSON.stringify(result,null,2));
