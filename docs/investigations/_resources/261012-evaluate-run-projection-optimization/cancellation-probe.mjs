import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [before, candidate, output] = process.argv.slice(2);
assert(
  process.argv.length === 5 && before && candidate && output,
  "usage: cancellation-probe.mjs <before> <candidate> <output>"
);
const observations = [];
for (const source of [before, candidate]) {
  const load = (file) =>
    import(pathToFileURL(resolve(source, "src/project-run/task-scheduler", file)).href);
  const { runTaskGraph } = await load("scheduler.ts");
  const { prepareTaskGraph } = await load("graph.ts");
  const { decideScheduler } = await load("scheduler-decision.ts");
  const controller = new AbortController();
  const events = [];
  const executed = [];
  const graph = {
    tasks: [{ id: "first" }, { id: "z-last-lexical" }, { id: "a-first-lexical" }, { id: "middle" }]
  };
  const result = await runTaskGraph({
    graph,
    maxParallel: 1,
    signal: controller.signal,
    diagnosticLogger: { close: () => "disabled", observe: (event) => events.push(event) },
    execute: (task) => {
      executed.push(task.id);
      controller.abort();
      return task.id;
    }
  });
  const decisions = events
    .filter((event) => event.event === "scheduler.decision")
    .map((event) => event.details);
  const cancellation = decisions.find((decision) => decision.kind === "cancel-pending");
  assert(cancellation, "expected a cancel-pending decision");
  assert.deepEqual(executed, ["first"]);
  assert.deepEqual(cancellation.taskIds, ["z-last-lexical", "a-first-lexical", "middle"]);
  assert(Object.isFrozen(cancellation.taskIds));
  assert.equal(result.cancelled, true);
  assert.deepEqual(
    result.settlements.map(({ task, settlement }) => [task.id, settlement.kind]),
    [
      ["first", "completed"],
      ["z-last-lexical", "cancelled-before-start"],
      ["a-first-lexical", "cancelled-before-start"],
      ["middle", "cancelled-before-start"]
    ]
  );
  const suppliedOrder = ["middle", "a-first-lexical", "z-last-lexical"];
  const pureDecision = decideScheduler(
    Object.freeze({
      graph: prepareTaskGraph(graph, 1),
      maxParallel: 1,
      activeScopeIds: Object.freeze([]),
      isAbortRequested: true,
      isCancelled: false,
      pendingTaskIds: Object.freeze(suppliedOrder),
      runningMutexes: Object.freeze([]),
      runningTaskIds: Object.freeze(["first"]),
      settledTasks: Object.freeze([])
    }),
    Object.freeze({ kind: "execution-started" })
  );
  assert.equal(pureDecision.kind, "cancel-pending");
  assert.deepEqual(pureDecision.taskIds, suppliedOrder);
  assert(Object.isFrozen(pureDecision.taskIds));
  observations.push({ source, executed, decisions, result, pureDecision });
}
const [left, right] = observations;
assert.deepEqual({ ...left, source: null }, { ...right, source: null });
writeFileSync(
  output,
  JSON.stringify(
    {
      runtime: process.version,
      method: "direct shell cancellation and standalone snapshot-order equivalence; no timing",
      observations
    },
    null,
    2
  ),
  { flag: "wx" }
);
console.log(
  "Cancellation ordered decisions, drain, settlements, and standalone supplied order match exactly."
);
