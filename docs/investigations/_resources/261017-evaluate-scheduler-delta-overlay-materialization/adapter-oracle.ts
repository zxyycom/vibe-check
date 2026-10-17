import assert from 'node:assert/strict';
import {List,Map,Set,configure,metrics} from './overlay.ts';
let checks=0;
for(const threshold of [1,8,32]){
 configure(threshold,true);let list=List(Array(64).fill(0)),set=Set([0,2,4]),map=Map([[1,10]]);let a=Array(64).fill(0),b=new globalThis.Set([0,2,4]),c=new globalThis.Map([[1,10]]);const retained=[];
 for(let i=0;i<256;i++){
  retained.push([list,set,map,[...a],[...b].sort((x,y)=>x-y),[...c].sort(([x],[y])=>x-y)]);
  const slot=(i*17)%64,value=i%5;
  list=list.set(slot,value);a[slot]=value;
  if(i%3){set=set.add(slot);b.add(slot);map=map.set(slot,value);c.set(slot,value);}else{set=set.delete(slot);b.delete(slot);map=map.delete(slot);c.delete(slot);}
  // Repeated writes cancel back to base; one large batch crosses threshold at publication.
  if(i%19===0){list=list.withMutations(x=>{for(let k=0;k<64;k++)x.set(k,i+k);});a=a.map((_,k)=>i+k);}
 }
 for(const[l,s,m,x,y,z]of retained.reverse()){
  assert.deepEqual(l.toArray(),x);assert.deepEqual(s.toArray().sort((x,y)=>x-y),y);assert.deepEqual(m.toArray().sort(([x],[y])=>x-y),z);assert.equal(s.size,y.length);assert.equal(m.size,z.length);checks++;
 }
 assert.deepEqual(list.toArray(),a);assert.deepEqual([...set].sort((x,y)=>x-y),[...b].sort((x,y)=>x-y));
}
console.log(JSON.stringify({status:'PASS',checks,thresholds:[1,8,32],reference:'native Array/Set/Map, updates+deletion+large batch+reverse snapshot reads'}));
