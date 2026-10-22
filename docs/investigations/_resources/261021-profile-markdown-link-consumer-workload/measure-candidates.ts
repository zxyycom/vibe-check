/** Sequential isolated safety/regression runs, followed by counterbalanced Bun performance trials. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { makeConsumerFixture } from "./consumer-fixture.ts";

const [directory,phase] = process.argv.slice(2);
if(!directory||!["safety","performance"].includes(phase??""))throw Error("Usage: measure-candidates.ts <fresh built directory> <safety|performance>");
const output=path.resolve(directory);const variants=["baseline","thin","callback"];
const digest=(bytes:string|Uint8Array)=>createHash("sha256").update(bytes).digest("hex");
const identity=JSON.parse(readFileSync(path.join(output,"candidate-identities.json"),"utf8"));
for(const[file,hash]of Object.entries(identity.inputs))assert.equal(digest(readFileSync(file)),hash,`Source drift: ${file}`);
for(const[file,hash]of Object.entries(identity.bundles))assert.equal(digest(readFileSync(path.join(output,file))),hash,`Bundle drift: ${file}`);
const environment={bun:Bun.version,node:execFileSync("node",["--version"],{encoding:"utf8"}).trim(),kernel:os.release(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,
  head:execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim()};
const evidence:any={startedAt:new Date().toISOString(),environment,identitySha256:digest(readFileSync(path.join(output,"candidate-identities.json"))),
  driverSha256:digest(readFileSync(import.meta.filename)),samples:[]};
const save=()=>writeFileSync(path.join(output,`candidate-${phase}.json`),JSON.stringify(evidence,null,2)+"\n");
async function child(command:string[]){
  const process=Bun.spawn(command,{stdout:"pipe",stderr:"pipe"});
  const[stdout,stderr,exitCode]=await Promise.all([new Response(process.stdout).text(),new Response(process.stderr).text(),process.exited]);
  return {stdout,stderr,exitCode};
}
if(phase==="safety"){
  for(const runtime of ["bun","node"])for(const variant of variants){
    const executable=runtime==="bun"?process.execPath:"node";
    const result=await child([executable,path.join(output,`${variant}-safety.mjs`)]);
    evidence.samples.push({runtime,variant,kind:"safety",...result,
      ...(result.exitCode===0?{measured:JSON.parse(result.stdout.trim())}:{})});save();
    assert.equal(result.exitCode,0,result.stderr);
    const regression=await child(runtime==="bun"?[executable,"test",path.join(output,`${variant}-regression.test.mjs`)]:
      [executable,"--test",path.join(output,`${variant}-regression.test.mjs`)]);
    evidence.samples.push({runtime,variant,kind:"regression",...regression});save();
    assert.equal(regression.exitCode,0,regression.stderr+regression.stdout);
    console.log(JSON.stringify({runtime,variant,safetyCases:evidence.samples.at(-2).measured.caseCount,regressionPassed:true}));
  }
  for(const runtime of ["bun","node"]){
    const samples=evidence.samples.filter((s:any)=>s.runtime===runtime&&s.kind==="safety");
    for(const sample of samples)assert.deepEqual(sample.measured.cases,samples[0].measured.cases,`Safety result/trace differs: ${runtime}/${sample.variant}`);
  }
  evidence.exactNonCancellationResultsAndTracesEqual=true;
}else{
  const safety=JSON.parse(readFileSync(path.join(output,"candidate-safety.json"),"utf8"));
  assert.equal(safety.exactNonCancellationResultsAndTracesEqual,true);assert.equal(safety.identitySha256,evidence.identitySha256);
  evidence.fixtures=[4,22,26].map(depth=>{
    const {sourceManifest,...fixture}=makeConsumerFixture(path.join(output,`candidate-depth-${depth}.tgz`),1824,depth,true);
    return {...fixture,sourceManifestSha256:digest(JSON.stringify(sourceManifest))};
  });
  const orders=[[0,1,2],[1,2,0],[2,0,1],[2,1,0],[1,0,2],[0,2,1]];
  // Six rounds cover every variant ordering; each depth is rotated to reduce temporal skew.
  for(let round=0;round<6;round++)for(let p=0;p<3;p++){
    const depth=[4,22,26][(p+round)%3]!;
    for(const v of orders[round]!)await sample(depth,variants[v]!,"plain",round+1);
  }
  for(const depth of [4,22,26])for(const variant of variants)await sample(depth,variant,"profile",1);
}
evidence.finishedAt=new Date().toISOString();save();

async function sample(depth:number,variant:string,mode:string,round:number){
  const startedAt=new Date().toISOString();const loadBefore=os.loadavg();
  const result=await child([process.execPath,"run",path.join(output,`${variant}-${mode}.mjs`),path.join(output,`candidate-depth-${depth}.tgz`),"real","0","0","hit"]);
  assert.equal(result.exitCode,0,result.stdout+result.stderr);
  const measured=JSON.parse(result.stdout.trim());
  assert.equal(measured.outcome.status,"passed");assert.deepEqual(measured.outcome.data,{sourceFileCount:1824,occurrenceCount:1193,targetReadCount:777,findingCount:0,rejectedInputCount:0});
  if(mode==="profile"){
    const c=measured.profile.counters;const m=measured.profile.metrics;
    assert.equal(c.lstatCalls,1984*depth);assert.equal(c.openCalls,1856);assert.equal(c.fileHandleReadCalls,3712);assert.equal(c.fileHandleReturnedBytes,3320800);
    assert.equal(m["markdown-parser.ts:parseMarkdownLinkFacts"]?.calls??0,0);
    assert.equal(m["source-traversal.ts:checkpoint"].calls,1835);assert.equal(m["resolver-engine.ts:#checkpoint"].calls,307);
  }
  evidence.samples.push({variant,mode,depth,round,startedAt,finishedAt:new Date().toISOString(),loadBefore,loadAfter:os.loadavg(),...measured});save();
  console.log(JSON.stringify({variant,mode,depth,round,elapsedMs:measured.elapsedMs}));
}
