// Investigation-only adapter; no public API or production wiring.
import { List as IList, Map as IMap, Set as ISet } from 'immutable';
let limit=32, stats:any=null;
export function configure(n:number, enabled=false){limit=n;stats=enabled?{gets:0,baseReads:0,writes:0,copies:0,copiedEntries:0,flushes:0,flushedEntries:0,maxDelta:0}:null;}
export function metrics(){return stats && {...stats};}
const DROP=Symbol('deleted');
class View {
  constructor(readonly kind:string,readonly base:any,readonly delta:globalThis.Map<any,any>,readonly size:number){Object.freeze(this);}
  get(k:any){if(stats)stats.gets++; if(this.delta.has(k)){const v=this.delta.get(k);return v===DROP?undefined:v;} if(stats)stats.baseReads++;return this.kind==='set'?(this.base.has(k)?true:undefined):this.base.get(k);}
  has(k:any){return this.get(k)!==undefined;}
  set(k:any,v:any){return this.edit(b=>b.set(k,v));}
  add(k:any){return this.set(k,true);}
  delete(k:any){return this.edit(b=>b.delete(k));}
  edit(fn:(b:any)=>void){let d=this.delta, size=this.size, changed=false;
    const read=(k:any)=>d.has(k)?(d.get(k)===DROP?undefined:d.get(k)):(this.kind==='set'?(this.base.has(k)?true:undefined):this.base.get(k));
    const assign=(k:any,v:any)=>{const old=read(k);if(Object.is(old,v))return batch; if(!changed){if(stats){stats.copies++;stats.copiedEntries+=d.size;}d=new globalThis.Map(d);changed=true;} if(stats)stats.writes++;if(this.kind!=='list')size+=(v===undefined?-1:0)+(old===undefined?1:0);const b=this.kind==='set'?(this.base.has(k)?true:undefined):this.base.get(k);if(Object.is(b,v))d.delete(k);else d.set(k,v===undefined?DROP:v);return batch;};
    const batch={get:read,has:(k:any)=>read(k)!==undefined,set:assign,add:(k:any)=>assign(k,true),delete:(k:any)=>assign(k,undefined)};
    fn(batch);if(!changed)return this;if(stats)stats.maxDelta=Math.max(stats.maxDelta,d.size);
    if(d.size>=limit){if(stats){stats.flushes++;stats.flushedEntries+=d.size;}const base=this.base.withMutations((b:any)=>{for(const [k,v]of d){if(v===DROP)b.delete(k);else if(this.kind==='set')b.add(k);else b.set(k,v);}});return new View(this.kind,base,new globalThis.Map(),size);}
    return new View(this.kind,this.base,d,size);
  }
  withMutations(fn:(b:any)=>void){return this.edit(fn);}
  *keys(){for(const [k]of this.entries())yield k;}
  *entries(){if(this.kind==='list'){for(let k=0;k<this.size;k++)yield [k,this.get(k)];return;}for(const k of this.base.keys()){if(!this.delta.has(k))yield[k,this.kind==='set'?true:this.base.get(k)];else if(this.delta.get(k)!==DROP)yield[k,this.delta.get(k)];}for(const[k,v]of this.delta)if(!this.base.has(k)&&v!==DROP)yield[k,v];}
  *[Symbol.iterator](){for(const[k,v]of this.entries())yield this.kind==='set'?k:this.kind==='list'?v:[k,v];}
  filter(fn:any){if(this.kind!=='set')throw new Error('investigation filter supports Set only');return Set([...this].filter(fn));}
  some(fn:any){for(const v of this)if(fn(v))return true;return false;}
  toArray(){return [...this];}
}
export function List(values:any=[]){const b=IList(values);return new View('list',b,new globalThis.Map(),b.size);}
export function Set(values:any=[]){const b=ISet(values);return new View('set',b,new globalThis.Map(),b.size);}
export function Map(values:any=[]){const b=IMap(values);return new View('map',b,new globalThis.Map(),b.size);}
