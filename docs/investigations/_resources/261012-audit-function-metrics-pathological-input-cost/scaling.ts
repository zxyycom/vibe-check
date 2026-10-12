import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineCheck, defineConfig, run, functionMetrics } from '../../src/index.ts';
const base=resolve(import.meta.dir);const samples=[];
const mode=process.argv[2]??'scheduler';
const sizes=mode==='scheduler'?[128,256,512,1024,2048]:mode==='comment'?[1000,2000,4000,8000,16000]:[8,12,16,20,24];
for (const diagnostics of mode==='scheduler'?[false,true]:[false])for(const n of sizes){
 const fixture=resolve(base,'fixtures',mode,String(n));
 mkdirSync(fixture,{recursive:true});
 if(mode!=='scheduler')writeFileSync(resolve(fixture,mode==='comment'?'input.c':'input.ts'),mode==='comment'?'/* '.repeat(n):'`'+'${x}'.repeat(n));
 const check=mode==='scheduler'?Array.from({length:n},(_,i)=>defineCheck({checkId:'noop-'+i,displayName:'Noop '+i,execute:()=>({status:'passed',data:{}})})):[functionMetrics({codeAreas:{synthetic:{files:{patterns:['*']}}},findingPolicy:'non-blocking'})];
 const definition=defineConfig({checks:check,scheduler:{maxParallel:1,admissionPolicy:{kind:'static'}},outputs:{machinePublication:{enabled:false},diagnosticLogging:{enabled:false},progressRendering:{enabled:false}}});
 for(let repetition=0;repetition<6;repetition++){
  const started=performance.now();const cpu=process.cpuUsage();
  const result=await run(definition,{projectRoot:fixture,...(mode==='scheduler'?{}:{signal:AbortSignal.timeout(1000)}),outputs:{diagnosticLogging:{enabled:diagnostics,directory:resolve(base,'scheduler-diagnostics',`${n}-${repetition}`)}}});
  const elapsedMs=performance.now()-started;const usage=process.cpuUsage(cpu);
  const sample={mode,n,diagnostics,repetition,temperature:repetition===0?'warmup':'same-process-repeated-operation',elapsedMs,cpuMs:(usage.user+usage.system)/1000,kind:result.kind,...(result.kind==='completed'?{statuses:result.snapshot.checks.map(x=>x.outcome.status),reasons:result.snapshot.checks.map(x=>'reason'in x.outcome?x.outcome.reason:null),count:result.snapshot.checks.length}:{}),rssBytes:process.memoryUsage().rss};
  samples.push(sample);process.stdout.write(JSON.stringify(sample)+'\n');
 }
}
writeFileSync(resolve(base,mode+'-scaling.json'),JSON.stringify({mode,warning:'synthetic investigation only; no real-world speedup claimed; same-process warm repeated operations, each functionMetrics call still creates fresh Worker',runtime:process.versions,samples},null,2));
