import { prepareTaskGraph } from "../../src/project-run/task-scheduler/graph.ts";
import { compilePreparedAdmissionGraph, createInitialAdmissionCoreState, selectAdmissionCore, settleRunningAdmissionCore, admissionStateForCore, admissionCandidatesForCore, type AdmissionCoreState } from "../../src/project-run/task-scheduler/admission-core/core.ts";
import { workload, sizes } from "./corpus.ts";
const rows = [];
let checksum = 0;
const retained: AdmissionCoreState[] = [];
for (const shape of ["wide", "groups"] as const) for (const size of sizes) {
  const input = workload(shape, size);
  const graph = prepareTaskGraph(input.graph, input.maxParallel);
  const compiled = compilePreparedAdmissionGraph(graph, input.maxParallel);
  const stride = Math.max(1, Math.ceil(2 * size / 64));
  const operation = (query: boolean) => {
    let state = createInitialAdmissionCoreState(compiled), effect = 0;
    for (const task of graph.tasks) {
      const selected = selectAdmissionCore(state, task.id); if (!selected.accepted) throw new Error(selected.reason.kind);
      state = selected.transition.state;
      if (effect++ % stride === 0) retained.push(state);
      const settled = settleRunningAdmissionCore(state, task.id, "completed"); if (!settled.accepted) throw new Error(settled.reason.kind);
      state = settled.transition.state;
      if (effect++ % stride === 0) retained.push(state);
    }
    if (query) for (const fork of retained) {
      const handle = admissionStateForCore(fork);
      checksum += handle.catalog.selectableTaskIds.length + handle.inspection.settledTasks.length + admissionCandidatesForCore(fork).length;
    }
  };
  for (const query of [false, true]) {
    operation(query); retained.length = 0; const samples = [];
    for (let iteration = 0; iteration < 7; iteration++) {
      (globalThis as { gc?: () => void }).gc?.(); const before = process.memoryUsage();
      const start = performance.now(); operation(query); const elapsedMs = performance.now() - start;
      const after = process.memoryUsage(); (globalThis as { gc?: () => void }).gc?.();
      samples.push({ elapsedMs, retainedCount: retained.length, heapGrowthBytes: after.heapUsed - before.heapUsed, retainedHeapBytes: process.memoryUsage().heapUsed - before.heapUsed, rssBytes: after.rss });
      retained.length = 0;
    }
    rows.push({ size, shape, query, stride, samples });
  }
}
console.log(JSON.stringify({ runtime: process.versions, sourceRevision: process.env.SOURCE_REVISION, checksum, rows }));
