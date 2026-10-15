import assert from "node:assert/strict";
import { loadWorkloads } from "./corpus.ts";

const [mode, packPath] = process.argv.slice(2);
assert.ok((mode === "momoa" || mode === "native") && packPath !== undefined);
const inspect =
  mode === "momoa"
    ? (await import("./momoa-control.ts")).inspectStrictJsonBytes
    : (await import("./native-iterative-prototype.ts")).inspectNativeBytes;
const workloads = loadWorkloads(packPath);
// No comparative oracle, Momoa import or instrumentation in a native worker.
for (let round = 0; round < 2; round += 1) {
  for (const workload of workloads) {
    const started = performance.now();
    const cpu = process.cpuUsage();
    let valid = 0;
    let duplicate = 0;
    for (const bytes of workload.documents) {
      const result = inspect(bytes);
      if (result.kind === "valid") valid += 1;
      else if (result.kind === "issue" && result.reason === "duplicate-key") duplicate += 1;
      else throw new Error(`unexpected ${result.kind} in ${workload.id}`);
    }
    const cpuUsed = process.cpuUsage(cpu);
    console.log(
      JSON.stringify({
        mode,
        runtime: process.version,
        bun: process.versions.bun ?? null,
        workload: workload.id,
        warmup: round === 0,
        documents: workload.documents.length,
        bytes: workload.documents.reduce((total, bytes) => total + bytes.byteLength, 0),
        wallMs: performance.now() - started,
        cpuMs: (cpuUsed.user + cpuUsed.system) / 1000,
        maxProcessRssKiB: process.resourceUsage().maxRSS,
        valid,
        duplicate
      })
    );
  }
}
