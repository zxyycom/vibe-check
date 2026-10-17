// Dedicated non-timing pass; workloads copied verbatim from frozen driver.mjs helpers.
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import * as baseline from './baseline.mjs';
import * as overlay from './overlay.mjs';
const graph=(n,shape)=>({tasks:Array.from({length:n},(_,i)=>({taskId:'t'+i,admissionPriority:i%7,dependsOn:shape==='fanout'&&i?['t0']:[],observes:i>1&&shape==='fanout'?['t1']:[],mutex:[],resourceClaims:[],scopeId:null})),scopes:[],resourceCapacities:[]});
const specs=[{n:2048,shape:'wide',read:'point',steps:2048},{n:2048,shape:'fanout',read:'point',steps:2048},{n:2048,shape:'wide',read:'branches',steps:128}];
const rows=[];const gc=()=>process.versions.bun?Bun.gc(true):global.gc();
for(const spec of specs)for(const variant of ['baseline','overlay8','overlay32']){
 const api=variant==='baseline'?baseline:overlay;api.configure(variant==='overlay8'?8:32,false);
 function prepare(){return api.createInitialAdmissionCoreState(api.compileAdmissionGraphInput({graph:graph(spec.n,spec.shape),maxParallel:8}));}
 function run(root){let digest=0;const retained=[];for(let f=0;f<(spec.read==='branches'?8:1);f++){let state=root;for(let i=0;i<spec.steps;i++){
 const candidate=spec.read==='branches'?{task:{id:'t'+((i+f*13)%spec.n)}}:api.staticAdmissionCandidateForCore(state);if(!candidate)break;const a=api.selectAdmissionCore(state,candidate.task.id);assert(a.accepted);state=a.transition.state;const z=api.settleAdmissionCore(state,candidate.task.id,'satisfied');assert(z.accepted);state=z.transition.state;digest+=api.pendingTaskCountForCore(state);if(spec.read==='branches')retained.push(state);
 }digest+=api.taskSlotsForCore(state,'settled').length;}return{digest,retained};}
 for(let w=0;w<2;w++)run(prepare());
 const root=prepare();globalThis.investigationRetention=null;gc();const before=process.memoryUsage();let session,profile=null;
 if(process.argv[3]==='profile'&&!process.versions.bun){const{Session}=await import('node:inspector');session=new Session();session.connect();await new Promise((r,j)=>session.post('HeapProfiler.startSampling',{samplingInterval:4096,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true},e=>e?j(e):r()));}
 const result=run(root);globalThis.investigationRetention={root,result};const end=process.memoryUsage();
 if(session){profile=await new Promise((r,j)=>session.post('HeapProfiler.stopSampling',(e,x)=>e?j(e):r(x.profile)));session.disconnect();}
 gc();const postGC=process.memoryUsage();assert.equal(globalThis.investigationRetention.result.digest,result.digest);
 rows.push({spec,variant,digest:result.digest,retainedStates:result.retained.length,memory:{before,end,postGC,maxRSS:process.resourceUsage().maxRSS},profile});globalThis.investigationRetention=null;
}
const dest=process.argv[2];writeFileSync(dest,JSON.stringify({runtime:process.versions.bun?'bun':'node',versions:process.versions,gc:'explicit Node global.gc / Bun.gc(true)',mode:process.argv[3]==='profile'?'profile':'memory',sampling:'profile mode only: Node inspector HeapProfiler samplingInterval=4096, includeObjectsCollectedByMajorGC=true, includeObjectsCollectedByMinorGC=true; sampled allocation estimate, not exact allocation count',rows})+'\n');console.log(JSON.stringify({dest,rows:rows.length}));
