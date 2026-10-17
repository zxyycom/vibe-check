// Separate supplementary slice; original model and original raw stay frozen.
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {compile,seed,action,counters,choose} from './model.mjs';
import {partialFixture,partialCompile,partialFlow,partialCounters,partialOps} from './partial-model.mjs';
const gc=()=>globalThis.Bun?Bun.gc(true):globalThis.gc();
function eagerFlow(c,ops){let s=seed(c),now=0,selected=0;const stats=counters();for(const [kind,i]of ops)s=action(c,s,kind,i,++now,stats).state;while(true){const i=choose(c,s);if(i===undefined)break;s=action(c,s,'select',i,++now,stats).state;selected++;}return selected;}
const rows=[];let sink=0;for(const n of [32,256,1024])for(const cross of [false,true])for(const order of ['a-first','a-last','interleaved']){const f=partialFixture(n,cross),ops=partialOps(f,order),samples={eager:[],factored:[]},repetitions=n===32?8:n===256?3:1;for(let sample=-3;sample<7;sample++)for(const mode of ((sample&1)===0?['eager','factored']:['factored','eager'])){gc();const start=performance.now();for(let rep=0;rep<repetitions;rep++)sink+=mode==='eager'?eagerFlow(compile(f.tasks,'eager'),ops):partialFlow(partialCompile(f),ops,partialCounters());const ms=(performance.now()-start)/repetitions;if(sample>=0)samples[mode].push(ms);}const results={};for(const mode of ['eager','factored']){const a=samples[mode].toSorted((a,b)=>a-b);results[mode]={samplesMs:samples[mode],minMs:a[0],medianMs:a[3],maxMs:a[6]};}rows.push({n,cross,order,sources:f.sources,repetitions,results});}
console.log(JSON.stringify({metadata:{runtime:globalThis.Bun?`Bun ${Bun.version}`:`Node ${process.version}`,date:new Date().toISOString(),cpu:os.cpus()[0]?.model,mode:'common-A-personal-B-compile-seed-update-select-all',warmup:3,samples:7},rows,sink},null,2));
