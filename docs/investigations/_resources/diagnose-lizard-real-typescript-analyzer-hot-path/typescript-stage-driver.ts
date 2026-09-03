import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { analyzeSourceCode, type FileInformation } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts";
import { analyzeLizardSource } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts";
import { get_reader_for, languages } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts";
import { CodeReader } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/shared/code-reader.ts";
import { TypeScriptReader } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/readers/typescript.ts";
type Input={readonly path:string;readonly source:string}; type Req={readonly files:readonly Input[]}; type Metric={readonly ccn:number|null;readonly endLine:number;readonly file:string;readonly name:string;readonly nloc:number;readonly parameterCount:number;readonly startLine:number};
const root=process.argv[2]??".";const req=JSON.parse(readFileSync(`${root}/request.json`,"utf8")) as Req;const expected="29ff7a0e1535889e4055dd04989e70c6f925d08d745509b24f202744d5735ec6";
function fields(x:{cyclomatic_complexity:number;end_line:number;filename:string;name:string;nloc:number;parameter_count:number;start_line:number}):Metric{return {ccn:x.cyclomatic_complexity,endLine:x.end_line,file:x.filename,name:x.name,nloc:x.nloc,parameterCount:x.parameter_count,startLine:x.start_line};}
function digest(x:readonly Metric[]){const v=[...x].sort((a,b)=>a.file.localeCompare(b.file)||a.startLine-b.startLine||a.endLine-b.endLine||a.name.localeCompare(b.name)||a.nloc-b.nloc||(a.ccn??-1)-(b.ccn??-1)||a.parameterCount-b.parameterCount);return createHash("sha256").update(JSON.stringify(v)).digest("hex");}
function assert(m:readonly Metric[]){if(m.length!==2222||digest(m)!==expected)throw Error(`drift ${m.length} ${digest(m)}`);}
function current():readonly Metric[]{const o:Metric[]=[];for(const f of req.files){const a=analyzeLizardSource({filename:f.path,sourceCode:f.source});if(!a)throw Error(f.path);for(const x of a.function_list)o.push(fields(x));}return o;}
function direct():readonly Metric[]{const o:Metric[]=[];for(const f of req.files){const a=analyzeSourceCode(f.path,f.source,TypeScriptReader);for(const x of a.function_list)o.push(fields(x));}return o;}
function ordered():readonly Metric[]{const o:Metric[]=[];for(const f of req.files){const reader=get_reader_for(f.path);if(!reader)throw Error(f.path);const a=analyzeSourceCode(f.path,f.source,reader);for(const x of a.function_list)o.push(fields(x));}return o;}
function baseTokenizer(){let count=0,chars=0;const h=createHash("sha256");for(const f of req.files)for(const t of CodeReader.generateTokens(f.source,"|(?:#\\w+)|(?:\\$\\w+)|(?:\\w+\\?)|`.*?`")){count++;chars+=t.length;h.update(t);h.update("\0");}return {count,chars,digest:h.digest("hex")};}
function timer<T>(f:()=>T){const t=performance.now(),value=f();return {ms:performance.now()-t,value};}
function med(a:number[]){a=[...a].sort((x,y)=>x-y);return a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2;}
function q(a:number[],p:number){a=[...a].sort((x,y)=>x-y);const k=(a.length-1)*p,i=Math.floor(k),j=Math.ceil(k);return a[i]*(j-k)+a[j]*(k-i);}
const selected=process.argv[3]??"compare";
if(selected==="fastpath-count"){
 let calls=0;const restore=languages().map(r=>({r,match:r.matchFilename}));for(const x of restore)(x.r as {matchFilename:(filename:string)=>boolean}).matchFilename=(filename)=>{calls++;return x.match.call(x.r,filename);};
 try{assert(current());console.log(JSON.stringify({status:"complete",files:req.files.length,matchFilenameCalls:calls,expectedCalls:0,metrics:2222,digest:expected}));}finally{for(const x of restore)(x.r as {matchFilename:(filename:string)=>boolean}).matchFilename=x.match;}
} else if(selected==="base-tokenizer"){
 const warm=baseTokenizer();const samples:number[]=[];for(let i=0;i<8;i++)samples.push(timer(baseTokenizer).ms);console.log(JSON.stringify({status:"complete",warm,samplesMs:samples,medianMs:med(samples),p90Ms:q(samples,.9)}));
} else {
 assert(current());assert(ordered());const rows=[] as unknown[];for(let block=1;block<=10;block++)for(const [name,fn] of (block%2?[['current',current],['ordered',ordered]]:[['ordered',ordered],['current',current]]) as const){const x=timer(fn);assert(x.value);rows.push({block,name,ms:x.ms});}
 const c=(rows as {name:string;ms:number}[]).filter(x=>x.name==='current').map(x=>x.ms),o=(rows as {name:string;ms:number}[]).filter(x=>x.name==='ordered').map(x=>x.ms);console.log(JSON.stringify({status:"complete",digest:expected,metrics:2222,rows,current:{medianMs:med(c),p90Ms:q(c,.9)},ordered:{medianMs:med(o),p90Ms:q(o,.9)},medianOrderedMinusCurrentMs:med(o)-med(c)}));
}
