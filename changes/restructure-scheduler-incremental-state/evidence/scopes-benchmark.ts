import { prepareTaskGraph } from "../../src/project-run/task-scheduler/graph.ts";
import { compilePreparedAdmissionGraph, createInitialAdmissionCoreState, selectAdmissionCore, settleRunningAdmissionCore } from "../../src/project-run/task-scheduler/admission-core/core.ts";
import { staticAdmissionCandidateForCore } from "../../src/project-run/task-scheduler/admission-core/static-selection-query.ts";
import { workload, sizes } from "./corpus.ts";
const rows = [];
let checksum = 0;
const retained: unknown[] = [];
for (const size of sizes) {
  const input = workload("scopes", size);
  const graph = prepareTaskGraph(input.graph, input.maxParallel);
  const compiled = compilePreparedAdmissionGraph(graph, input.maxParallel);
  const order = [...graph.tasks.filter((_, slot) => slot % 8 === 0), ...graph.tasks.filter((_, slot) => slot % 8 !== 0)];
  const operation = (keep: boolean) => {
    let state = createInitialAdmissionCoreState(compiled);
    for (const task of order) {
      const selected = selectAdmissionCore(state, task.id); if (!selected.accepted) throw new Error(selected.reason.kind);
      if (keep) retained.push(selected.transition.state);
      const settled = settleRunningAdmissionCore(selected.transition.state, task.id, "completed"); if (!settled.accepted) throw new Error(settled.reason.kind);
      state = settled.transition.state;
      if (keep) retained.push(state);
      checksum += staticAdmissionCandidateForCore(state)?.task.id.length ?? 0;
    }
  };
  for (const keep of [false, true]) {
    operation(keep); retained.length = 0; const samples = [];
    for (let iteration = 0; iteration < 7; iteration++) {
      (globalThis as { gc?: () => void }).gc?.();
      const before = process.memoryUsage();
      const start = performance.now(); operation(keep); const elapsedMs = performance.now() - start;
      const after = process.memoryUsage();
      (globalThis as { gc?: () => void }).gc?.();
      samples.push({ elapsedMs, heapGrowthBytes: after.heapUsed - before.heapUsed, retainedHeapBytes: process.memoryUsage().heapUsed - before.heapUsed, rssBytes: after.rss });
      retained.length = 0;
    }
    rows.push({ size, keep, maxActiveScopes: size / 8, samples });
  }
}
console.log(JSON.stringify({ runtime: process.versions, sourceRevision: process.env.SOURCE_REVISION, checksum, rows }));
