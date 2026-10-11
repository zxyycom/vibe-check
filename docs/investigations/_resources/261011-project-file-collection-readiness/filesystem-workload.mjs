import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { collectProjectFileSets } from '../../../../src/package-checks/project-files/collection.ts';
const mode = process.argv[2] ?? 'before';
const root = fs.mkdtempSync(path.join(os.tmpdir(),'collection-cost-'));
const writes = [['src',80],['docs',20],['node_modules',80],['build',40],['private',20]];
try {
  for (const [area,count] of writes) for (let directory=0;directory<count;directory++) {
    const base=path.join(root,area,`d${directory}`); fs.mkdirSync(base,{recursive:true});
    for (let file=0;file<30;file++) fs.writeFileSync(path.join(base,`f${file}.${area==='docs'?'md':'ts'}`),'export const input = 1;\n');
  }
  const exclude=['**/node_modules/**','**/build/**'];
  const files=(patterns,useDefaultExcludes=true)=>mode==='before'?{include:patterns.filter(p=>!p.startsWith('!')),exclude:[...exclude,...patterns.filter(p=>p.startsWith('!')).map(p=>p.slice(1))],source:'filesystem'}:{patterns,useDefaultExcludes};
  const cases={wide:{all:files(['**/*'])},narrow:{source:files(['src/**/*.ts'])},mixed:{source:files(['src/**/*.ts']),docs:files(['docs/**/*.md'])}};
  const rows=[];
  for(const [name,selections] of Object.entries(cases)) {
    const trials=[];
    for(let trial=0;trial<11;trial++) {
      let reads=0,stats=0;const read=fs.readdirSync,stat=fs.lstatSync;
      fs.readdirSync=function(...args){reads++;return read.apply(this,args)};
      fs.lstatSync=function(...args){stats++;return stat.apply(this,args)};
      const started=performance.now();let sets;
      try{sets=collectProjectFileSets(root,selections)}finally{fs.readdirSync=read;fs.lstatSync=stat}
      trials.push({ms:performance.now()-started,reads,stats,counts:Object.fromEntries([...sets].map(([id,paths])=>[id,paths.length])),heapBytes:process.memoryUsage().heapUsed,rssBytes:process.memoryUsage().rss});
    }
    const times=trials.slice(1).map(t=>t.ms).sort((a,b)=>a-b);
    rows.push({name,warmMedianMs:times[5],warmMaxMs:times.at(-1),trials});
  }
  console.log(JSON.stringify({mode,node:process.version,bun:process.versions.bun??null,platform:process.platform,files:7200,cache:'one initial trial then ten warm filesystem trials; no forced GC',rows},null,2));
}finally{fs.rmSync(root,{recursive:true,force:true})}
