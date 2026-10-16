import { prepareTaskGraph } from "../../src/project-run/task-scheduler/graph.ts";
import { compilePreparedAdmissionGraph, createAdmissionCoreFromSettlements } from "../../src/project-run/task-scheduler/admission-core/core.ts";
import { traceAdmissionCore } from "../../src/project-run/task-scheduler/admission-core/trace.ts";
import { traceCorpus } from "./trace-corpus.ts";
console.log(JSON.stringify(traceCorpus.map(fixture => {
  const compiled = compilePreparedAdmissionGraph(prepareTaskGraph(fixture.graph, fixture.maxParallel), fixture.maxParallel);
  const initial = createAdmissionCoreFromSettlements(compiled, "settlements" in fixture ? fixture.settlements : []);
  return { name: fixture.name, trace: traceAdmissionCore(initial, fixture.actions as any) };
})));
