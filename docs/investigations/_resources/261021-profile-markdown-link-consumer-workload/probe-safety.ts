/** Virtual replacement of the Product-owned measurement entry; relative imports resolve at that entry. */
import assert from "node:assert/strict";
import { constants } from "node:fs";
import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { probeRootContainedPath, readRegularFile } from "./filesystem-probes.ts";
import { executeMarkdownLinkValidation } from "./execution.ts";
import { execute, MARKDOWN_LINK_OPTIONS } from "./constructor.test-support.ts";
import { createdResolver, readSource, requestFor } from "./local-resolver.test-support.ts";

const workspace = await fs.mkdtemp(path.join(os.tmpdir(),"mdlink-candidate-safety-"));
const root = path.join(workspace,"root"); const outside = path.join(workspace,"outside");
await fs.mkdir(root); await fs.mkdir(outside);
const cases: any[] = []; const cancellations: any[] = [];
let trace: any[] = []; let before: any; let after: any; let handles = 0;
const normalize = (p: string) => p.replaceAll(workspace,"$W");
const save = (name: string, value: unknown) => cases.push({name,result:JSON.parse(JSON.stringify(value).replaceAll(workspace,"$W")),trace:[...trace]});
const reset = () => { trace=[]; before=undefined; after=undefined; };
const write = async (relative: string, body="# Target\n") => {
  const file=path.join(root,relative); await fs.mkdir(path.dirname(file),{recursive:true}); await fs.writeFile(file,body);
};
globalThis.__candidateObserve = async (op: string,p: string,args: any[],invoke: () => Promise<any>) => {
  trace.push({op,path:normalize(p),...(op==="open"?{flags:args[0]}:{})});
  try {
    await before?.(op,p,args);
    let value=await invoke();
    if(op==="open") {
      handles++;
      const read=value.read.bind(value); const close=value.close.bind(value);
      value.read=async (...a: any[]) => { const r=await read(...a); trace.push({op:"read",path:normalize(p),requested:a[2],returned:r.bytesRead}); return r; };
      value.close=async () => { try { return await close(); } finally { handles--; trace.push({op:"close",path:normalize(p)}); } };
    }
    await after?.(op,p,value);
    return value;
  } catch(error: any) { trace.push({op:"error",code:error.code??error.name,path:normalize(p)}); throw error; }
};
const options={...MARKDOWN_LINK_OPTIONS,limits:{...MARKDOWN_LINK_OPTIONS.limits,maxOccurrences:false,maxTargetReads:false}};
try {
  await write("ordinary/a.md"); await fs.mkdir(path.join(root,"directory"));
  await fs.symlink("ordinary",path.join(root,"inside")); await fs.symlink(root,path.join(root,"reset"));
  await fs.writeFile(path.join(outside,"secret.md"),"# Outside\n");
  await fs.symlink(root,path.join(outside,"back")); await fs.symlink(outside,path.join(root,"escape"));
  await fs.symlink("loop",path.join(root,"loop"));
  for(let i=0;i<=40;i++) await fs.symlink(i===40?"ordinary/a.md":`hop-${i+1}`,path.join(root,`hop-${i}`));
  for(const [relative,expected] of [
    ["ordinary/a.md","contained"],["directory","contained"],["","contained"],["missing/a.md","missing"],
    ["ordinary/a.md/child","unavailable"],["inside/a.md","contained"],["reset/ordinary/a.md","contained"],
    ["escape/secret.md","outside"],["escape/back/ordinary/a.md","outside"],["hop-1","contained"],["hop-0","unavailable"],["loop","unavailable"]
  ]) {
    reset(); const result=await probeRootContainedPath(root,path.join(root,relative!));
    assert.equal(result.kind,expected); save("probe:"+relative,result);
    if(relative!.startsWith("escape/")) assert.equal(trace.filter(x=>x.path.startsWith("$W/outside")||x.path.startsWith("$W/root/escape/")).length,0);
  }
  reset(); before=(op: string,p: string)=>{if(op==="lstat"&&p.endsWith("a.md"))throw Object.assign(new Error("injected"),{code:"EACCES"});};
  const denied=await probeRootContainedPath(root,path.join(root,"ordinary/a.md")); assert.equal(denied.kind,"unavailable"); save("injected-permission-denied",denied);

  await write("source.md","# Source\n[x](escape/secret.md#outside)\n");
  for(const mode of ["ignore","report","validate"] as const) {
    reset(); const result=await execute(executeMarkdownLinkValidation,{...options,rootExternalTargetMode:mode},root,{patterns:["source.md"]});
    assert.equal(result.result.status,mode==="report"?"failed":"passed");
    if(mode!=="validate") assert.equal(trace.filter(x=>x.path.startsWith("$W/root/escape/")||x.path.startsWith("$W/outside")).length,0);
    save("external-policy:"+mode,result);
  }

  await write("shared/a.md"); await write("shared/b.md");
  const resolver=await createdResolver(root,20); const source=await readSource(resolver,"source.md");
  reset(); const first=await resolver.resolve(requestFor(source,"shared/a.md")); assert.equal(first.kind,"valid"); save("prefix-first-node",first);
  await fs.rm(path.join(root,"shared"),{recursive:true}); await fs.symlink(outside,path.join(root,"shared"));
  reset(); const second=await resolver.resolve(requestFor(source,"shared/b.md")); assert.equal(second.kind,"finding");
  assert.equal((second as any).reason,"target-outside-project-root"); assert.equal(trace.some(x=>x.path.includes("shared/b.md")),false); save("prefix-replaced-new-node",second);
  reset(); assert.deepEqual(await resolver.resolve(requestFor(source,"shared/a.md")),first); assert.equal(trace.length,0); save("same-node-stays-fixed",first);

  await write("victim.md","# Victim\n"); reset();
  after=async(op: string,p: string)=>{if(op==="lstat"&&p===path.join(root,"victim.md")){await fs.rm(p);await fs.symlink(path.join(outside,"secret.md"),p);}};
  const replaced=await execute(executeMarkdownLinkValidation,options,root,{patterns:["victim.md"]});
  assert.equal(replaced.result.status,"unavailable"); assert.equal(replaced.records.length,0);
  assert.ok(trace.some(x=>x.op==="open"&&(x.flags&constants.O_NOFOLLOW)!==0)); save("no-follow-final-leaf",replaced);

  await write("growing.md","x".repeat(16)); reset();
  after=async(op: string,p: string,handle: any)=>{if(op==="open"&&p.endsWith("growing.md")) {
    const stat=handle.stat.bind(handle); handle.stat=async()=>{const old=await stat();await fs.appendFile(p,"x".repeat(64));return old;};
  }};
  const grew=await readRegularFile(path.join(root,"growing.md"),32); assert.deepEqual(grew,{ok:false,reason:"too-large"});
  assert.equal(trace.filter(x=>x.op==="read").reduce((s,x)=>s+x.returned,0),33); save("growth-bounded-max-plus-one",grew);

  const deep=Array.from({length:25},()=>"d").join("/");
  await write(`${deep}/source.md`,"# Source\n[x]("+"../".repeat(25)+"ordinary/a.md#target)\n");
  for(const phase of ["source","target","symlink"] as const) for(const trigger of ["timer","io"] as const) {
    reset(); const controller=new AbortController(); let abortAt=0; let armedAt=0; let ioAtAbort=0; let armed=false;
    const pattern=phase==="source"?`${deep}/source.md`:"source.md";
    if(phase!=="source") await write("source.md",phase==="target"?"[x](ordinary/a.md#target)\n":"[x](inside/a.md#target)\n");
    after=async(op: string,p: string)=>{
      const match=phase==="source"?op==="lstat"&&p===path.join(root,"d/d"):
        phase==="target"?op==="lstat"&&p===path.join(root,"ordinary"):op==="readlink"&&p===path.join(root,"inside");
      if(!match||armed)return; armed=true; armedAt=performance.now();
      if(trigger==="timer") await new Promise<void>(resolve=>setTimeout(()=>{controller.abort();abortAt=performance.now();ioAtAbort=trace.length;resolve();},0));
      else {await fs.readFile(path.join(outside,"secret.md"));controller.abort();abortAt=performance.now();ioAtAbort=trace.length;}
    };
    const checked=await execute(executeMarkdownLinkValidation,options,root,{patterns:[pattern]},controller.signal);
    const settledAt=performance.now(); assert.ok(armed); assert.equal((checked.result as any).reason?.code,"cancelled");
    assert.equal(checked.records.length,0); assert.equal("data" in checked.result,false);
    cancellations.push({phase,trigger,armedAt,abortAt,settledAt,eventDeliveryMs:abortAt-armedAt,
      settleAfterAbortMs:settledAt-abortAt,newOperationsAfterAbort:trace.slice(ioAtAbort).filter(x=>["lstat","readlink","open","read"].includes(x.op)).length,
      result:checked.result,trace:[...trace]});
  }
  // No observation hook: the real callback/Promise scheduling and explicit graph checkpoints are exercised.
  globalThis.__candidateObserve=undefined;
  await write("source.md","# Source\n");
  for(const trigger of ["timer","io"] as const) {
    const controller=new AbortController(); const r=await createdResolver(root,20,{enabled:false},controller.signal); const s=await readSource(r,"source.md");
    const armedAt=performance.now(); let abortAt=0;
    const pending=trigger==="timer"?new Promise<void>(resolve=>setTimeout(()=>{controller.abort();abortAt=performance.now();resolve();},0)):
      fs.readFile(path.join(root,"source.md")).then(()=>{controller.abort();abortAt=performance.now();});
    const result=await r.resolveAll(Array.from({length:8000},()=>requestFor(s,"#source")));const settledAt=performance.now();await pending;
    assert.equal((result as any).kind,"unavailable");assert.ok(controller.signal.aborted);
    cancellations.push({phase:"unhooked-8000-edges",trigger,armedAt,abortAt,settledAt,eventDeliveryMs:abortAt-armedAt,settleAfterAbortMs:settledAt-abortAt,result});
  }
  assert.equal(handles,0);
  process.stdout.write(JSON.stringify({runtime:process.versions,caseCount:cases.length,cases,cancellations,openHandlesAtEnd:handles})+"\n");
} finally {globalThis.__candidateObserve=undefined;await fs.rm(workspace,{recursive:true,force:true});}
