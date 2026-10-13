import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { prepareTaskGraph } from "../graph.ts";
import {
  admissionCandidatesForCore,
  admissionStateForCore,
  cancelPendingAdmissionCore,
  compilePreparedAdmissionGraph,
  createInitialAdmissionCoreState,
  selectAdmissionCore,
  settleRunningAdmissionCore,
  type AdmissionCoreState
} from "./core.ts";
import { schedulerInspectionForCore } from "./projection.ts";
import { taskIdsForCore } from "./scheduler-queries.ts";

function selected(core: AdmissionCoreState, taskId: string): AdmissionCoreState {
  const result = selectAdmissionCore(core, taskId);
  if (!result.accepted) assert.fail(`selection rejected: ${result.reason.kind}`);
  return result.transition.state;
}

function settled(core: AdmissionCoreState, taskId: string): AdmissionCoreState {
  const result = settleRunningAdmissionCore(core, taskId, "completed");
  if (!result.accepted) assert.fail(`settlement rejected: ${result.reason.kind}`);
  return result.transition.state;
}

function candidates(core: AdmissionCoreState) {
  return admissionCandidatesForCore(core).map(({ task, canAdmit }) => ({
    taskId: task.id,
    canAdmit
  }));
}

describe("shared admission Core queries", () => {
  it("shares ordered memberships and readiness across transitions without scanning the whole graph", () => {
    const graph = prepareTaskGraph(
      {
        resourceCapacities: { worker: 1 },
        tasks: [
          { id: "z", mutex: ["lock"], resourceClaims: { worker: 1 } },
          { id: "a" },
          { id: "dependent", dependsOn: ["z", "z"] },
          { id: "observer", observes: ["z", "z"] },
          { id: "mutex", mutex: ["lock", "lock"] },
          { id: "resource", resourceClaims: { worker: 1 } }
        ]
      },
      4
    );
    const compiled = compilePreparedAdmissionGraph(graph, 4);
    const plainInitial = createInitialAdmissionCoreState(compiled);
    // A read-only structural guard: indexed consumers may address slots, not walk all Tasks.
    let addressedSlots = 0;
    const guardedTasks = new Proxy(graph.tasks, {
      get(target, key, receiver): unknown {
        if (
          key === Symbol.iterator ||
          ["entries", "map", "flatMap", "some", "filter"].includes(String(key))
        ) {
          assert.fail(`query attempted a whole-graph Task traversal: ${String(key)}`);
        }
        if (typeof key === "string" && /^\d+$/u.test(key)) addressedSlots += 1;
        return Reflect.get(target, key, receiver);
      }
    });
    const initial: AdmissionCoreState = Object.freeze({
      ...plainInitial,
      compiled: Object.freeze({
        ...compiled,
        graph: Object.freeze({ ...graph, tasks: guardedTasks })
      })
    });
    assert.deepEqual(taskIdsForCore(initial, "pending"), [
      "z",
      "a",
      "dependent",
      "observer",
      "mutex",
      "resource"
    ]);
    assert.deepEqual(
      candidates(initial),
      ["z", "a", "mutex", "resource"].map((taskId) => ({ taskId, canAdmit: true }))
    );
    const running = selected(initial, "z");
    addressedSlots = 0;
    assert.deepEqual(taskIdsForCore(running, "running"), ["z"]);
    assert.equal(addressedSlots, 1);
    addressedSlots = 0;
    assert.deepEqual(candidates(running), [
      { taskId: "a", canAdmit: true },
      { taskId: "resource", canAdmit: false }
    ]);
    assert.equal(addressedSlots, 2);
    assert.deepEqual(admissionStateForCore(running).catalog.selectableTaskIds, ["a"]);
    assert.deepEqual(schedulerInspectionForCore(running).runningMutexes, ["lock"]);
    const released = settled(running, "z");
    assert.deepEqual(taskIdsForCore(released, "settled"), ["z"]);
    assert.deepEqual(
      candidates(released),
      ["a", "dependent", "observer", "mutex", "resource"].map((taskId) => ({
        taskId,
        canAdmit: true
      }))
    );
    assert.deepEqual(admissionStateForCore(released).catalog.selectableTaskIds, [
      "a",
      "dependent",
      "mutex",
      "observer",
      "resource"
    ]);
    const fork = selected(initial, "a");
    assert.deepEqual(taskIdsForCore(fork, "running"), ["a"]);
    assert.deepEqual(admissionStateForCore(initial).inspection.runningTaskIds, []);
    assert.deepEqual(candidates(running), [
      { taskId: "a", canAdmit: true },
      { taskId: "resource", canAdmit: false }
    ]);
    const twoRunning = selected(running, "a");
    assert.deepEqual(taskIdsForCore(twoRunning, "running"), ["z", "a"]);
    assert.deepEqual(admissionStateForCore(twoRunning).inspection.runningTaskIds, ["a", "z"]);
    const twoSettled = settled(settled(twoRunning, "a"), "z");
    assert.deepEqual(taskIdsForCore(twoSettled, "settled"), ["z", "a"]);
    assert.deepEqual(admissionStateForCore(twoSettled).inspection.settledTasks, [
      { taskId: "a", outcome: "satisfied" },
      { taskId: "z", outcome: "satisfied" }
    ]);
    const cancelled = cancelPendingAdmissionCore(running).state;
    assert.deepEqual(taskIdsForCore(cancelled, "pending"), []);
    assert.deepEqual(candidates(cancelled), []);
    assert.deepEqual(taskIdsForCore(cancelled, "running"), ["z"]);
    assert.deepEqual(taskIdsForCore(running, "pending"), [
      "a",
      "dependent",
      "observer",
      "mutex",
      "resource"
    ]);
  });
});
