// Timing and retained-heap runs are separate modes; no oracle or Product timings here.
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import {compile,seed,action,counters,choose,candidates,fixture,flow} from './model.mjs';
const runtime=globalThis.Bun?`Bun ${Bun.version}`:`Node ${process.version}`;
const gc=()=>globalThis.Bun?Bun.gc(true):globalThis.gc?.();
const metadata={runtime,date:new Date().toISOString(),platform:process.platform,arch:process.arch,cpu:os.cpus()[0]?.model,cpus:os.cpus().length,mode:process.argv[2],warmup:3,samples:7};
let sink=0;
function updates(c,f){let s=seed(c),t=0;const stats=counters();for(let i=0;i<f.sources;i++)s=action(c,s,'select',i,++t,stats).state;for(let i=0;i<f.sources;i++)s=action(c,s,'pass',i,++t,stats).state;return s;}
const rows=[];
if(process.argv[2]==='timing'){
  for(const n of [32,256,1024])for(const shape of ['cohort','multi','partition','unique','overlap','cross','split']){
    const f=fixture(shape,n),compiled={eager:compile(f.tasks,'eager'),shared:compile(f.tasks,'shared')};
    for(const phase of ['compile','update-discover','update-read','update-select-all']){
      const repetitions=n===32?8:n===256?3:1;
      const samples={eager:[],shared:[]};
      for(let sample=-3;sample<7;sample++)for(const mode of ((sample&1)===0?['eager','shared']:['shared','eager'])){
        const c=compiled[mode];gc();const start=performance.now();for(let rep=0;rep<repetitions;rep++){
          if(phase==='compile'){const v=compile(f.tasks,mode);sink+=v.groups.length+v.cells.length;}
          else if(phase==='update-select-all'){sink+=flow(c,f,counters()).checksum;}
          else {const s=updates(c,f);sink+=s.count+(choose(c,s)??0);if(phase==='update-read')sink+=candidates(c,s).length;}
        }const elapsed=(performance.now()-start)/repetitions;if(sample>=0)samples[mode].push(elapsed);
      }
      const results={};for(const mode of ['eager','shared']){const s=samples[mode].toSorted((a,b)=>a-b);results[mode]={samplesMs:samples[mode],minMs:s[0],medianMs:s[3],maxMs:s[6]};}
      rows.push({shape,n,sources:f.sources,phase,repetitions,groups:compiled.shared.groups.length,cells:compiled.shared.cells.length,results});
    }
  }
}else if(process.argv[2]==='memory'){
  for(const n of [256,1024])for(const shape of ['cohort','multi','unique','overlap','cross','split'])for(const mode of ['eager','shared']){
    const f=fixture(shape,n);gc();const before=process.memoryUsage();
    const c=compile(f.tasks,mode);let s=seed(c),t=0;const retained=[s],stats=counters();
    for(let i=0;i<f.sources;i++)s=action(c,s,'select',i,++t,stats).state;
    for(let i=0;i<f.sources;i++){s=action(c,s,'pass',i,++t,stats).state;retained.push(s);}
    // Keep the source-settlement prefix, no full read caches; exact retained set is part of the fixture.
    globalThis.hold={c,s,retained};gc();const after=process.memoryUsage();sink+=s.count;
    rows.push({shape,n,mode,sources:f.sources,retainedStates:retained.length,heapUsedBefore:before.heapUsed,heapUsedAfter:after.heapUsed,heapDeltaBytes:after.heapUsed-before.heapUsed,rssBefore:before.rss,rssAfter:after.rss});
    globalThis.hold=undefined;
  }
}else throw Error('timing|memory');
console.log(JSON.stringify({metadata,rows,sink},null,2));
