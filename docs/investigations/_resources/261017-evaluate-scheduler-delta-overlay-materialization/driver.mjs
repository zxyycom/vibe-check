import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import * as baseline from './baseline.mjs';
import * as overlay from './overlay.mjs';
const mode=process.argv[2]??'oracle';
function graph(n,shape='wide'){
 const tasks=Array.from({length:n},(_,i)=>({taskId:'t'+i,admissionPriority:i%7,dependsOn:shape==='deep'&&i?['t'+(i-1)]:shape==='fanout'&&i?['t0']:[],observes:i>1&&shape==='fanout'?['t1']:[],mutex:shape==='groups'?['m'+i]:shape==='occupied'?['m'+(i%8)]:[],resourceClaims:shape==='occupied'?[{resourceId:'r',units:i%3+1}]:[],scopeId:shape==='scopes'?'s'+Math.floor(i/8):null}));
 if(shape==='scopes')for(let i=0;i<n;i++)if(i%8)tasks[i].dependsOn=['t'+(i-1)];
 return{tasks,scopes:shape==='scopes'?Array.from({length:Math.ceil(n/8)},(_,i)=>({id:'s'+i,maxParallel:2,activationTaskIds:['t'+(i*8)],terminalTaskId:'t'+Math.min(n-1,i*8+7)})):[],resourceCapacities:shape==='occupied'?[{resourceId:'r',units:8}]:[]};
}
function initial(api,n,shape){return api.createInitialAdmissionCoreState(api.compileAdmissionGraphInput({graph:graph(n,shape),maxParallel:8}));}
function capture(api,state){return {catalog:api.catalogForCore(state),inspection:api.inspectionForCore(state),static:api.staticAdmissionCandidateForCore(state),delta:state.lastTransition};}
function invariants(api,s){const p=api.taskSlotsForCore(s,'pending'),r=api.taskSlotsForCore(s,'running'),z=api.taskSlotsForCore(s,'settled');assert.equal(new Set([...p,...r,...z]).size,s.compiled.graph.tasks.length);assert.equal(p.length+r.length+z.length,s.compiled.graph.tasks.length);for(const[k,slots]of [['pending',p],['running',r],['settled',z]])for(const slot of slots)assert.equal(api.statusForCore(s,slot).kind,k);for(const slot of api.relationReadyTaskSlotsForCore(s))assert.equal(api.statusForCore(s,slot).kind,'pending');}
function next(api,state,id,outcome){const a=api.selectAdmissionCore(state,id);assert(a.accepted);const b=api.settleAdmissionCore(a.transition.state,id,outcome);assert(b.accepted);return [a.transition,b.transition];}
if(mode==='oracle'){
 let boundaries=0,snapshots=0;
 for(const threshold of [1,8,32])for(const shape of ['wide','groups','deep','fanout','occupied','scopes'])for(const outcome of ['satisfied','unsatisfied']){
  overlay.configure(threshold,true);let a=initial(baseline,48,shape),b=initial(overlay,48,shape);const saved=[[a,b,capture(baseline,a)]];
  for(let i=0;i<48;i++){
   assert.deepEqual(capture(overlay,b),capture(baseline,a));invariants(overlay,b);
   const c=baseline.staticAdmissionCandidateForCore(a);if(!c)break;
   const aa=next(baseline,a,c.task.id,outcome),bb=next(overlay,b,c.task.id,outcome);
   for(let j=0;j<2;j++){assert.deepEqual(bb[j].effects,aa[j].effects);assert.equal(bb[j].effectStates.length,aa[j].effectStates.length);for(let k=0;k<aa[j].effectStates.length;k++){assert.deepEqual(capture(overlay,bb[j].effectStates[k]),capture(baseline,aa[j].effectStates[k]));invariants(overlay,bb[j].effectStates[k]);boundaries++;}}
   a=aa[1].state;b=bb[1].state;saved.push([a,b,capture(baseline,a)]);
  }
  // Reverse read order after threshold changes cannot mutate old base or DTO.
  for(const[x,y,expected]of saved.reverse()){assert.deepEqual(capture(overlay,y),expected);assert.deepEqual(capture(baseline,x),expected);snapshots++;}
 }
 // Eight genuinely independent paths, each deepening from a common immutable root.
 for(const threshold of [1,8,32]){
  overlay.configure(threshold,true);const a=initial(baseline,96,'wide'),b=initial(overlay,96,'wide');const branches=[];
  for(let fork=0;fork<8;fork++){let x=a,y=b;const states=[];for(let d=0;d<48;d++){const id='t'+((d+fork*7)%96);const xx=next(baseline,x,id,'satisfied'),yy=next(overlay,y,id,'satisfied');x=xx[1].state;y=yy[1].state;states.push([x,y,capture(baseline,x)]);boundaries+=2;}branches.push(states);}
  for(const states of branches.reverse())for(const[x,y,expected]of states.reverse()){assert.deepEqual(capture(overlay,y),expected);snapshots++;}assert.deepEqual(capture(overlay,b),capture(baseline,a));
 }
 console.log(JSON.stringify({status:'PASS',boundaries,retainedSnapshotsQueried:snapshots,thresholds:[1,8,32],shapes:['wide','groups','deep','fanout','occupied','scopes'],forks:8,depth:48}));
}else{
 const runtime=process.versions.bun?'bun':'node';const which=process.argv[3]??'both';const rows=[];
 const specs=mode==='allocation'?[{n:2048,shape:'wide',read:'point',steps:2048},{n:2048,shape:'fanout',read:'point',steps:2048},{n:2048,shape:'wide',read:'branches',steps:128}]:[32,256,2048].flatMap(n=>['wide','groups','deep','fanout','occupied'].map(shape=>({n,shape,read:'point',steps:n}))).concat([32,256,2048].flatMap(n=>[{n,shape:'wide',read:'full',steps:Math.min(n,128)},{n,shape:'wide',read:'readheavy',steps:Math.min(n,256)},{n,shape:'wide',read:'branches',steps:Math.min(n,128)}]));
 function workload(api,spec){let root=initial(api,spec.n,spec.shape);const run=()=>{let digest=0;const retained=[];const forks=spec.read==='branches'?8:1;for(let f=0;f<forks;f++){let state=root;for(let i=0;i<spec.steps;i++){
    const candidate=spec.read==='branches'?{task:{id:'t'+((i+f*13)%spec.n)}}:api.staticAdmissionCandidateForCore(state);if(!candidate)break;
    const a=api.selectAdmissionCore(state,candidate.task.id);assert(a.accepted);state=a.transition.state;
    if(spec.read==='full'){digest+=api.catalogForCore(state).selectableTaskIds.length;digest+=api.inspectionForCore(state).runningTaskIds.length;}
    if(spec.read==='readheavy')for(let q=0;q<32;q++){digest+=api.validateAdmissionCoreSelection(state,'t'+((i+q)%spec.n)).accepted?1:0;digest+=api.staticAdmissionCandidateForCore(state)?.canAdmit?1:0;}
    const z=api.settleAdmissionCore(state,candidate.task.id,'satisfied');assert(z.accepted);state=z.transition.state;digest+=api.pendingTaskCountForCore(state);
    if(spec.read==='branches')retained.push(state);
   }digest+=api.taskSlotsForCore(state,'settled').length;}return{digest,retained};};return run;}
 for(const spec of specs)for(const variant of ['baseline','overlay8','overlay32']){
  if(which!=='both'&&!variant.startsWith(which))continue;
  const api=variant==='baseline'?baseline:overlay,threshold=variant==='overlay8'?8:32;
  api.configure(threshold,false);
  for(let i=0;i<2;i++)workload(api,spec)();
  const samples=[];let held,digest,allocation=null;
  const repeats=mode==='allocation'?1:5;
  for(let i=0;i<repeats;i++){
   held=undefined;const run=workload(api,spec);global.gc?.();const before=process.memoryUsage();let session;
   if(mode==='allocation'&&!process.versions.bun){const {Session}=await import('node:inspector');session=new Session();session.connect();await new Promise((r,j)=>session.post('HeapProfiler.startSampling',{samplingInterval:4096},e=>e?j(e):r()));}
   const start=performance.now();const result=run();samples.push(performance.now()-start);digest=result.digest;held=result.retained;
   if(session){allocation=await new Promise((r,j)=>session.post('HeapProfiler.stopSampling',(e,x)=>e?j(e):r(x.profile)));session.disconnect();}
   const preGC=process.memoryUsage();global.gc?.();const postGC=process.memoryUsage();if(i===repeats-1)rows.push({spec,variant,samples,digest,memory:{before,preGC,postGC,maxRSS:process.resourceUsage().maxRSS},allocation});
  }
  if(mode==='metrics'){api.configure(threshold,true);const opRun=workload(api,spec);const seedOperations=api.metrics();api.configure(threshold,true);opRun();rows.at(-1).operations=api.metrics();rows.at(-1).seedOperations=seedOperations;api.configure(threshold,false);}
 }
 const output={mode,runtime,versions:process.versions,rows};const dest=process.argv[4]??`tmp/scheduler-delta-overlay-investigation/${mode}-${runtime}-${which}.json`;writeFileSync(dest,JSON.stringify(output)+'\n');console.log(JSON.stringify({dest,rows:rows.length}));
}
