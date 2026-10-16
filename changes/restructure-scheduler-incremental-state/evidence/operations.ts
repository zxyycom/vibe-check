import { prepareTaskGraph } from "../../src/project-run/task-scheduler/graph.ts";
import { compilePreparedAdmissionGraph, createInitialAdmissionCoreState, selectAdmissionCore, settleRunningAdmissionCore, admissionStateForCore, admissionCandidatesForCore } from "../../src/project-run/task-scheduler/admission-core/core.ts";
import { staticAdmissionCandidateForCore } from "../../src/project-run/task-scheduler/admission-core/static-selection-query.ts";
import { shapes, sizes, workload } from "./corpus.ts";

const rows = [];
for (const shape of shapes) for (const size of sizes) {
  let counts: Record<string, number> = {};
  const count = (key: string, amount = 1) => { counts[key] = (counts[key] ?? 0) + amount; };
  const cache = new WeakMap<object, Map<string, object>>();
  function collection<T extends object>(target: T, name: string): T {
    const previous = cache.get(target)?.get(name); if (previous) return previous as T;
    const proxy = new Proxy(target, { get(value: any, key) {
      const member = Reflect.get(value, key, value);
      if (typeof member !== "function") return member;
      return (...args: any[]) => {
        if (["has", "get", "add", "delete", "set"].includes(String(key))) count(`${name}.${String(key)}`);
        if (key === "withMutations") args[0] = ((callback) => (batch: object) => callback(collection(batch, name)))(args[0]);
        const result = member.apply(value, args);
        return result && typeof result === "object" && result.constructor === value.constructor ? collection(result, name) : result;
      };
    }});
    const byName = cache.get(target) ?? new Map<string, object>();
    byName.set(name, proxy); cache.set(target, byName);
    cache.set(proxy, new Map([[name, proxy]])); return proxy;
  }
  const input = workload(shape, size);
  const graph = prepareTaskGraph(input.graph, input.maxParallel);
  const original = compilePreparedAdmissionGraph(graph, input.maxParallel);
  const compiled = Object.freeze({ ...original, constraintGroups: Object.freeze({ ...original.constraintGroups, taskGroupSlots: new Proxy(original.constraintGroups.taskGroupSlots, { get(target, key, receiver) { if (/^\d+$/.test(String(key))) count("taskGroupSlot.read"); return Reflect.get(target, key, receiver); } }) }) });
  const wrap = (core: any) => {
    const index = { ...core.selection };
    for (const name of ["relationReadyTaskSlots", "activeScopeSlotSet", "readyGroupFrontier"]) if (index[name]) index[name] = collection(index[name], name);
    for (const name of ["mutexHolders", "resourceInUse", "pendingDependencies", "pendingObservations", "nonCompletedDependencies"]) if (index[name]) index[name] = Object.freeze({ values: collection(index[name].values, name) });
    if (index.staticGroupFrontier) index.staticGroupFrontier = Object.freeze({ ...index.staticGroupFrontier, revisions: collection(index.staticGroupFrontier.revisions, "staticRevisions") });
    return Object.freeze({ ...core, selection: Object.freeze(index) });
  };
  const originalSort = Array.prototype.sort;
  Array.prototype.sort = function(compare) { count("arraySort.calls"); count("arraySort.elements", this.length); return originalSort.call(this, compare); };
  let state = wrap(createInitialAdmissionCoreState(compiled));
  const seedCounts = counts; counts = {};
  const initial = state;
  for (const task of graph.tasks) {
    const selected = selectAdmissionCore(state, task.id); if (!selected.accepted) throw new Error(selected.reason.kind);
    state = wrap(selected.transition.state);
    const settled = settleRunningAdmissionCore(state, task.id, "completed"); if (!settled.accepted) throw new Error(settled.reason.kind);
    state = wrap(settled.transition.state);
  }
  const transitionCounts = counts; counts = {};
  let queryState = initial;
  if (shape === "blocked-prefix") { const selected = selectAdmissionCore(initial, graph.tasks[0]!.id); if (!selected.accepted) throw new Error(selected.reason.kind); queryState = wrap(selected.transition.state); }
  counts = {};
  for (let iteration = 0; iteration < 64; iteration++) staticAdmissionCandidateForCore(queryState);
  const prefixQueryCounts = counts; counts = {};
  for (let iteration = 0; iteration < 4; iteration++) { const handle = admissionStateForCore(queryState); JSON.stringify([handle.catalog, handle.inspection, admissionCandidatesForCore(queryState)]); }
  Array.prototype.sort = originalSort;
  rows.push({ shape, size, seedCounts, transitionCounts, prefixQueryCounts, fullOutputCounts: counts });
}
console.log(JSON.stringify({ note: "Instrumented collection/index operations only; not timing, allocations or universal complexity", rows }));
