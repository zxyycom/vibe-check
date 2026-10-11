import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {Worker} from 'node:worker_threads';

// Node 24.18: resources.mjs <installed-package-root> > <output-json>
// One-off private fault/FD probes and separate public Run cancellation observations.
// These observations are not performance samples or current Test Evidence entities.
const entry=resolve(process.argv[2]);
const api=await import(pathToFileURL(join(entry,'index.mjs')));
const {measureFunctionMetrics}=await import(pathToFileURL(join(entry,'dist/esm/package-checks/function-metrics/measurement.mjs')));
const {createNodeFunctionMetricsWorker}=await import(pathToFileURL(join(entry,'dist/esm/package-checks/function-metrics/analyzer-worker-port.mjs')));
const root=mkdtempSync(join(tmpdir(),'vibe-check-admission-resources-'));
const evidence={node:process.version,entry,version:JSON.parse(fs.readFileSync(join(entry,'package.json'))).version,observations:[]};
const native={open:fs.openSync,read:fs.readSync,close:fs.closeSync,immediate:globalThis.setImmediate};
let active=false;
let observation,failOpen=false,failRead=false;
fs.openSync=(path,...args)=>{if(active&&String(path).startsWith(root)){if(failOpen)throw new Error('injected open failure');const fd=native.open(path,...args);observation.opened.push({fd,path:String(path).slice(root.length+1)});return fd;}return native.open(path,...args);};
fs.readSync=(fd,...args)=>{if(active&&observation.opened.some(o=>o.fd===fd)){if(failRead)throw new Error('injected read failure');const n=native.read(fd,...args);observation.bytesRead+=n;return n;}return native.read(fd,...args);};
fs.closeSync=fd=>{if(active&&observation.opened.some(o=>o.fd===fd))observation.closed.push(fd);return native.close(fd);};
syncBuiltinESMExports();
const begin=name=>{observation={name,opened:[],closed:[],bytesRead:0,workers:0,posts:0,unsubscribed:0,terminated:0};evidence.observations.push(observation);};
function assertClosed(){assert.deepEqual([...observation.closed].sort(),observation.opened.map(o=>o.fd).sort());}
function port(reply={kind:'complete',metrics:[]}){let listeners;return{subscribe:l=>{listeners=l;return()=>{observation.unsubscribed++}},postMessage:request=>{observation.posts++;observation.submitted=request.files.map(f=>({path:f.path,bytes:Buffer.byteLength(f.source)}));listeners.message(reply)},terminate:()=>{observation.terminated++}};}
async function measure(paths,signal=new AbortController().signal,createWorker=()=>port()){
 active=true;const result=await measureFunctionMetrics({input:{rootDir:root,approvedExactPaths:paths,areas:[]},signal},{createWorker:()=>{observation.workers++;return createWorker();}});active=false;observation.result=result;assertClosed();return result;
}
const options={codeAreas:{source:{files:{patterns:['*'],useDefaultExcludes:false}}},findingWaivers:[{identity:{functionName:'absent',metric:'parameter-count',path:'input.ts',startLine:1},reason:'Incomplete results must not audit.'}]};
const outputs={machinePublication:{enabled:false},diagnosticLogging:{enabled:false},progressRendering:{enabled:false}};
try{
 const cap=8*1024*1024;fs.writeFileSync(join(root,'input.ts'),Buffer.alloc(cap,0x20));fs.writeFileSync(join(root,'later.ts'),'function later() { return 1; }');
 for(const [name,paths,expected] of [['empty',[], 'complete'],['exact8',['input.ts'],'complete']]){begin(name);assert.equal((await measure(paths)).kind,expected);}
 for(let i=0;i<8;i++)fs.writeFileSync(join(root,`cap-${i}.ts`),Buffer.alloc(cap,0x20));
 const paths=Array.from({length:8},(_,i)=>`cap-${i}.ts`);begin('exact64');assert.equal((await measure(paths)).kind,'complete');assert.equal(observation.submitted.reduce((s,f)=>s+f.bytes,0),64*1024*1024);
 fs.writeFileSync(join(root,'plus.ts'),' ');begin('aggregate-plus1');assert.equal((await measure([...paths,'plus.ts'])).kind,'resource-limit-exceeded');assert.equal(observation.workers,0);
 fs.writeFileSync(join(root,'over.ts'),Buffer.alloc(cap+1,0x20));begin('file-plus1');assert.equal((await measure(['over.ts'])).kind,'resource-limit-exceeded');assert.equal(observation.workers,0);
 begin('missing');assert.equal((await measure(['missing.ts'])).kind,'source-unavailable');
 begin('open-failure');failOpen=true;assert.equal((await measure(['input.ts'])).kind,'source-unavailable');failOpen=false;
 begin('read-failure');failRead=true;assert.equal((await measure(['input.ts'])).kind,'source-unavailable');failRead=false;assert.equal(observation.opened.length,1);
 begin('utf8-bom-newlines');fs.writeFileSync(join(root,'text.ts'),Buffer.from('efbbbf610d0a620d','hex'));let source;await measure(['text.ts'],undefined,()=>{const p=port();return{...p,postMessage:r=>{source=r.files[0].source;p.postMessage(r)}}});assert.equal(source,'a\nb\n');observation.source=source;
 begin('invalid-utf8-fallback');fs.writeFileSync(join(root,'text.ts'),Buffer.from('efbbbf61ff0d0a','hex'));await measure(['text.ts'],undefined,()=>{const p=port();return{...p,postMessage:r=>{source=r.files[0].source;p.postMessage(r)}}});assert.equal(source,'\ufeffa\r\n');observation.source=source;
 for(const event of ['create','post','message','error','exit0','exit1']){
  begin('worker-failure-'+event);let listeners;
  const result=await measure(['later.ts'],undefined,()=>{
   if(event==='create')throw new Error('injected Worker creation failure');
   return {subscribe:l=>{listeners=l;return()=>{observation.unsubscribed++}},postMessage:()=>{observation.posts++;if(event==='post')throw new Error('injected post failure');if(event==='message')listeners.message({kind:'complete',metrics:[{}]});else if(event==='error')listeners.error();else listeners.exit(event==='exit0'?0:1)},terminate:()=>{observation.terminated++}};
  });
  assert.deepEqual(result,{kind:'analysis-failed'});
  if(event!=='create'){assert.equal(observation.unsubscribed,1);assert.equal(observation.terminated,1);listeners.message({kind:'complete',metrics:[]});listeners.error();listeners.exit(0);assert.equal(observation.unsubscribed,1);assert.equal(observation.terminated,1);}
 }
 begin('real-worker-signal-cleanup');const inFlight=new AbortController();const added=[],removed=[];
 const add=inFlight.signal.addEventListener.bind(inFlight.signal),remove=inFlight.signal.removeEventListener.bind(inFlight.signal);
 inFlight.signal.addEventListener=(event,listener,...args)=>{added.push({event,listener});return add(event,listener,...args)};
 inFlight.signal.removeEventListener=(event,listener,...args)=>{removed.push({event,listener});return remove(event,listener,...args)};
 let lateListeners;
 assert.equal((await measure(['later.ts'],inFlight.signal,()=>{const worker=createNodeFunctionMetricsWorker();return{subscribe:l=>{lateListeners=l;const unsubscribe=worker.subscribe(l);return()=>{observation.unsubscribed++;unsubscribe()}},postMessage:r=>{worker.postMessage(r);observation.posts++;inFlight.abort()},terminate:()=>{observation.terminated++;worker.terminate()}}})).kind,'cancelled');
 assert.equal(added.length,1);assert.equal(removed.length,1);assert.equal(added[0].event,'abort');assert.equal(added[0].listener,removed[0].listener);observation.abortListenersAdded=added.length;observation.abortListenersRemoved=removed.length;
 lateListeners.message({kind:'complete',metrics:[]});lateListeners.error();lateListeners.exit(0);assert.equal(observation.terminated,1);assert.equal(observation.unsubscribed,1);
 begin('pre-abort');const pre=new AbortController();pre.abort();assert.equal((await measure(['input.ts'],pre.signal)).kind,'cancelled');assert.equal(observation.workers,0);assert.equal(observation.opened.length,0);
 for(const kind of ['timer','io']){
  begin(`default-${kind}-abort`);const controller=new AbortController();let yields=0;
  globalThis.setImmediate=(...args)=>{if(++yields===1){const abort=()=>{observation.callbackObserved=true;controller.abort()};if(kind==='timer')setTimeout(abort,0);else fs.readFile(join(root,'later.ts'),error=>{assert.equal(error,null);abort()});}return Reflect.apply(native.immediate,globalThis,args)};
  assert.equal((await measure(['input.ts','later.ts'],controller.signal)).kind,'cancelled');globalThis.setImmediate=native.immediate;
  observation.yields=yields;assert.equal(observation.callbackObserved,true);assert.ok(observation.bytesRead>0&&observation.bytesRead<cap);assert.deepEqual(observation.opened.map(o=>o.path),['input.ts']);assert.equal(observation.workers,0);
 }
 for(const kind of ['timer','io','worker']){
  begin(`public-${kind}-abort`);fs.writeFileSync(join(root,'rejected.md'),'unsupported');const controller=new AbortController();let yields=0;
  const originalPost=Worker.prototype.postMessage,originalOff=Worker.prototype.off,originalTerminate=Worker.prototype.terminate;
  const abort=()=>{observation.callbackObserved=true;controller.abort()};
  if(kind==='worker'){
   Worker.prototype.postMessage=function(...args){observation.workers++;observation.posts++;const value=Reflect.apply(originalPost,this,args);abort();return value};
   Worker.prototype.off=function(event,...args){observation.offEvents??=[];observation.offEvents.push(event);return Reflect.apply(originalOff,this,[event,...args])};
   Worker.prototype.terminate=function(...args){observation.terminated++;return Reflect.apply(originalTerminate,this,args)};
  }else globalThis.setImmediate=(...args)=>{if(++yields===1){if(kind==='timer')setTimeout(abort,0);else fs.readFile(join(root,'later.ts'),error=>{assert.equal(error,null);abort()});}return Reflect.apply(native.immediate,globalThis,args)};
  // Select only one accepted file plus rejection, excluding pressure fixtures.
  const config=api.defineConfig({checks:[api.functionMetrics({...options,codeAreas:{source:{files:{patterns:['input.ts','rejected.md'],useDefaultExcludes:false}}}})],outputs});
  active=true;const result=await api.run(config,{projectRoot:root,signal:controller.signal});
  active=false;globalThis.setImmediate=native.immediate;Worker.prototype.postMessage=originalPost;Worker.prototype.off=originalOff;Worker.prototype.terminate=originalTerminate;
  observation.publicResult={kind:result.kind,records:result.snapshot?.records,checks:result.snapshot?.checks,messages:result.checkMessages};
  assert.equal(result.kind,'cancelled');assertClosed();assert.equal(observation.callbackObserved,true);
  assert.equal(result.snapshot.records.length,1);assert.equal(result.snapshot.records[0].data.kind,'input-rejected');assert.equal(result.snapshot.checks[0].outcome.reason.code,'execution-cancelled');assert.equal(Object.hasOwn(result.snapshot.checks[0].outcome,'data'),false);
  if(kind==='worker'){assert.equal(observation.posts,1);assert.equal(observation.terminated,1);for(const event of ['message','error','exit'])assert.equal(observation.offEvents.filter(e=>e===event).length,1);}else assert.ok(observation.bytesRead<cap);
 }
 console.log(JSON.stringify(evidence,null,2));
}finally{fs.openSync=native.open;fs.readSync=native.read;fs.closeSync=native.close;globalThis.setImmediate=native.immediate;syncBuiltinESMExports();rmSync(root,{recursive:true,force:true});}
