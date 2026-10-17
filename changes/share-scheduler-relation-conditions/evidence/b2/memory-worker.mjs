import { fixture, coreWorkload } from "./workloads.mjs";
const [variant, shape, rawN, mode] = process.argv.slice(2);
const api = await import(`./${variant}.mjs`);
const spec = fixture(shape, Number(rawN));
const jsc = globalThis.Bun ? await import("bun:jsc") : undefined;
async function gc() {
  for (let i = 0; i < 3; i++) {
    if (globalThis.Bun) Bun.gc(true); else globalThis.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}
function memory() { return { ...process.memoryUsage(), maxRSSKiB: process.resourceUsage().maxRSS, jscHeapSize: jsc?.heapStats().heapSize ?? null }; }
await gc();
const before = memory();
const result = coreWorkload(api, spec, { collector: "delays", keepFinal: true, retain: mode !== "current", forks: mode === "forks" ? 8 : 0, full: mode === "full" });
globalThis.retainedSchedulerEvidence = result;
await gc();
const after = memory();
console.log(JSON.stringify({ variant, shape, n: Number(rawN), mode, node: process.version, bun: globalThis.Bun?.version ?? null, before, after,
  retainedSourceStates: result.retained?.states?.length ?? 0, retainedForks: result.retained?.forks?.length ?? 0 }));
