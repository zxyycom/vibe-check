import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
const rows = [];
const runtime = globalThis.Bun ? "bun" : "node";
for (const n of [32, 256, 1024]) for (const shape of ["multi", "factored", "unique", "overlap", "cross"]) for (const mode of ["current", "snapshots"]) {
  for (const variant of ["A", "B"]) {
    const args = [...(runtime === "node" ? ["--expose-gc"] : []), new URL("memory-worker.mjs", import.meta.url).pathname, variant, shape, String(n), mode];
    rows.push(JSON.parse(execFileSync(process.execPath, args, { encoding: "utf8" })));
  }
}
for (const mode of ["forks", "full"]) for (const variant of ["A", "B"]) {
  const args = [...(runtime === "node" ? ["--expose-gc"] : []), new URL("memory-worker.mjs", import.meta.url).pathname, variant, "multi", "1024", mode];
  rows.push(JSON.parse(execFileSync(process.execPath, args, { encoding: "utf8" })));
}
await writeFile(new URL(`memory-${runtime}.json`, import.meta.url), JSON.stringify({ method: "fresh process per row; raw fixture and bundle loaded before baseline; retained Product compile/seed/current or source snapshots and forks; 3 GC with event-loop turns before and after; signed metrics preserved", rows }, null, 2));
console.log(`memory ${runtime} ${rows.length} rows`);
