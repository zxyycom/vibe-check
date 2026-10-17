// Supplemental direct total: SAME frozen model, includes compile + seed + complete ordinary admission trace.
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {compile,fixture,flow,counters} from './model.mjs';
const gc=()=>globalThis.Bun?Bun.gc(true):globalThis.gc?.();
const metadata={runtime:globalThis.Bun?`Bun ${Bun.version}`:`Node ${process.version}`,date:new Date().toISOString(),cpu:os.cpus()[0]?.model,mode:'compile-seed-update-select-all',warmup:3,samples:7};
let sink=0;const rows=[];
for(const n of [32,256,1024])for(const shape of ['cohort','multi','partition','unique','overlap','cross','split']){
  const f=fixture(shape,n),repetitions=n===32?8:n===256?3:1,samples={eager:[],shared:[]};
  for(let sample=-3;sample<7;sample++)for(const mode of ((sample&1)===0?['eager','shared']:['shared','eager'])){
    gc();const start=performance.now();for(let rep=0;rep<repetitions;rep++)sink+=flow(compile(f.tasks,mode),f,counters()).checksum;
    const elapsed=(performance.now()-start)/repetitions;if(sample>=0)samples[mode].push(elapsed);
  }
  const results={};for(const mode of ['eager','shared']){const a=samples[mode].toSorted((a,b)=>a-b);results[mode]={samplesMs:samples[mode],minMs:a[0],medianMs:a[3],maxMs:a[6]};}
  rows.push({shape,n,sources:f.sources,repetitions,results});
}
console.log(JSON.stringify({metadata,rows,sink},null,2));
