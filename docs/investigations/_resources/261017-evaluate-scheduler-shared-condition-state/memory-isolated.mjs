// Supplemental v2: each measured live set has a fresh process, no preceding row to collect.
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compile,seed,action,counters,fixture} from './model.mjs';
const gc=()=>{for(let i=0;i<3;i++)globalThis.Bun?Bun.gc(true):globalThis.gc();};
if(process.argv[2]==='child'){
 const [shape,nString,mode]=process.argv.slice(3),n=Number(nString),f=fixture(shape,n);gc();const before=process.memoryUsage();const c=compile(f.tasks,mode),stats=counters();let s=seed(c),now=0;const retained=[s];for(let i=0;i<f.sources;i++)s=action(c,s,'select',i,++now,stats).state;for(let i=0;i<f.sources;i++){s=action(c,s,'pass',i,++now,stats).state;retained.push(s);}globalThis.strongReference={f,c,s,retained};gc();const after=process.memoryUsage();console.log(JSON.stringify({shape,n,mode,sources:f.sources,retainedStates:retained.length,checksum:s.count,before,after,heapDeltaBytes:after.heapUsed-before.heapUsed}));
}else{
 const rows=[];for(const n of [256,1024])for(const shape of ['cohort','multi','unique','overlap','cross','split'])for(const mode of ['eager','shared']){const args=[...(globalThis.Bun?[]:['--expose-gc']),fileURLToPath(import.meta.url),'child',shape,String(n),mode];const r=spawnSync(process.execPath,args,{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);rows.push(JSON.parse(r.stdout));}console.log(JSON.stringify({metadata:{runtime:globalThis.Bun?`Bun ${Bun.version}`:`Node ${process.version}`,date:new Date().toISOString(),mode:'memory-fresh-process-v2',samplesPerRow:1,gcPasses:3,retained:'input + compiled graph + final + initial and source-settlement prefix'},rows},null,2));
}
