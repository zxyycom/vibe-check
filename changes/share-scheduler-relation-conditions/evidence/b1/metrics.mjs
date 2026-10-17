import { writeFile } from "node:fs/promises";
import * as A from "./A.mjs";
import * as B from "./B.mjs";
import { fixture } from "./workloads.mjs";
const rows = [];
for (const n of [32, 256, 1024]) for (const shape of ["cohort", "multi", "partition", "factored", "factored-cross", "unique", "overlap", "cross"]) {
  const spec = fixture(shape, n);
  for (const [variant, api] of [["A", A], ["B", B]]) {
    const compiled = api.compilePreparedAdmissionGraph(api.prepareTaskGraph(spec.graph, 8), 8);
    let state = api.createAdmissionCoreFromSettlements(compiled, []);
    let writes = 0, readyTaskAdds = 0, commonOpens = 0, residualOpens = 0, massEvents = 0;
    let aGate;
    for (const id of spec.sources) {
      state = api.selectAdmissionCore(state, id).transition.state;
      state = api.settleAdmissionCore(state, id, "satisfied").transition.state;
      const delta = state.lastTransition;
      const ready = delta.membership.relationReady;
      const step = { writes: delta.counters.length, readyTaskAdds: ready.added?.length ?? 0, commonOpens: ready.commonOpened?.length ?? 0,
        residualOpens: ready.residualOpened?.length ?? 0, massEvents: ready.viableMass?.length ?? 0 };
      if (id === "a") aGate = step;
      writes += step.writes; readyTaskAdds += step.readyTaskAdds; commonOpens += step.commonOpens; residualOpens += step.residualOpens; massEvents += step.massEvents;
    }
    const relation = compiled.relationIndexes;
    const constraints = new Set(compiled.constraintGroups.taskGroupSlots).size;
    const sourceNotifications = variant === "B" ? relation.bySource.map((entries) => entries.length) : relation.reverseDependencies.map((entries, slot) => entries.length + relation.reverseObservations[slot].length);
    rows.push({ n, shape, variant, tasks: spec.graph.tasks.length, constraints, conditions: relation.conditions?.length, commonCells: relation.commonCells?.length, residualCells: relation.cells?.length,
      writes, readyTaskAdds, commonOpens, residualOpens, massEvents, maxSourceNotifications: Math.max(...sourceNotifications), aGate });
  }
}
await writeFile(new URL("metrics.json", import.meta.url), JSON.stringify({ runtime: process.version, rows }, null, 2));
console.log(`metrics rows ${rows.length}`);
