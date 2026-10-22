/** Virtual-only changes on top of the retained worker-sync experiment. */
import { once } from "./path-candidates.ts";

export function transformReader(source: string, file: string, mode: string) {
  if (file.endsWith("/source-reader.ts")) {
    return once(source, "readRegularFile(rootProbe.absolutePath, request.maxMarkdownBytes)",
      "readRegularFile(rootProbe.absolutePath, request.maxMarkdownBytes, request.signal, request.probeSession)");
  }
  if (file.endsWith("/target-observation.ts")) {
    source = once(source, "readonly signal: AbortSignal;", "readonly signal: AbortSignal; readonly probeSession?: any;");
    return once(source, "readRegularFile(demand.targetPath, maxBytes)",
      "readRegularFile(demand.targetPath, maxBytes, demand.signal, demand.probeSession)");
  }
  if (file.endsWith("/resolver-engine.ts")) {
    return once(source, "targetPath: node.endpointPath ?? node.path,", "targetPath: node.endpointPath ?? node.path, probeSession: this.#probeSession,");
  }
  if (!file.endsWith("/markdown-link-validation/filesystem-probes.ts")) return source;
  const start = source.indexOf("export async function readRegularFile("), end = source.indexOf("function endpointFromStatus(");
  if (start < 0 || end <= start) throw Error("Read source seam changed");
  let region = source.slice(start, end);
  region = once(region, "handle = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));",
    "handle = await open(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)); readerAfterOpen(filePath, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));");
  if (mode !== "plain") region = once(region, "const bytes = new Uint8Array(maxBytes + 1);",
    'const bytes = new Uint8Array(maxBytes + 1); ioCount("bufferAllocationBytes",bytes.byteLength);');
  const asynchronous = region.replaceAll("readRegularFile", "__asyncReadRegularFile").replace(/\bopen\(/gu, "readerOpenAsync(");
  const synchronous = region.replaceAll("readRegularFile", "__syncReadRegularFile").replaceAll("readBoundedBytes", "__syncReadBoundedBytes")
    .replace(/\basync /gu, "").replace(/\bawait /gu, "").replace(/\bopen\(/gu, "readerOpenSync(")
    .replace("handle?.close().catch(() => undefined);", "try { handle?.close(); } catch {}");
  const wrapper = `export async function readRegularFile(p:string,max:number,signal?:AbortSignal,session?:any) {
    return executeReader(p,max,signal,session,()=>__asyncReadRegularFile(p,max),()=>__syncReadRegularFile(p,max));
  }\n`;
  return 'import { readerOpenAsync, readerOpenSync, readerAfterOpen } from "mdlink-reader-experiment";\n' +
    'import { executeReader, ioCount } from "mdlink-probe-experiment";\n' + source.slice(0, start) + asynchronous + synchronous + wrapper + source.slice(end);
}

export function transformProbeRuntime(source: string) {
  source = 'declare const __IO_VARIANT__: string;\n' + source;
  source = once(source, 'function observe(stage: string, op: string, p: string)', 'function observe(stage: string, op: string, p: string, details:any={})');
  source = once(source, 'Atomics.store(control, 2, 0);', 'Atomics.store(control, 2, 0); Atomics.store(control,4,0);');
  source = once(source, '{ kind: "observe", stage, op, path: p, seq }', '{ kind: "observe", stage, op, path: p, seq, details }');
  source = once(source, '} else {\n    const result = (globalThis as any).__batchObserve?.({ stage, op, path: p });',
    'return {readLimit:Atomics.load(control,4)}; } else {\n    const result = (globalThis as any).__batchObserve?.({ stage, op, path: p, ...details });');
  source = once(source, 'if (result?.then) throw new Error("Synchronous observation hook required");',
    'if (result?.then) throw new Error("Synchronous observation hook required"); return result;');
  source = once(source, 'const c: any = { signal, variant, slowMs: options.slowMs ?? 0, slowUsed: false,', 'const c: any = { signal, variant, slowMs: options.slowMs ?? 0, slowUsed: false, slowOp: options.slowOp,');
  source = source.replaceAll('c?.slowMs && !c.slowUsed', 'c?.slowMs && !c.slowUsed && (!c.slowOp || c.slowOp===op)');
  source = once(source, 'new SharedArrayBuffer(16)', 'new SharedArrayBuffer(20)');
  source = once(source, 'slowMs: c.slowMs,\n        observe:', 'slowMs: c.slowMs, slowOp:c.slowOp,\n        observe:');
  source = once(source, 'try { (globalThis as any).__batchObserve?.({ stage: message.stage, op: message.op, path: message.path }); }',
    'try { const r=(globalThis as any).__batchObserve?.({ stage: message.stage, op: message.op, path: message.path, ...message.details }); if(r?.then)throw Error("Synchronous observation hook required"); Atomics.store(control,4,r?.readLimit??0); }');
  source = once(source, 'export function serveProbe(probe: (root: string, p: string) => any)',
    'export function serveProbe(probe: (root: string, p: string) => any, read?: (p:string,max:number)=>any)');
  source = once(source, 'slowMs: workerData.slowMs, slowUsed: false,', 'slowMs: workerData.slowMs, slowUsed: false, slowOp:workerData.slowOp,');
  source = once(source, 'if (workerData.fault) process.exit(23);', 'if (workerData.fault===true || (workerData.fault==="read"&&request.kind==="read")) process.exit(23);');
  source = once(source, 'else throw new Error("Unknown worker request");', 'else if (request.kind === "read" && read) value = read(request.path,request.max); else throw new Error("Unknown worker request");');
  return source + `
const readCandidate = __IO_VARIANT__ === "reader-direct" || __IO_VARIANT__ === "reader-worker" || __IO_VARIANT__ === "combined";
export const ioCount = count;
export function ioBefore(op:string,p:string,details:any={},asyncIO=false):any {
  const c=context(); if(readCandidate&&cancelled(c))throw abortError();
  const injection=observe("before",op,p,details); if(readCandidate&&cancelled(c))throw abortError();
  count(op+"Calls");if(c?.control)Atomics.add(c.control,3,1);
  if(c?.slowMs&&!c.slowUsed&&(!c.slowOp||c.slowOp===op)){
    c.slowUsed=true; if(parentPort)parentPort.postMessage({kind:"slow-start"});else globalThis.__batchSlowArmed?.();
    if(asyncIO)return new Promise(resolve=>setTimeout(()=>resolve(injection),c.slowMs));
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,c.slowMs);
  }
  return injection;
}
export function ioAfter(op:string,p:string,details:any={}){
  observe("after",op,p,details); if(op!=="close"&&readCandidate&&cancelled(context()))throw abortError();
}
export function ioCloseBefore(p:string){count("closeCalls");observe("before","close",p);}
export async function executeReader(p:string,max:number,signal:AbortSignal|undefined,c:any,asyncRead:()=>any,syncRead:()=>any){
  if(!c)return asyncRead();
  return scope.run(c,async()=>{
    try{
      if(__IO_VARIANT__==="reader-worker"||__IO_VARIANT__==="combined")return await c.request({kind:"read",path:p,max});
      if(__IO_VARIANT__==="reader-direct")return syncRead();
      return await asyncRead();
    }catch{return Object.freeze({ok:false,reason:"unavailable"});}
  });
}
`;
}
