/** Sequential safety and full public-Run experiments. No Product edits or external writes.
 * Usage: bun run <this file> <owned built directory> <safety|performance>
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { makeConsumerFixture } from "./consumer-fixture.ts";
const [directory,phase]=process.argv.slice(2);
if(!directory||!["safety","performance"].includes(phase??""))throw Error("Pass owned built directory and phase");
const output=path.resolve(directory), variants=["baseline","direct-sync","worker-sync","worker-async","worker-fine","adaptive"];
const hash=(b:string|Uint8Array)=>createHash("sha256").update(b).digest("hex");
const read=(file:string)=>JSON.parse(readFileSync(path.join(output,file),"utf8"));
const identity=read("probe-batch-identities.json");
for(const[file,h]of Object.entries(identity.inputs))assert.equal(hash(readFileSync(file)),h,`Input drift: ${file}`);
for(const[file,h]of Object.entries(identity.bundles))assert.equal(hash(readFileSync(path.join(output,file))),h,`Bundle drift: ${file}`);
const evidenceFile=`probe-batch-${phase}.json`;
if(existsSync(path.join(output,evidenceFile)))throw Error("Do not overwrite retained phase evidence; use a fresh directory");
const evidence:any={startedAt:new Date().toISOString(),identitySha256:hash(readFileSync(path.join(output,"probe-batch-identities.json"))),
  driverSha256:hash(readFileSync(import.meta.filename)),environment:{bun:Bun.version,node:execFileSync("node",["--version"],{encoding:"utf8"}).trim(),
    kernel:os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,head:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim()},
  scope:"Temporary Product entry transforms; serial same-path checks; per-resolver worker created and closed inside each Run; no Product edits",samples:[]};
const save=()=>writeFileSync(path.join(output,evidenceFile),JSON.stringify(evidence,null,2)+"\n");
async function child(command:string[],limit=120000){
  const c=Bun.spawn(command,{stdout:"pipe",stderr:"pipe"});let timedOut=false;
  const timer=setTimeout(()=>{timedOut=true;c.kill();},limit);
  try{const[stdout,stderr,exitCode]=await Promise.all([new Response(c.stdout).text(),new Response(c.stderr).text(),c.exited]);return{stdout,stderr,exitCode,timedOut};}
  finally{clearTimeout(timer);}
}
if(phase==="safety"){
  for(const runtime of ["bun","node"])for(const variant of variants){
    const result=await child([runtime,path.join(output,`${variant}-safety-parent.mjs`)]);
    evidence.samples.push({runtime,variant,kind:"safety",...result,...(result.exitCode===0?{measured:JSON.parse(result.stdout.trim())}:{})});save();
    assert.equal(result.exitCode,0,result.stderr);
    const regression=await child(runtime==="bun"?[runtime,"test",path.join(output,`${variant}-regression-parent.test.mjs`)]:
      [runtime,"--test",path.join(output,`${variant}-regression-parent.test.mjs`)]);
    evidence.samples.push({runtime,variant,kind:"regression",...regression});save();assert.equal(regression.exitCode,0,regression.stderr+regression.stdout);
    console.log(JSON.stringify({runtime,variant,behaviorCases:evidence.samples.at(-2).measured.cases.length,regressionPassed:true}));
  }
  for(const runtime of ["bun","node"]){
    const samples=evidence.samples.filter((s:any)=>s.runtime===runtime&&s.kind==="safety");
    const normalized=(s:any)=>s.measured.cases.filter((c:any)=>c.name!=="worker-abnormal-exit").map((c:any)=>({...c,
      ...(c.trace?{trace:c.trace.map(({requested,...rest}:any)=>rest)}:{})}));
    for(const s of samples)assert.deepEqual(normalized(s),normalized(samples[0]),`${runtime}/${s.variant} behavior/access trace differs`);
  }
  evidence.normalizedBehaviorAndTracesEqual=true;
}else{
  const safety=read("probe-batch-safety.json");assert.equal(safety.normalizedBehaviorAndTracesEqual,true);assert.equal(safety.identitySha256,evidence.identitySha256);
  evidence.timing="New process per sample. Large fixtures: one untimed cache warmup then public single-Check Run. Small fixture: no warmup/cache. Imports/extraction excluded, worker creation/exit included. Host not exclusive; no OS cache flush.";
  evidence.fixtures=[4,22,26].map(D=>{const{sourceManifest,...f}=makeConsumerFixture(path.join(output,`batch-depth-${D}.tgz`),1824,D,true);
    return{...f,sourceManifestSha256:hash(JSON.stringify(sourceManifest))};});
  const small=mkdtempSync(path.join(os.tmpdir(),"mdlink-batch-small-"));
  try{mkdirSync(path.join(small,"docs/guides/d"),{recursive:true});for(let i=0;i<10;i++)writeFileSync(path.join(small,`docs/guides/d/s-${i}.md`),`# Target\n${i<9?`[x](s-${i+1}.md#target)` : ""}\n`);
    execFileSync("tar",["-czf",path.join(output,"batch-small.tgz"),"-C",small,"."]);}finally{rmSync(small,{recursive:true,force:true});}
  // Balanced Latin/Williams order: each variant occupies each position once across six rounds.
  const first=[0,1,5,2,4,3], orders=Array.from({length:6},(_,i)=>first.map(n=>(n+i)%6));
  evidence.orders=orders.map(a=>a.map(i=>variants[i]));save();
  for(let round=0;round<6;round++)for(let p=0;p<4;p++){
    const depth=[4,22,26,0][(p+round)%4]!;
    for(const v of orders[round]!)await sample("bun",depth,variants[v]!,"plain",round+1);
  }
  for(let round=0;round<3;round++)for(const depth of [26,0])for(const v of orders[round]!)await sample("node",depth,variants[v]!,"plain",round+1);
  for(const depth of [4,22,26])for(const variant of variants)await sample("bun",depth,variant,"profile",1);
}
evidence.finishedAt=new Date().toISOString();save();
async function sample(runtime:string,depth:number,variant:string,mode:string,round:number){
  const startedAt=new Date().toISOString(),loadBefore=os.loadavg();
  const r=await child([runtime,path.join(output,`${variant}-${mode}-parent.mjs`),path.join(output,depth?`batch-depth-${depth}.tgz`:"batch-small.tgz"),
    "real",depth?"1824":"10",String(depth||4),depth?"hit":"off"]);
  assert.equal(r.exitCode,0,r.stdout+r.stderr);const measured=JSON.parse(r.stdout.trim());
  assert.deepEqual(measured.outcome.data,{sourceFileCount:depth?1824:10,occurrenceCount:depth?1193:9,targetReadCount:depth?777:9,findingCount:0,rejectedInputCount:0});
  assert.equal(measured.outcome.status,"passed");
  if(mode==="profile"){
    const c=measured.counters;assert.equal(c.lstatCalls,1984*depth);for(const k of ["openCalls","fstatCalls","closeCalls"])assert.equal(c[k],1856,k);
    assert.equal(c.fileHandleReadCalls,3712);assert.equal(c.fileHandleReturnedBytes,3320800);
    assert.equal(c.bufferAllocationBytes,variant==="adaptive"?3322656:1946158912);
    assert.equal(measured.metrics["markdown-parser.ts:parseMarkdownLinkFacts"]?.calls??0,0);
    assert.equal(measured.metrics["source-traversal.ts:checkpoint"].calls,1835);assert.equal(measured.metrics["resolver-engine.ts:#checkpoint"].calls,307);
    if(variant.startsWith("worker-")){assert.equal(c.workersStarted,1);assert.equal(c.workersExited,1);assert.equal(c.workerExitCodeSum,0);
      assert.equal(c.workerRequests,variant==="worker-fine"?1984*depth:1984);}
  }
  evidence.samples.push({runtime,variant,mode,fixtureDepth:depth,round,startedAt,finishedAt:new Date().toISOString(),loadBefore,loadAfter:os.loadavg(),...measured});save();
  console.log(JSON.stringify({runtime,variant,mode,depth,round,elapsedMs:measured.elapsedMs}));
}
