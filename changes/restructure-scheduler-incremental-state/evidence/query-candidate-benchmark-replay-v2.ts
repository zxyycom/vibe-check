import { performance } from "node:perf_hooks";
import { Session } from "node:inspector";
import { prepareTaskGraph } from "../../src/project-run/task-scheduler/graph.ts";
import { compilePreparedAdmissionGraph, createInitialAdmissionCoreState, selectAdmissionCore, settleRunningAdmissionCore } from "../../src/project-run/task-scheduler/admission-core/core.ts";
import { persistentStaticAdmissionCandidateForCore as staticAdmissionCandidateForCore } from "./persistent-static-query-control-v2.ts";
import { nativeStaticAdmissionCandidateForCore } from "./native-static-query-eager-replay-v2.ts";
import { workload, sizes } from "./corpus.ts";
const allocations = process.argv.includes('--allocations');
const session = allocations ? new Session() : undefined; session?.connect();
const post = (method: string, params: object={}) => new Promise<any>((resolve,reject)=>session!.post(method as any,params,(e,v)=>e?reject(e):resolve(v)));
const rows=[];let checksum=0;
for (const shape of ['wide','groups','heterogeneous','scopes','blocked-prefix'] as const) for (const size of sizes) {
 const input=workload(shape,size);const graph=prepareTaskGraph(input.graph,input.maxParallel);const compiled=compilePreparedAdmissionGraph(graph,input.maxParallel);
 let state=createInitialAdmissionCoreState(compiled);
 if(shape==='blocked-prefix'){const action=selectAdmissionCore(state,graph.tasks[0]!.id);if(!action.accepted)throw Error(action.reason.kind);state=action.transition.state;}
 const forks=[state];
 if(shape!=='blocked-prefix')for(const task of graph.tasks){const a=selectAdmissionCore(state,task.id);if(!a.accepted)throw Error(a.reason.kind);state=a.transition.state;const b=settleRunningAdmissionCore(state,task.id,'completed');if(!b.accepted)throw Error(b.reason.kind);state=b.transition.state;if(forks.length<8)forks.push(state);}
 for(const [kind,query]of [['persistent-merge',staticAdmissionCandidateForCore],['native-reference-heap',nativeStaticAdmissionCandidateForCore]] as const){
   const run=()=>{for(let i=0;i<64;i++)for(const fork of forks)checksum+=query(fork)?.task.id.length??0;};run();const samples=[];
   for(let i=0;i<(allocations?1:7);i++){
    (globalThis as any).gc?.();const before=process.memoryUsage();if(allocations)await post('HeapProfiler.startSampling',{samplingInterval:4096,includeObjectsCollectedByMajorGC:true,includeObjectsCollectedByMinorGC:true});
    const start=performance.now();run();const elapsedMs=performance.now()-start;const after=process.memoryUsage();let allocatedSampleBytes=null;
    if(allocations){const {profile}=await post('HeapProfiler.stopSampling');const sum=(n:any):number=>n.selfSize+n.children.reduce((s:number,c:any)=>s+sum(c),0);allocatedSampleBytes=sum(profile.head);}
    (globalThis as any).gc?.();samples.push({elapsedMs,heapGrowthBytes:after.heapUsed-before.heapUsed,retainedHeapBytes:process.memoryUsage().heapUsed-before.heapUsed,rssBytes:after.rss,allocatedSampleBytes});
   }rows.push({shape,size,kind,forks:forks.length,samples});
 }
}
session?.disconnect();console.log(JSON.stringify({runtime:process.versions,sourceRevision:process.env.SOURCE_REVISION,replayProtocol:"final-B-helpers-explicit-control-eager-v2",allocations,checksum,rows}));
