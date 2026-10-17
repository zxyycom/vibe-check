// Each measurement in fresh runtime process; parent has no measured heap data.
import {spawnSync} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const worker=new URL('./memory-isolated-worker.mjs',import.meta.url).pathname;
const rows=[];let versions;
for(let i=0;i<9;i++){
 const args=process.versions.bun?['run',worker,String(i)]:['--expose-gc',worker,String(i)];
 const r=spawnSync(process.execPath,args,{encoding:'utf8',maxBuffer:20*1024*1024});if(r.status!==0)throw new Error(r.stderr||r.stdout);const x=JSON.parse(r.stdout);versions=x.versions;rows.push(...x.rows);
}
writeFileSync(process.argv[2],JSON.stringify({runtime:process.versions.bun?'bun':'node',versions,scope:'one fresh process per cohort/variant; 2 warmups then seed, explicit GC; global holder root/result; Bun sleep(1) to refresh between phases, bun:jsc heapStats separate metric from Node heapUsed',rows})+'\n');console.log(JSON.stringify({dest:process.argv[2],rows:rows.length}));
