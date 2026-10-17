import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import * as A from "./A.mjs";
import * as B1 from "./b1/B.mjs";
import * as B2 from "./B.mjs";
import { fixture, coreWorkload, publicRunWorkload, stringify } from "./workloads.mjs";
const variants = [A,B1,B2], labels=["A","B1","B2"];
const permutations=[[0,1,2],[1,2,0],[2,0,1],[0,2,1],[2,1,0],[1,0,2]];
const cases=[];
for(const n of [32,1024]) for(const shape of ["multi","factored","unique","deep"]) for(const collector of ["delays","none"]) cases.push({suite:"core",n,shape,collector});
for(const n of [32,1024]) for(const shape of ["multi","factored"]) for(const mode of ["static","measured"]) cases.push({suite:"run",n,shape,mode});
const rows=[];
for(const spec of cases) {
  const input=fixture(spec.shape,spec.n); const samples=[[],[],[]]; let expected;
  for(let sample=-3;sample<6;sample++)for(const variant of permutations[(sample+6)%6]) {
    if(globalThis.Bun)Bun.gc(true);else globalThis.gc?.();
    const started=performance.now();
    const result=spec.suite==="core"?coreWorkload(variants[variant],input,spec):await publicRunWorkload(variants[variant],input,spec.mode);
    const elapsed=performance.now()-started;
    const digest=stringify(result); if(expected===undefined)expected=digest;assert.equal(digest,expected);
    if(sample>=0)samples[variant].push(elapsed);
  }
  rows.push({...spec,...Object.fromEntries(labels.map((label,i)=>[label,samples[i]]))});
  process.stderr.write(`done ${stringify(spec)}\n`);
}
await writeFile(new URL(`small-b2-${globalThis.Bun?"bun":"node"}.json`,import.meta.url),JSON.stringify({method:"3 warmups, 6 measured samples, all six 3-variant permutations balanced, direct total incl compile/seed, no metrics/profile",node:process.version,bun:globalThis.Bun?.version??null,rows},null,2));
