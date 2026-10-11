import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fork,execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {cpus,platform,release} from 'node:os';
import {join,resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {pathToFileURL,fileURLToPath} from 'node:url';

// One-off Investigation runner, not a repository benchmark framework.
// Node 24.18: benchmark.mjs <before-package-root> <after-package-root> <corpora-root> <output-json>
// corpora-root has real/short/large snapshots and ../corpus-manifest.json.
// Only public installed-root imports enter the timed operation; no source or port seams.
const outputs={machinePublication:{enabled:false},diagnosticLogging:{enabled:false},progressRendering:{enabled:false}};
const options={findingPolicy:'non-blocking',codeAreas:{source:{files:{patterns:['src/**/*.ts'],useDefaultExcludes:false},limits:{cyclomaticComplexity:{maximum:1},nestingDepth:{maximum:1},parameters:{maximum:1}}}},findingWaivers:[{identity:{functionName:'absent',metric:'parameter-count',path:'src/absent.ts',startLine:1},reason:'Stable unused waiver verifies complete audit semantics.'}]};
function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
const digest=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
if(process.argv[2]==='child'){
  const [entry,corpusRoot]=process.argv.slice(3);
  const api=await import(pathToFileURL(join(entry,'index.mjs')));
  const config=api.defineConfig({checks:[api.functionMetrics(options)],outputs});
  process.on('message',async()=>{
    try{
      const start=performance.now();
      const result=await api.run(config,{projectRoot:corpusRoot});
      const wallMs=performance.now()-start;
      assert.equal(result.kind,'completed');
      assert.ok(['passed','failed'].includes(result.snapshot.checks[0]?.outcome?.status));
      // Explicit semantic projection drops only Run IDs and timing; full outcome, Records and message text stay.
      const semantic=canonical({kind:result.kind,aggregate:result.aggregate,checks:result.snapshot.checks.map(c=>({checkId:c.checkId,outcome:c.outcome})),records:result.snapshot.records,messages:result.checkMessages});
      process.send({wallMs,semantic,semanticSha256:digest(semantic)});
    }catch(error){process.send({error:String(error),stack:error.stack});}
  });
  process.send({ready:true});
}else{
  const [before,after,corporaRoot,output]=process.argv.slice(2).map(path=>resolve(path));
  const evidence={formedAt:new Date().toISOString(),environment:{node:process.version,platform:platform(),release:release(),cpu:cpus()[0]?.model,cpuCount:cpus().length,filesystem:execFileSync('df',['-T',before,after,corporaRoot],{encoding:'utf8'}),cache:'same read-only on-disk snapshots, warm OS page cache; no cache flush',temperature:'long-lived installed-root host per side and corpus, exactly one uncounted warmup; every invocation creates its real Worker',background:'no concurrent build/test/Gate; idle other host, sequential IPC commands'},before,after,options,outputs,corpusManifest:JSON.parse(readFileSync(join(corporaRoot,'../corpus-manifest.json'))),corpora:{}};
  function verifyCorpus(corpus){for(const file of evidence.corpusManifest.corpora[corpus]){const bytes=readFileSync(join(corporaRoot,corpus,file.path));assert.equal(bytes.length,file.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256);}}
  const self=fileURLToPath(import.meta.url);
  async function start(entry,corpus){
    const child=fork(self,['child',entry,join(corporaRoot,corpus)],{stdio:['ignore','inherit','inherit','ipc']});
    const wait=()=>new Promise((res,rej)=>{const message=m=>{child.off('exit',exit);if(m.error)rej(new Error(JSON.stringify(m)));else res(m);};const exit=c=>{child.off('message',message);rej(new Error(`child exited ${c}`));};child.once('message',message);child.once('exit',exit);});
    await wait();return {child,run:()=>{const p=wait();child.send({run:true});return p;}};
  }
  function quantile(values,p){const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.ceil(p*sorted.length)-1];}
  function stats(values){return {n:values.length,medianMs:quantile(values,.5),p95Ms:quantile(values,.95),minMs:Math.min(...values),maxMs:Math.max(...values),iqrMs:quantile(values,.75)-quantile(values,.25)};}
  for(const corpus of ['real','short','large']){
    verifyCorpus(corpus);
    const result={cold:[],warmups:[],samples:[],semantic:null};evidence.corpora[corpus]=result;
    for(const [side,entry]of [['A',before],['B',after]]){
      const startMs=performance.now();const host=await start(entry,corpus);const sample=await host.run();const supervisorWallMs=performance.now()-startMs;host.child.disconnect();
      result.cold.push({side,supervisorWallMs,operationWallMs:sample.wallMs,semanticSha256:sample.semanticSha256});
      if(result.semantic===null)result.semantic=sample.semantic;else assert.deepEqual(sample.semantic,result.semantic);
    }
    const hosts={A:await start(before,corpus),B:await start(after,corpus)};
    try{
      for(const side of ['A','B']){const sample=await hosts[side].run();assert.deepEqual(sample.semantic,result.semantic);result.warmups.push({side,wallMs:sample.wallMs,semanticSha256:sample.semanticSha256});}
      for(let block=0;block<15;block++)for(const [position,side]of ['A','B','B','A'].entries()){
        const sample=await hosts[side].run();assert.deepEqual(sample.semantic,result.semantic);
        result.samples.push({block,position,side,wallMs:sample.wallMs,semanticSha256:sample.semanticSha256});
        writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
      }
      const a=result.samples.filter(s=>s.side==='A').map(s=>s.wallMs);const b=result.samples.filter(s=>s.side==='B').map(s=>s.wallMs);
      const blockDeltas=Array.from({length:15},(_,block)=>{const v=result.samples.filter(s=>s.block===block);return(v[1].wallMs+v[2].wallMs-v[0].wallMs-v[3].wallMs)/2;});
      let seed=85776;const means=[];for(let i=0;i<10000;i++){let sum=0;for(let j=0;j<15;j++){seed=(1664525*seed+1013904223)>>>0;sum+=blockDeltas[seed%15];}means.push(sum/15);}
      result.statistics={pairedMeanBootstrap95Ms:[quantile(means,.025),quantile(means,.975)],negativeBlocks:blockDeltas.filter(d=>d<0).length,A:stats(a),B:stats(b),blockDeltaBMinusAMs:blockDeltas,paired:stats(blockDeltas),medianChangePercent:(quantile(b,.5)/quantile(a,.5)-1)*100};
      console.log(corpus,JSON.stringify(result.statistics));
    }finally{hosts.A.child.disconnect();hosts.B.child.disconnect();}
    verifyCorpus(corpus);
  }
  writeFileSync(output,JSON.stringify(evidence,null,2)+'\n');
}
