/** One-off bounded evidence probe: no Product/test/Case edits, dependencies, output I/O or timers.
 * Counts predicates actually executed in the unchanged Scheduler; temporary intrinsic wrappers are
 * restored in finally. Counts are not performance timings or end-user slowdown percentages. */
import { defineConfig } from "../../../../src/project-definition/project-definition.ts";
import { run } from "../../../../src/project-run/run.ts";
import { runTaskGraph } from "../../../../src/project-run/task-scheduler/scheduler.ts";

const originalFind = Array.prototype.find;
const originalStringify = JSON.stringify;
const originalRace = Promise.race;
const originalFreeze = Object.freeze;
const results: object[] = [];
for (const inputKind of ["chain", "independent-singleton-scopes", "independent-parallel", "public-chain", "public-independent"] as const) {
  for (const n of [16, 32, 64, 128]) {
    const tasks = Array.from({ length: n }, (_, i) => ({
      id: `task-${i}`,
      ...(inputKind === "chain" && i > 0 ? { dependsOn: [`task-${i - 1}`] } : {}),
      ...(inputKind === "independent-singleton-scopes" ? { scopeId: `scope-${i}` } : {})
    }));
    const scopes = inputKind === "independent-singleton-scopes"
      ? tasks.map((task, i) => ({ id: `scope-${i}`, maxParallel: 1, activationTaskIds: [task.id], terminalTaskId: task.id }))
      : [];
    const definition = inputKind.startsWith("public") ? defineConfig({
      checks: tasks.map((task, i) => ({ checkId: task.id, displayName: task.id,
        execute: () => ({ status: "passed" as const, data: {} }),
        ...(inputKind === "public-chain" && i > 0 ? { dependsOn: [`task-${i - 1}`] } : {}) })),
      scheduler: { maxParallel: 1 },
      outputs: { machinePublication: { enabled: false }, progressRendering: { enabled: false }, diagnosticLogging: { enabled: false } }
    }) : undefined;
    let graphDtoFreezes = 0;
    let settlementFindPredicates = 0;
    let scopeFindPredicates = 0;
    let graphStringifyCalls = 0;
    let graphStringifiedCharacters = 0;
    let raceInputPromises = 0;
    Object.freeze = function (value: any) {
      if (value !== null && typeof value === "object" && Array.isArray(value.tasks) && Array.isArray(value.scopes) && value.tasks[0]?.taskId !== undefined) graphDtoFreezes += 1;
      return originalFreeze(value);
    } as any;
    Array.prototype.find = function (predicate: any, thisArg?: any) {
      const first = this[0];
      const scope = first !== undefined && Object.hasOwn(first, "activationTaskIds");
      const settlement = first !== undefined && Object.hasOwn(first, "taskId") && first.kind === "completed";
      return originalFind.call(this, (value: any, index: number, array: any[]) => {
        if (scope) scopeFindPredicates += 1;
        if (settlement) settlementFindPredicates += 1;
        return predicate.call(thisArg, value, index, array);
      });
    } as any;
    JSON.stringify = function (value: any, ...args: any[]) {
      const rendered = (originalStringify as any)(value, ...args);
      if (value !== null && typeof value === "object" && Array.isArray(value.tasks) && Array.isArray(value.scopes)) {
        graphStringifyCalls += 1;
        graphStringifiedCharacters += rendered.length;
      }
      return rendered;
    } as any;
    Promise.race = function (input: any) {
      const promises = Array.from(input);
      raceInputPromises += promises.length;
      return originalRace.call(this, promises);
    } as any;
    try {
      const graphRun = definition === undefined ? await runTaskGraph({ graph: { tasks, scopes }, maxParallel: inputKind === "independent-parallel" ? n : 1, execute: () => true }) : undefined;
      if (definition !== undefined) {
        const result = await run(definition);
        if (result.kind !== "completed" || result.snapshot.checks.length !== n || result.aggregate !== "passed") throw new Error("public probe did not complete all checks");
      }
      if (graphRun !== undefined && (graphRun.settlements.length !== n || graphRun.settlements.some(({ settlement }) => settlement.kind !== "completed"))) throw new Error("probe did not complete all tasks");
    } finally {
      Array.prototype.find = originalFind;
      JSON.stringify = originalStringify;
      Promise.race = originalRace;
      Object.freeze = originalFreeze;
    }
    results.push({ inputKind, n, graphDtoFreezes, settlementFindPredicates, scopeFindPredicates, graphStringifyCalls, graphStringifiedCharacters, raceInputPromises });
  }
}
console.log(JSON.stringify({ runtime: `Bun ${Bun.version}`, samples: results }, null, 2));
