import assert from 'node:assert/strict';
import {compile,seed,action,counters,candidates,choose,delay,fixture,flow} from './model.mjs';
import {compileAdmissionGraphInput} from '../../src/project-run/task-scheduler/admission-core/input.ts';
import {createInitialAdmissionCoreState,selectAdmissionCore,settleAdmissionCore,cancelPendingAdmissionCore} from '../../src/project-run/task-scheduler/admission-core/core.ts';
import {staticAdmissionCandidateForCore} from '../../src/project-run/task-scheduler/admission-core/static-selection-query.ts';
import {admissionCandidatesForCore} from '../../src/project-run/task-scheduler/admission-core/selection-query.ts';
export function productInput(tasks){const cs=[...new Set(tasks.map(t=>t.constraint))];return {maxParallel:tasks.length+1,graph:{resourceCapacities:cs.map(i=>({resourceId:`r${i}`,units:tasks.length+1})),scopes:[],tasks:tasks.map((t,i)=>({taskId:`t${i}`,dependsOn:t.d.map(i=>`t${i}`),observes:t.o.map(i=>`t${i}`),admissionPriority:t.priority,mutex:[],resourceClaims:[{resourceId:`r${t.constraint}`,units:1}],scopeId:null}))}};}
function oracleSeed(tasks){return {status:tasks.map(()=>0),entered:tasks.map(t=>t.d.length+t.o.length===0?0:undefined),delay:tasks.map(()=>undefined)}}
function oracleViable(tasks,s,i){const t=tasks[i];return s.status[i]===0&&t.d.every(j=>s.status[j]===2)&&t.o.every(j=>s.status[j]>=2)}
function oracleAction(tasks,s,kind,i,now){s=structuredClone(s);const effects=[];function update(id,status,label){if(s.status[id]===0&&s.entered[id]!==undefined)s.delay[id]=now-s.entered[id];s.status[id]=status;effects.push([label,id]);for(let j=0;j<tasks.length;j++)if(s.entered[j]===undefined&&oracleViable(tasks,s,j))s.entered[j]=now;}
  if(kind==='cancel'){for(let j=0;j<tasks.length;j++)if(s.status[j]===0)update(j,5,'cancelled-before-start');}
  else if(kind==='select')update(i,1,'admitted');
  else {update(i,kind==='pass'?2:3,kind==='pass'?'completed':'prerequisite-unsatisfied');while(true){let forced=-1;for(let j=0;j<tasks.length;j++)if(s.status[j]===0&&tasks[j].d.every(id=>s.status[id]>=2)&&tasks[j].d.some(id=>s.status[id]!==2))forced=j;if(forced<0)break;update(forced,4,'blocked');}}
  return {state:s,effects};
}
let boundaries=0,forks=0,traces=0;const realCounts=[];
function trace(tasks,ops,label){
  const variants=['eager','shared'].map(mode=>({c:compile(tasks,mode),s:undefined,stats:counters()}));for(const v of variants)v.s=seed(v.c);
  let oracle=oracleSeed(tasks),product=createInitialAdmissionCoreState(compileAdmissionGraphInput(productInput(tasks))),t=0;const saved=[];
  function check(){const expected=tasks.flatMap((_,i)=>oracleViable(tasks,oracle,i)?[i]:[]);const expectedHead=expected.toSorted((a,b)=>tasks[b].priority-tasks[a].priority||a-b)[0];for(const v of variants){assert.deepEqual(candidates(v.c,v.s),expected,`${label} candidates`);assert.equal(v.s.count,expected.length,`${label} count`);assert.equal(choose(v.c,v.s),expectedHead,`${label} head`);for(let i=0;i<tasks.length;i++){const d=oracle.delay[i]??(oracle.status[i]===0&&oracle.entered[i]!==undefined?t-oracle.entered[i]:undefined);assert.equal(delay(v.c,v.s,i,t),d,`${label} delay t${i}`);assert.equal(v.s.status.get(i),oracle.status[i]);}}
    assert.deepEqual(admissionCandidatesForCore(product).map(x=>Number(x.task.id.slice(1))),expected,`${label} Product candidates`);
    assert.equal(staticAdmissionCandidateForCore(product)?.task.id,expectedHead===undefined?undefined:`t${expectedHead}`,`${label} Product ordinary head`);boundaries++;
  }
  check();for(const [kind,i]of ops){t++;saved.push(variants.map(v=>({s:v.s,candidates:candidates(v.c,v.s),head:choose(v.c,v.s),status:v.s.status.toArray()})));
    const o=oracleAction(tasks,oracle,kind,i,t);oracle=o.state;
    for(const v of variants){const result=action(v.c,v.s,kind,i,t,v.stats);v.s=result.state;assert.deepEqual(result.effects,o.effects,`${label} ${kind} effects`);}
    const p=kind==='cancel'?{accepted:true,transition:cancelPendingAdmissionCore(product)}:kind==='select'?selectAdmissionCore(product,`t${i}`):settleAdmissionCore(product,`t${i}`,kind==='pass'?'satisfied':'unsatisfied');assert.equal(p.accepted,true);product=p.transition.state;
    const effects=p.transition.effects.map(e=>[e.kind==='admitted'?'admitted':e.settlementKind,Number(e.taskId.slice(1))]);assert.deepEqual(effects,o.effects,`${label} Product effects`);check();
    for(const snapshots of saved)for(let j=0;j<variants.length;j++){const v=variants[j],old=snapshots[j];assert.deepEqual(candidates(v.c,old.s),old.candidates);assert.equal(choose(v.c,old.s),old.head);assert.deepEqual(old.s.status.toArray(),old.status);forks++;}
  }traces++;
}
const task=(d=[],o=[],constraint=0,priority=0)=>({d,o,constraint,priority});
// Failed dependency waits for all dependencies, NOT observations; forced max-slot order cascades immediately.
trace([task(),task(),task(),task([0,1],[2]),task([0],[2]),task([], [0]),task([4]),task([], [4])],[['select',0],['select',1],['select',2],['fail',0],['pass',1],['pass',2]],'failure-observer-cascade');
trace([task(),task(),task([0,1]),task([0]),task([], [2]),task([3])],[['select',0],['select',1],['fail',0],['cancel'],['pass',1]],'cancel-no-double-forced');
for(const shape of ['cohort','multi','partition','unique','overlap','cross','split']){const f=fixture(shape,24),ops=[];for(let i=0;i<f.sources;i++)ops.push(['select',i]);for(let i=0;i<f.sources;i++)ops.push(['pass',i]);ops.push(['select',f.sources+8],['cancel']);trace(f.tasks,ops,shape);}
let random=261017;const rng=n=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random%n;};
for(let run=0;run<30;run++){const tasks=Array.from({length:22},(_,i)=>{const d=[],o=[];for(let j=0;j<i;j++){const r=rng(15);if(r===0)d.push(j);else if(r===1)o.push(j);}return task(d,o,rng(5),rng(7)-3);});let s=oracleSeed(tasks),ops=[],t=0;while(true){const pending=tasks.flatMap((_,i)=>oracleViable(tasks,s,i)?[i]:[]),running=s.status.flatMap((v,i)=>v===1?[i]:[]);let op;if(pending.length&&(running.length===0||rng(3)!==0))op=['select',pending[rng(pending.length)]];else if(running.length)op=[rng(5)===0?'fail':'pass',running[rng(running.length)]];else break;ops.push(op);s=oracleAction(tasks,s,...op,++t).state;if(t>100)throw Error('loop');}trace(tasks,ops,`random-${run}`);}
// Actual Product source transition: counters counted from each exact immutable effect-state delta, not guessed array allocations.
for(const shape of ['cohort','multi','partition','unique','overlap','cross','split']){const f=fixture(shape,1024),compiled=compileAdmissionGraphInput(productInput(f.tasks));let s=createInitialAdmissionCoreState(compiled),counts={counterWrites:0,relationReadyAdds:0,effects:0};for(let i=0;i<f.sources;i++){const r=selectAdmissionCore(s,`t${i}`);assert(r.accepted);s=r.transition.state;}for(let i=0;i<f.sources;i++){const r=settleAdmissionCore(s,`t${i}`,'satisfied');assert(r.accepted);for(const st of r.transition.effectStates){counts.counterWrites+=st.lastTransition.counters.filter(e=>['pendingDependencies','pendingObservations','nonCompletedDependencies'].includes(e.kind)).length;counts.relationReadyAdds+=st.lastTransition.membership.relationReady.added.length;}counts.effects+=r.transition.effects.length;s=r.transition.state;}
  const models={};for(const mode of ['eager','shared']){const c=compile(f.tasks,mode),stats=counters();flow(c,f,stats);models[mode]={groups:c.groups.length,cells:c.cells.length,...stats};}realCounts.push({shape,n:f.n,sources:f.sources,product:counts,models});}
// Ordinary dynamic blocker skip: all members of a cell have the same predicate; blocked group is not removed.
{const f=fixture('split',32),c=compile(f.tasks,'shared'),stats=counters();let s=seed(c),t=0;for(let i=0;i<f.sources;i++)s=action(c,s,'select',i,++t,stats).state;for(let i=0;i<f.sources;i++)s=action(c,s,'pass',i,++t,stats).state;const before=choose(c,s),block=new Set([c.tasks[before].constraint]);assert.notEqual(choose(c,s,block),before);assert.equal(choose(c,s),before);}
console.log(JSON.stringify({mode:'correctness-and-operation-counts',traces,boundaries,retainedSnapshotChecks:forks,seed:261017,realCounts},null,2));
