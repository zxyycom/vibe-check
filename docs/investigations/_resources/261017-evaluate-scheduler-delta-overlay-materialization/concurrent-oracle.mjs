import assert from 'node:assert/strict';
import * as baseline from './baseline.mjs';
import * as overlay from './overlay.mjs';
let checks=0;
const task=(taskId,extras={})=>({taskId,admissionPriority:0,dependsOn:[],observes:[],mutex:[],resourceClaims:[],scopeId:null,...extras});
const snap=(api,s)=>({catalog:api.catalogForCore(s),inspection:api.inspectionForCore(s),static:api.staticAdmissionCandidateForCore(s),delta:s.lastTransition});
function pair(graph,maxParallel,seed=[]){return [baseline,overlay].map(api=>api.createAdmissionCoreFromSettlements(api.compileAdmissionGraphInput({graph,maxParallel}),seed));}
function check(states){assert.deepEqual(snap(overlay,states[1]),snap(baseline,states[0]));checks++;}
const saved=[];
function action(states,kind,...args){const result=[baseline,overlay].map((api,i)=>api[kind](states[i],...args));assert.equal(result[0].accepted,result[1].accepted);if(!result[0].accepted){assert.deepEqual(result[0],result[1]);checks++;return states;}
 const ts=result.map(r=>r.transition);assert.deepEqual(ts[0].effects,ts[1].effects);for(let i=0;i<ts[0].effectStates.length;i++)check(ts.map(t=>t.effectStates[i]));const out=ts.map(t=>t.state);check(out);saved.push([out,snap(baseline,out[0])]);return out;}
for(const threshold of [1,8,32]){
 overlay.configure(threshold,true);
 for(const type of ['root','resource','mutex']){
 const graph={tasks:Array.from({length:8},(_,i)=>task('t'+i,type==='resource'?{resourceClaims:[{resourceId:'r',units:1}]}:type==='mutex'?{mutex:i<2?['m','m']:[]}:{})),scopes:[],resourceCapacities:type==='resource'?[{resourceId:'r',units:2}]:[]};
 let s=pair(graph,type==='root'?2:8);check(s);s=action(s,'selectAdmissionCore','t0');s=action(s,'selectAdmissionCore','t1');s=action(s,'selectAdmissionCore','t2');s=action(s,'selectAdmissionCore','missing');s=action(s,'selectAdmissionCore','t0');s=action(s,'settleAdmissionCore','t7','satisfied');s=action(s,'settleAdmissionCore','missing','bad');s=action(s,'settleAdmissionCore','t0','satisfied');s=action(s,'selectAdmissionCore',type==='mutex'?'t1':'t2');
 }
 const scoped={tasks:[task('a',{scopeId:'s'}),task('b',{scopeId:'s',dependsOn:['a']}),task('c',{scopeId:'s',dependsOn:['a']}),task('d',{scopeId:'s',dependsOn:['b','c']}),task('x')],scopes:[{id:'s',maxParallel:2,activationTaskIds:['a'],terminalTaskId:'d'}],resourceCapacities:[]};
 let s=pair(scoped,8);s=action(s,'selectAdmissionCore','a');s=action(s,'settleAdmissionCore','a','satisfied');s=action(s,'selectAdmissionCore','b');s=action(s,'selectAdmissionCore','c');s=action(s,'selectAdmissionCore','x');s=action(s,'settleAdmissionCore','b','satisfied');s=action(s,'selectAdmissionCore','x');s=action(s,'settleAdmissionCore','x','satisfied');s=action(s,'settleAdmissionCore','c','satisfied');s=action(s,'selectAdmissionCore','d');s=action(s,'settleAdmissionCore','d','satisfied');
 const wide={tasks:Array.from({length:64},(_,i)=>task('t'+i)),scopes:[],resourceCapacities:[]};s=pair(wide,8);const cancels=[baseline,overlay].map((api,i)=>api.cancelPendingAdmissionCore(s[i]));assert.deepEqual(cancels[0].effects,cancels[1].effects);for(let i=0;i<64;i++)check(cancels.map(t=>t.effectStates[i]));saved.push([cancels.map(t=>t.state),snap(baseline,cancels[0].state)]);
 const pre={tasks:[task('a'),task('b',{dependsOn:['a']}),task('c',{observes:['a']})],scopes:[],resourceCapacities:[]};s=pair(pre,8,[{taskId:'a',kind:'prerequisite-unsatisfied'}]);check(s);const reconciled=[baseline,overlay].map((api,i)=>api.reconcileAdmissionCore(s[i]));assert.deepEqual(reconciled[0].effects,reconciled[1].effects);check(reconciled.map(t=>t.state));
}
for(const[states,expected]of saved.reverse()){assert.deepEqual(snap(overlay,states[1]),expected);assert.deepEqual(snap(baseline,states[0]),expected);checks++;}
console.log(JSON.stringify({status:'PASS',checks,retained:saved.length,thresholds:[1,8,32],covered:['multi-running','duplicate mutex occurrences','root/resource/scope saturated rejection','unknown/nonpending/notrunning/invalidoutcome','64 pending cancellation effectStates','preseed forced block','reverse snapshots']}));
