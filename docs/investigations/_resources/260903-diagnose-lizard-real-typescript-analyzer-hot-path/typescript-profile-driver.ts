import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

import { analyzeSourceCode, type FileInformation } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts";
import { analyzeLizardSource } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts";
import { TypeScriptReader } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts";

type Input = { readonly path: string; readonly source: string };
type Metric = Readonly<{ccn:number|null;endLine:number;file:string;name:string;nloc:number;parameterCount:number;startLine:number}>;
type Request = { readonly files: readonly Input[] };
const root = process.argv[2] ?? ".";
const request = JSON.parse(readFileSync(`${root}/request.json`, "utf8")) as Request;
const expected = "29ff7a0e1535889e4055dd04989e70c6f925d08d745509b24f202744d5735ec6";

function hash(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function canonical(metrics: readonly Metric[]) {
  return [...metrics].sort((a,b) => a.file.localeCompare(b.file) || a.startLine-b.startLine || a.endLine-b.endLine || a.name.localeCompare(b.name) || a.nloc-b.nloc || (a.ccn??-1)-(b.ccn??-1) || a.parameterCount-b.parameterCount);
}
function fields(info: { cyclomatic_complexity:number; end_line:number; filename:string; name:string; nloc:number; parameter_count:number; start_line:number}): Metric {
 return Object.freeze({ccn:info.cyclomatic_complexity,endLine:info.end_line,file:info.filename,name:info.name,nloc:info.nloc,parameterCount:info.parameter_count,startLine:info.start_line});
}
function facade(): readonly Metric[] { const out:Metric[]=[]; for(const f of request.files){ const a=analyzeLizardSource({filename:f.path,sourceCode:f.source}); if(!a) throw Error(f.path); for(const m of a.function_list)out.push(fields(m)); } return out; }
function directBare(): readonly FileInformation[] { return request.files.map(f=>analyzeSourceCode(f.path,f.source,TypeScriptReader)); }
function directMetrics(): readonly Metric[] { const out:Metric[]=[]; for(const fileInfo of directBare())for(const f of fileInfo.function_list)out.push(fields(f)); return out; }
function readerOnly(): number { let functions=0; for(const f of request.files) functions += analyzeSourceCode(f.path,f.source,TypeScriptReader,[]).function_list.length; return functions; }
function tokenizerOnly(): Readonly<{count:number; chars:number; digest:string}> { let count=0,chars=0; const h=createHash("sha256"); for(const f of request.files)for(const t of TypeScriptReader.generateTokens(f.source)){ count++;chars+=t.length;h.update(t);h.update("\0"); } return {count,chars,digest:h.digest("hex")}; }
function assertEquivalent(label:string, metrics:readonly Metric[]){const c=canonical(metrics);const d=hash(c);if(c.length!==2222||d!==expected)throw Error(`${label} drift ${c.length} ${d}`);return d;}
function timed<T>(fn:()=>T):Readonly<{ms:number;value:T}>{const t=performance.now();const value=fn();return {ms:performance.now()-t,value};}
function median(values:number[]) {const x=[...values].sort((a,b)=>a-b),n=x.length;return n%2?x[(n-1)/2]:(x[n/2-1]+x[n/2])/2;}
function quantile(values:number[],q:number){const x=[...values].sort((a,b)=>a-b),p=(x.length-1)*q,i=Math.floor(p),j=Math.ceil(p);return x[i]*(1-p+i)+x[j]*(p-i);}

const mode=process.argv[3]??"stages";
if(mode==="profile") {
 for(let i=0;i<2;i++) assertEquivalent("warmup",facade());
 for(let i=0;i<30;i++) assertEquivalent("profile",facade());
 console.log(JSON.stringify({status:"profile-complete",operations:30,digest:expected,metrics:2222}));
 process.exit(0);
}
if(mode==="regex-count") {
 const NativeRegExp=RegExp; let constructCalls=0,execCalls=0; const originalExec=NativeRegExp.prototype.exec;
 Object.defineProperty(NativeRegExp.prototype,"exec",{value:function(this:RegExp,...args:Parameters<RegExp["exec"]>){execCalls++;return originalExec.apply(this,args);},configurable:true});
 (globalThis as unknown as {RegExp:typeof RegExp}).RegExp=new Proxy(NativeRegExp,{construct(target,args){constructCalls++;return Reflect.construct(target,args);}});
 const d=assertEquivalent("regex-count",facade());
 console.log(JSON.stringify({status:"complete",constructCalls,execCalls,digest:d,metrics:2222}));
 process.exit(0);
}
const allModes:Readonly<Record<string,()=>unknown>>=Object.freeze({facade, directMetrics, directBare, readerOnly, tokenizerOnly});
const only = process.argv[4];
const modes = only === undefined ? allModes : Object.freeze({[only]: allModes[only] ?? (() => { throw Error(`unknown mode ${only}`);})});
for(const [label,fn] of Object.entries(modes)){
 const first=timed(fn); const digested=label==="facade"||label==="directMetrics"?assertEquivalent(label,first.value as Metric[]):undefined;
 const samples:number[]=[];
 for(let i=0;i<5;i++){const r=timed(fn);samples.push(r.ms);if(label==="facade"||label==="directMetrics")assertEquivalent(`${label}-${i}`,r.value as Metric[]);}
 console.log(JSON.stringify({label,firstMs:first.ms,samplesMs:samples,medianMs:median(samples),p90Ms:quantile(samples,.9),digest:digested??undefined,valueSummary:label==="tokenizerOnly"?first.value:label==="readerOnly"?{functions:first.value}:label==="directBare"?{files:(first.value as FileInformation[]).length,functions:(first.value as FileInformation[]).reduce((n,x)=>n+x.function_list.length,0)}:{metrics:(first.value as Metric[]).length}}));
}
