import { analyzeLizardSource } from "/home/dev/.codex/worktrees/d20e/vibe-check/src/package-checks/function-metrics/analyzer/port-facade.ts";
import { readFileSync } from "node:fs";
type R={files:{path:string;source:string}[]};const req=JSON.parse(readFileSync(`${process.argv[2]}/request.json`,"utf8")) as R;
const Native=RegExp;const calls:{args:unknown[]}[]=[];(globalThis as unknown as {RegExp:typeof RegExp}).RegExp=new Proxy(Native,{construct(t,args){calls.push({args});return Reflect.construct(t,args)}});
let n=0;for(const f of req.files){const a=analyzeLizardSource({filename:f.path,sourceCode:f.source});if(!a)throw Error(f.path);n+=a.function_list.length;}
(globalThis as unknown as {RegExp:typeof RegExp}).RegExp=Native;if(n!==2222||calls.length!==254)throw Error(`${n} ${calls.length}`);
const unique=new Map<string,unknown[]>();for(const c of calls)unique.set(JSON.stringify(c.args),c.args);
const args=[...unique.values()];
function oneBatch(){for(const x of calls)Reflect.construct(Native,x.args);}
for(let i=0;i<20;i++)oneBatch();const samples:number[]=[];for(let g=0;g<11;g++){const t=performance.now();for(let i=0;i<1000;i++)oneBatch();samples.push((performance.now()-t)/1000);}const sorted=[...samples].sort((a,b)=>a-b);console.log(JSON.stringify({status:"complete",metrics:n,constructCalls:calls.length,uniqueConstructorArguments:args.length,constructorArguments:args.map(a=>({patternLength:String(a[0]).length,flags:a[1]})),samplesMsPer254Constructions:samples,medianMsPer254Constructions:sorted[5],p90MsPer254Constructions:sorted[Math.floor(.9*(sorted.length-1))]}));
