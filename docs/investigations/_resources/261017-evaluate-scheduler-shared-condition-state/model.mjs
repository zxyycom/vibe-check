// Investigation-only relation model, NOT a replacement Scheduler. Both variants share this harness.
import { List } from 'immutable';
import { queueWithTask as push, mergeTaskQueues as merge } from '../../src/project-run/task-scheduler/admission-core/persistent-task-queue.ts';
const pop = q => merge(q.left,q.right);
const rank = (tasks,a,b) => tasks[b].priority-tasks[a].priority || a-b;
export function compile(tasks,mode) {
  const grouped=mode==='shared', signatures=new Map(), groupOf=[], groups=[];
  for (const [i,t] of tasks.entries()) {
    const key=grouped?JSON.stringify([t.d.toSorted((a,b)=>a-b),t.o.toSorted((a,b)=>a-b)]):String(i);
    let g=signatures.get(key);
    if(g===undefined){g=groups.length; signatures.set(key,g); groups.push({d:t.d,o:t.o,members:[],cells:[]});}
    groupOf[i]=g;groups[g].members.push(i);
  }
  const cellKeys=new Map(),cells=[],cellOf=[];
  for(const [i,t] of tasks.entries()) {
    // eager frontiers group by constraint; shared frontiers need the intersection.
    const key=JSON.stringify([grouped?groupOf[i]:null,t.constraint]);
    let c=cellKeys.get(key);
    if(c===undefined){c=cells.length;cellKeys.set(key,c);cells.push({members:[]});}
    cellOf[i]=c;cells[c].members.push(i);
    const g=groups[groupOf[i]];if(!g.cells.includes(c))g.cells.push(c);
  }
  const order=tasks.map((_,i)=>i).sort((a,b)=>rank(tasks,a,b)),ranks=[];
  for(const [r,i] of order.entries())ranks[i]=r;
  const reverse=tasks.map(()=>[]);
  for(const [g,v]of groups.entries())for(const [kind,ids]of [['d',v.d],['o',v.o]]) {
    const weights=new Map();for(const id of ids)weights.set(id,(weights.get(id)??0)+1);
    for(const [id,w]of weights)reverse[id].push({g,kind,w});
  }
  const heaps=grouped?cells.map(c=>{let h;for(const i of c.members)h=push(h,{taskSlot:i,preferenceRank:ranks[i]});return h;}):[];
  return {tasks,mode,groups,groupOf,cells,cellOf,ranks,reverse,heaps};
}
export function seed(c){
  let s={status:List(c.tasks.map(()=>0)),dep:List(c.groups.map(g=>g.d.length)),obs:List(c.groups.map(g=>g.o.length)),bad:List(c.groups.map(()=>0)),live:List(c.groups.map(g=>g.members.length)),entered:List(c.groups.map(g=>g.d.length+g.o.length===0?0:undefined)),delay:List(c.tasks.map(()=>undefined)),heads:List(c.cells.map(()=>undefined)),revs:List(c.cells.map(()=>0)),ready:undefined,forced:undefined,count:0};
  const initialCells=new Set();
  for(const [g,v]of c.groups.entries())if(v.d.length+v.o.length===0){
    s.count+=v.members.length;
    if(c.mode==='shared')for(const cell of v.cells)s=activate(c,s,cell,c.heaps[cell]);
    else {const i=v.members[0],cell=c.cellOf[i];s.heads=s.heads.set(cell,push(s.heads.get(cell),{taskSlot:i,preferenceRank:c.ranks[i]}));initialCells.add(cell);}
  }
  for(const cell of initialCells)s=activate(c,s,cell,s.heads.get(cell));
  return s;
}
function activate(c,s,cell,h){
  while(h&&s.status.get(h.taskSlot)!==0)h=pop(h);
  const revision=s.revs.get(cell)+1;
  return {...s,heads:s.heads.set(cell,h),revs:s.revs.set(cell,revision),ready:h?push(s.ready,{taskSlot:cell,preferenceRank:h.preferenceRank,revision}):s.ready};
}
function viable(s,g){return s.dep.get(g)===0&&s.obs.get(g)===0&&s.bad.get(g)===0;}
function tidy(s){let q=s.ready;while(q&&(q.revision!==s.revs.get(q.taskSlot)||!s.heads.get(q.taskSlot)))q=pop(q);return q===s.ready?s:{...s,ready:q};}
export function choose(c,s,blocked=new Set()){
  // Model ordinary layer only. Dynamic blocked cells keep membership; no starvation of the other cells.
  let q=tidy(s).ready;
  while(q){if(q.revision===s.revs.get(q.taskSlot)){const h=s.heads.get(q.taskSlot);if(h&&!blocked.has(c.tasks[h.taskSlot].constraint))return h.taskSlot;}q=pop(q);}
}
export function candidates(c,s){return c.tasks.flatMap((_,i)=>s.status.get(i)===0&&viable(s,c.groupOf[i])?[i]:[]);}
export function delay(c,s,i,now){const fixed=s.delay.get(i);if(fixed!==undefined)return fixed;const g=c.groupOf[i],entered=s.entered.get(g);return s.status.get(i)===0&&entered!==undefined?now-entered:undefined;}
export function change(c,s,i,status,now,stats){
  const previous=s.status.get(i),g=c.groupOf[i];
  if(previous===status||previous>1)throw Error('invalid status change');
  let next={...s,status:s.status.set(i,status)};
  if(previous===0){next.live=next.live.set(g,next.live.get(g)-1);if(viable(s,g)){next.count--;next.delay=next.delay.set(i,now-s.entered.get(g));}const cell=c.cellOf[i];if(next.heads.get(cell)?.taskSlot===i)next=activate(c,next,cell,next.heads.get(cell));}
  if(status<2)return tidy(next);
  const changed=new Set(),eagerCells=new Set();
  // Mirrors the current relation layer: separate persistent batch for dep/obs/bad and one event per counter.
  const events=[];
  for(const kind of ['d','o']){
    const relevant=c.reverse[i].filter(e=>e.kind===kind);
    const key=kind==='d'?'dep':'obs';
    next[key]=next[key].withMutations(batch=>{for(const e of relevant){const before=batch.get(e.g);batch.set(e.g,before-e.w);changed.add(e.g);events.push({g:e.g,key,before,after:before-e.w});stats.counterWrites++;}});
    if(kind==='d'&&status!==2)next.bad=next.bad.withMutations(batch=>{for(const e of relevant){batch.set(e.g,batch.get(e.g)+e.w);stats.counterWrites++;}});
  }
  stats.counterEvents+=events.length;
  for(const group of changed){
    if(!viable(s,group)&&viable(next,group)){
      next.entered=next.entered.set(group,now);next.count+=next.live.get(group);stats.gateOpens++;
      if(c.mode==='shared'){for(const cell of c.groups[group].cells){next=activate(c,next,cell,c.heaps[cell]);stats.cellWakeups++;}}
      else for(const member of c.groups[group].members)if(next.status.get(member)===0){const cell=c.cellOf[member];next.heads=next.heads.set(cell,push(next.heads.get(cell),{taskSlot:member,preferenceRank:c.ranks[member]}));eagerCells.add(cell);stats.membersReadyInserts++;}
    }
    if(s.dep.get(group)>0&&next.dep.get(group)===0&&next.bad.get(group)>0){for(const member of c.groups[group].members)if(next.status.get(member)===0){next.forced=push(next.forced,{taskSlot:member,preferenceRank:-member});stats.forcedEntries++;}}
  }
  for(const cell of eagerCells){next=activate(c,next,cell,next.heads.get(cell));stats.cellWakeups++;}
  return tidy(next);
}
export const counters=()=>({counterWrites:0,counterEvents:0,gateOpens:0,cellWakeups:0,membersReadyInserts:0,forcedEntries:0,effects:0,selected:0});
export function action(c,s,kind,i,now,stats){
  const effects=[];
  if(kind==='select'){if(s.status.get(i)!==0||!viable(s,c.groupOf[i]))throw Error('illegal select');stats.selected++;return {state:change(c,s,i,1,now,stats),effects:[['admitted',i]]};}
  if(kind==='cancel'){
    // Declaration-order cancellation intentionally does not reconcile forced entries mid-batch.
    for(const [id,t]of c.tasks.entries())if(s.status.get(id)===0){s=change(c,s,id,5,now,stats);effects.push(['cancelled-before-start',id]);}
  }else{
    if(s.status.get(i)!==1)throw Error('not running');
    s=change(c,s,i,kind==='pass'?2:3,now,stats);effects.push([kind==='pass'?'completed':'prerequisite-unsatisfied',i]);
    while(s.forced){const id=s.forced.taskSlot;s={...s,forced:pop(s.forced)};if(s.status.get(id)!==0)continue;s=change(c,s,id,4,now,stats);effects.push(['blocked',id]);}
  }
  stats.effects+=effects.length;return {state:s,effects};
}
export function fixture(shape,n){
  const sources=shape==='unique'?n:shape==='overlap'?Math.max(4,n):8;
  const tasks=Array.from({length:sources},(_,i)=>({d:[],o:[],constraint:0,priority:i%3}));
  for(let j=0;j<n;j++){
    let d,o=[];
    switch(shape){
      case 'cohort':d=[0];break;
      case 'multi':d=[0,1,2,3];o=[4,5];break;
      case 'partition':d=[j%8];break;
      case 'unique':d=[j];break;
      case 'overlap':d=[j%sources,(j+1)%sources,(j+3)%sources];break;
      case 'cross':d=[0,1];o=[2];break;
      case 'split':d=[0,1];o=[2];break;
      default:throw Error(shape);
    }
    tasks.push({d,o,constraint:shape==='cross'?j:shape==='split'?j%16:j%4,priority:(j*7)%11});
  }
  return {tasks,sources,shape,n};
}
export function flow(c,f,stats){let s=seed(c),t=0;for(let i=0;i<f.sources;i++)s=action(c,s,'select',i,++t,stats).state;for(let i=0;i<f.sources;i++)s=action(c,s,'pass',i,++t,stats).state;const checksum=s.count;let selected=0;while(true){const i=choose(c,s);if(i===undefined)break;s=action(c,s,'select',i,++t,stats).state;selected++;}return {s,checksum:checksum+selected};}
