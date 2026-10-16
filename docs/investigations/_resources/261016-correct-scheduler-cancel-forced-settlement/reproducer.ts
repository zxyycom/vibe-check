import { prepareTaskGraph } from "../../src/project-run/task-scheduler/graph.ts";
import { compilePreparedAdmissionGraph, createInitialAdmissionCoreState } from "../../src/project-run/task-scheduler/admission-core/core.ts";
import { traceAdmissionCore } from "../../src/project-run/task-scheduler/admission-core/trace.ts";
import { runTaskGraph } from "../../src/project-run/task-scheduler/scheduler.ts";
const graph = { tasks: [{ id: "running" }, { id: "first", dependsOn: ["running"] }, { id: "second", dependsOn: ["first"] }] };
const prepared = prepareTaskGraph(graph, 1);
const trace = traceAdmissionCore(createInitialAdmissionCoreState(compilePreparedAdmissionGraph(prepared, 1)), [
  { kind: "select", taskId: "running" }, { kind: "cancel-pending" }, { kind: "settle", taskId: "running", outcome: "satisfied" }
]);
const controller = new AbortController();
const effects: unknown[] = [];
let shell: unknown;
try {
  const result = await runTaskGraph({ graph: { tasks: [{ id: "fast" }, ...graph.tasks] }, maxParallel: 2, signal: controller.signal, execute(task) { if (task.id === "fast") controller.abort(); return true; }, onAdmissionCoreEffect: effect => effects.push(effect.effect) });
  shell = { kind: "returned", cancelled: result.cancelled, settlements: result.settlements.map(({ task, settlement }) => ({ taskId: task.id, kind: settlement.kind })) };
} catch (error) { shell = { kind: "threw", error: error instanceof Error ? error.message : String(error) }; }
console.log(JSON.stringify({ coreEffects: trace.map(step => step.effects), finalInspection: trace.at(-1)?.post.inspection, shell, shellEffects: effects }));
