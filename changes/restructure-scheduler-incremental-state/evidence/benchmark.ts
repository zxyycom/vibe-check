import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { Session } from "node:inspector";
import { performance } from "node:perf_hooks";
import { prepareTaskGraph } from "../../src/project-run/task-scheduler/graph.ts";
import { compilePreparedAdmissionGraph, createInitialAdmissionCoreState, selectAdmissionCore, settleRunningAdmissionCore, admissionStateForCore } from "../../src/project-run/task-scheduler/admission-core/core.ts";
import { staticAdmissionCandidateForCore } from "../../src/project-run/task-scheduler/admission-core/static-selection-query.ts";
import { admissionCandidatesForCore } from "../../src/project-run/task-scheduler/admission-core/selection-query.ts";
import { shapes, sizes, workload } from "./corpus.ts";

const allocation = process.argv.includes("--allocations");
const repeats = allocation ? 1 : 7;
const gc = () => { (globalThis as { gc?: () => void }).gc?.(); };
const rows: unknown[] = [];
let checksum = 0;
const retained: unknown[] = [];
const session = allocation ? new Session() : undefined;
session?.connect();
const post = (method: string, params: object = {}) => new Promise<any>((resolve, reject) => session!.post(method as any, params, (error, value) => error ? reject(error) : resolve(value)));

for (const shape of shapes) for (const size of sizes) {
  const input = workload(shape, size);
  const planned = prepareTaskGraph(input.graph, input.maxParallel);
  const compiled = compilePreparedAdmissionGraph(planned, input.maxParallel);
  const seed = () => createInitialAdmissionCoreState(compiled);
  const transitions = (keep: boolean) => {
    let state = seed();
    for (const task of planned.tasks) {
      const selected = selectAdmissionCore(state, task.id);
      if (!selected.accepted) throw new Error(`${shape}: unexpected rejection ${selected.reason.kind}`);
      state = selected.transition.state;
      if (keep) retained.push(state);
      const settled = settleRunningAdmissionCore(state, task.id, "completed");
      if (!settled.accepted) throw new Error("unexpected settlement rejection");
      state = settled.transition.state;
      if (keep) retained.push(state);
    }
    return state;
  };
  let queryState = seed();
  if (shape === "blocked-prefix") {
    const selected = selectAdmissionCore(queryState, planned.tasks[0]!.id);
    if (!selected.accepted) throw new Error("prefix holder rejected");
    queryState = selected.transition.state;
  }
  const cases = {
    seed: () => { checksum += seed().compiled.graph.tasks.length; },
    transition: () => { checksum += transitions(false).compiled.graph.tasks.length; },
    queryPrefix: () => { for (let i = 0; i < 64; i++) checksum += staticAdmissionCandidateForCore(queryState)?.task.id.length ?? 0; },
    fullOutput: () => { for (let i = 0; i < 4; i++) { const handle = admissionStateForCore(queryState); checksum += JSON.stringify([handle.catalog, handle.inspection, admissionCandidatesForCore(queryState)]).length; } },
    retainedForks: () => { transitions(true); }
  };
  for (const [phase, run] of Object.entries(cases)) {
    run(); retained.length = 0; gc();
    const samples = [];
    for (let iteration = 0; iteration < repeats; iteration++) {
      gc();
      const before = process.memoryUsage();
      if (allocation) await post("HeapProfiler.startSampling", { samplingInterval: 4096, includeObjectsCollectedByMajorGC: true, includeObjectsCollectedByMinorGC: true });
      const start = performance.now();
      run();
      const elapsedMs = performance.now() - start;
      const after = process.memoryUsage();
      let allocatedSampleBytes: number | null = null;
      if (allocation) {
        const { profile } = await post("HeapProfiler.stopSampling");
        const sum = (node: any): number => node.selfSize + node.children.reduce((total: number, child: any) => total + sum(child), 0);
        allocatedSampleBytes = sum(profile.head);
      }
      gc();
      const retainedHeapBytes = process.memoryUsage().heapUsed - before.heapUsed;
      samples.push({ elapsedMs, heapGrowthBytes: after.heapUsed - before.heapUsed, retainedHeapBytes, rssBytes: after.rss, allocatedSampleBytes });
      retained.length = 0;
    }
    rows.push({ shape, size, phase, samples });
  }
}
session?.disconnect();
console.log(JSON.stringify({ runtime: process.versions, sourceRevision: process.env.SOURCE_REVISION, corpusHash: createHash("sha256").update(readFileSync(new URL("./corpus.ts", import.meta.url))).digest("hex"), repeats, allocation, checksum, peakRssKiB: process.resourceUsage().maxRSS, rows }));
