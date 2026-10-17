import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import * as baseline from './baseline.mjs';
import * as overlay from './overlay.mjs';
const mode='timing';
function graph(n,shape='wide'){
 const tasks=Array.from({length:n},(_,i)=>({taskId:'t'+i,admissionPriority:i%7,dependsOn:shape==='deep'&&i?['t'+(i-1)]:shape==='fanout'&&i?['t0']:[],observes:i>1&&shape==='fanout'?['t1']:[],mutex:shape==='groups'?['m'+i]:shape==='occupied'?['m'+(i%8)]:[],resourceClaims:shape==='occupied'?[{resourceId:'r',units:i%3+1}]:[],scopeId:shape==='scopes'?'s'+Math.floor(i/8):null}));
 if(shape==='scopes')for(let i=0;i<n;i++)if(i%8)tasks[i].dependsOn=['t'+(i-1)];
 return{tasks,scopes:shape==='scopes'?Array.from({length:Math.ceil(n/8)},(_,i)=>({id:'s'+i,maxParallel:2,activationTaskIds:['t'+(i*8)],terminalTaskId:'t'+Math.min(n-1,i*8+7)})):[],resourceCapacities:shape==='occupied'?[{resourceId:'r',units:8}]:[]};
}
function initial(api,n,shape){return api.createInitialAdmissionCoreState(api.compileAdmissionGraphInput({graph:graph(n,shape),maxParallel:8}));}
function capture(api,state){return {catalog:api.catalogForCore(state),inspection:api.inspectionForCore(state),static:api.staticAdmissionCandidateForCore(state),delta:state.lastTransition};}
function invariants(api,s){const p=api.taskSlotsForCore(s,'pending'),r=api.taskSlotsForCore(s,'running'),z=api.taskSlotsForCore(s,'settled');assert.equal(new Set([...p,...r,...z]).size,s.compiled.graph.tasks.length);assert.equal(p.length+r.length+z.length,s.compiled.graph.tasks.length);for(const[k,slots]of [['pending',p],['running',r],['settled',z]])for(const slot of slots)assert.equal(api.statusForCore(s,slot).kind,k);for(const slot of api.relationReadyTaskSlotsForCore(s))assert.equal(api.statusForCore(s,slot).kind,'pending');}
function next(api,state,id,outcome){const a=api.selectAdmissionCore(state,id);assert(a.accepted);const b=api.settleAdmissionCore(a.transition.state,id,outcome);assert(b.accepted);return [a.transition,b.transition];}
 const specs=mode==='allocation'?[{n:2048,shape:'wide',read:'point',steps:2048},{n:2048,shape:'fanout',read:'point',steps:2048},{n:2048,shape:'wide',read:'branches',steps:128}]:[32,256,2048].flatMap(n=>['wide','groups','deep','fanout','occupied'].map(shape=>({n,shape,read:'point',steps:n}))).concat([32,256,2048].flatMap(n=>[{n,shape:'wide',read:'full',steps:Math.min(n,128)},{n,shape:'wide',read:'readheavy',steps:Math.min(n,256)},{n,shape:'wide',read:'branches',steps:Math.min(n,128)}])); function workload(api,spec){let root=initial(api,spec.n,spec.shape);const run=()=>{let digest=0;const retained=[];const forks=spec.read==='branches'?8:1;for(let f=0;f<forks;f++){let state=root;for(let i=0;i<spec.steps;i++){
    const candidate=spec.read==='branches'?{task:{id:'t'+((i+f*13)%spec.n)}}:api.staticAdmissionCandidateForCore(state);if(!candidate)break;
    const a=api.selectAdmissionCore(state,candidate.task.id);assert(a.accepted);state=a.transition.state;
    if(spec.read==='full'){digest+=api.catalogForCore(state).selectableTaskIds.length;digest+=api.inspectionForCore(state).runningTaskIds.length;}
    if(spec.read==='readheavy')for(let q=0;q<32;q++){digest+=api.validateAdmissionCoreSelection(state,'t'+((i+q)%spec.n)).accepted?1:0;digest+=api.staticAdmissionCandidateForCore(state)?.canAdmit?1:0;}
    const z=api.settleAdmissionCore(state,candidate.task.id,'satisfied');assert(z.accepted);state=z.transition.state;digest+=api.pendingTaskCountForCore(state);
    if(spec.read==='branches')retained.push(state);
   }digest+=api.taskSlotsForCore(state,'settled').length;}return{digest,retained};};return run;}
const rows=[];
const variants=['baseline','overlay8','overlay32'];
const orders=[[0,1,2],[2,1,0],[1,0,2],[2,0,1],[1,2,0],[0,2,1]];
for(const spec of specs){
 const cohort=variants.map(variant=>({spec,variant,samples:[]}));
 for(const variant of variants){const api=variant==='baseline'?baseline:overlay;api.configure(variant==='overlay8'?8:32,false);for(let i=0;i<2;i++)workload(api,spec)();}
 for(const order of orders)for(const k of order){const variant=variants[k],api=k===0?baseline:overlay;api.configure(k===1?8:32,false);const run=workload(api,spec);if(process.versions.bun)Bun.gc(true);else global.gc();const start=performance.now();const result=run();cohort[k].samples.push(performance.now()-start);cohort[k].digest=result.digest;}
 assert.equal(new Set(cohort.map(r=>r.digest)).size,1);rows.push(...cohort);
}
const dest=process.argv[4];writeFileSync(dest,JSON.stringify({version:2,runtime:process.versions.bun?'bun':'node',versions:process.versions,orders:orders.map(o=>o.map(k=>variants[k])),warmups:2,samples:6,gc:'Node global.gc / Bun.gc(true), outside span',rows})+'\n');console.log(JSON.stringify({dest,rows:rows.length}));
