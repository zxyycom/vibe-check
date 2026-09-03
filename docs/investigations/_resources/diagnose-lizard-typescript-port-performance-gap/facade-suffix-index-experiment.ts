import { readFileSync } from "node:fs";

import { analyzeSourceCode } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/core.ts";
import { analyzeLizardSource } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts";
import { languages, type RegisteredReader } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/reader-registry.ts";

const requestPath = "/home/dev/.codex/worktrees/d20e/vibe-check/docs/investigations/_resources/compare-lizard-python-typescript-performance/b-fixed-lizard-1.24-warmed-operation-full/representative-batch-request.json";
const request = JSON.parse(readFileSync(requestPath, "utf8")) as { files: { path: string; source: string }[] };
const readerBySuffix = new Map<string, RegisteredReader>();
for (const reader of languages()) for (const suffix of reader.ext) if (!readerBySuffix.has(suffix.toLowerCase())) readerBySuffix.set(suffix.toLowerCase(), reader);

function cachedAnalyze(filename:string, sourceCode:string) {
  const dot = filename.lastIndexOf(".");
  const reader = dot < 0 ? undefined : readerBySuffix.get(filename.slice(dot + 1).toLowerCase());
  if (!reader) return undefined;
  const fileInformation = analyzeSourceCode(filename, sourceCode, reader);
  return Object.freeze({function_list:Object.freeze(fileInformation.function_list.map((functionInfo)=>Object.freeze({
    cyclomatic_complexity:functionInfo.cyclomatic_complexity,
    end_line:functionInfo.end_line,
    filename:functionInfo.filename,
    name:functionInfo.name,
    nloc:functionInfo.nloc,
    parameter_count:functionInfo.parameter_count,
    start_line:functionInfo.start_line
  })))});
}

type Analyze = (filename:string, source:string) => ReturnType<typeof cachedAnalyze>;
function operation(analyze:Analyze):number { let checksum=0; for(const file of request.files){const result=analyze(file.path,file.source); if(!result) throw new Error(file.path); for(const info of result.function_list) checksum+=info.nloc+info.start_line+info.parameter_count;} return checksum; }
const current:Analyze=(filename,source)=>analyzeLizardSource({filename,sourceCode:source});
const candidate:Analyze=cachedAnalyze;
const currentFirst=request.files.map(file=>current(file.path,file.source));
const candidateFirst=request.files.map(file=>candidate(file.path,file.source));
if(JSON.stringify(currentFirst)!==JSON.stringify(candidateFirst)) throw new Error("candidate output drift");
operation(current); operation(candidate);
const currentMs:number[]=[]; const candidateMs:number[]=[]; let checksum=0;
function timed(analyze:Analyze, sink:number[]):void {const start=performance.now(); checksum+=operation(analyze); sink.push(performance.now()-start);}
for(let block=0;block<8;block+=1){timed(current,currentMs);timed(candidate,candidateMs);timed(candidate,candidateMs);timed(current,currentMs);}
const summarize=(values:number[])=>{const sorted=[...values].sort((a,b)=>a-b); return {raw:values,medianMs:(sorted[7]+sorted[8])/2,p90Ms:sorted[14]};};
console.log(JSON.stringify({runtime:{bun:Bun.version,platform:process.platform,arch:process.arch},workload:{files:request.files.length,bytes:request.files.reduce((sum,file)=>sum+Buffer.byteLength(file.source),0)},preflight:"byte-identical JSON",checksum,current:summarize(currentMs),candidate:summarize(candidateMs)}));
