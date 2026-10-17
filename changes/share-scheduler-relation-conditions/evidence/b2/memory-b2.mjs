import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
const rows=[];
for(const shape of ["multi","factored","unique","deep"])for(const mode of ["current","snapshots"])for(const variant of ["A","B"]){
  const args=[...(globalThis.Bun?[]:["--expose-gc"]),new URL("memory-worker.mjs",import.meta.url).pathname,variant,shape,"1024",mode];
  rows.push(JSON.parse(execFileSync(process.execPath,args,{encoding:"utf8"})));
}
await writeFile(new URL(`memory-b2-${globalThis.Bun?"bun":"node"}.json`,import.meta.url),JSON.stringify({method:"same fresh-process worker as B1; B is bounded B2; one observation per row, signed post-GC metrics retained",rows},null,2));
console.log(`B2 memory ${globalThis.Bun?"bun":"node"} ${rows.length} rows`);
