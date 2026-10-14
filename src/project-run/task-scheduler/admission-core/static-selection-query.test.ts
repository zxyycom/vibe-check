import { selectedCore, settledCore } from "./selection.test-support.ts";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { staticAdmissionSelectionPolicy } from "../admission-selection-policy.ts";
import { prepareTaskGraph } from "../graph.ts";
import { decideSchedulerFromCore } from "../scheduler-decision.ts";
import {
  admissionCandidatesForCore,
  admissionStateForCore,
  cancelPendingAdmissionCore,
  compilePreparedAdmissionGraph,
  createInitialAdmissionCoreState,
  createAdmissionCoreFromSchedulerSnapshot,
  type AdmissionCoreState
} from "./core.ts";
import { staticAdmissionCandidateForCore } from "./static-selection-query.ts";

function decision(core: AdmissionCoreState) {
  return decideSchedulerFromCore({
    admissionCore: core,
    policy: staticAdmissionSelectionPolicy,
    runtime: { isAbortRequested: false, isCancelled: false },
    trigger: { kind: "admission-continued" }
  });
}

describe("static admission group frontier", () => {
  it("switches scope ties without backfilling blocked constrained work or mutating captured forks", () => {
    const graph = prepareTaskGraph(
      {
        resourceCapacities: { worker: 1 },
        scopes: [
          { id: "tight", maxParallel: 2, activationTaskIds: ["open"], terminalTaskId: "end" }
        ],
        tasks: [
          { id: "z", admissionPriority: 5, resourceClaims: { worker: 1 }, scopeId: "tight" },
          { id: "a", admissionPriority: 5, resourceClaims: { worker: 1 }, scopeId: "tight" },
          { id: "gate", admissionPriority: -1 },
          { id: "open", dependsOn: ["gate"], resourceClaims: { worker: 1 }, scopeId: "tight" },
          { id: "end", observes: ["open", "z", "a"], scopeId: "tight" },
          { id: "unrelated", dependsOn: ["gate"], admissionPriority: 100 }
        ]
      },
      3
    );
    const initial = createInitialAdmissionCoreState(compilePreparedAdmissionGraph(graph, 3));
    const captured = decision(initial);
    assert.equal(captured.kind, "admit");
    assert.equal(captured.taskId, "z");
    const fork = selectedCore(initial, "z");
    const opened = selectedCore(settledCore(selectedCore(initial, "gate"), "gate"), "open");
    assert.deepEqual(staticAdmissionCandidateForCore(opened), {
      task: graph.tasks[1],
      canAdmit: false
    });
    const blocked = decision(opened);
    assert.equal(blocked.kind, "await-running");
    assert.deepEqual(blocked.proposal, { kind: "wait" });
    assert.deepEqual(admissionStateForCore(opened).catalog.selectableTaskIds, ["unrelated"]);
    const released = settledCore(opened, "open");
    assert.equal(staticAdmissionCandidateForCore(released)?.task.id, "a");
    // A valid graph may be adapted from a private snapshot whose terminal already settled.
    // Static layers read active roots, not the retained once-activated scope counter.
    const closed = createAdmissionCoreFromSchedulerSnapshot(initial.compiled, {
      graph,
      maxParallel: 3,
      isAbortRequested: false,
      isCancelled: false,
      pendingTaskIds: ["z", "a", "unrelated"],
      runningTaskIds: [],
      runningMutexes: [],
      activeScopeIds: ["tight"],
      settledTasks: ["gate", "open", "end"].map((taskId) => ({ taskId, kind: "completed" }))
    });
    assert.deepEqual(admissionStateForCore(closed).inspection.scopes, [
      { scopeId: "tight", lifecycle: "closed" }
    ]);
    assert.equal(staticAdmissionCandidateForCore(closed)?.task.id, "unrelated");
    const withoutUnrelated = settledCore(selectedCore(closed, "unrelated"), "unrelated");
    assert.equal(staticAdmissionCandidateForCore(withoutUnrelated)?.task.id, "z");
    assert.equal(staticAdmissionCandidateForCore(fork)?.task.id, "gate");
    assert.equal(staticAdmissionCandidateForCore(initial)?.task.id, "z");
    // Read observation-only fields after other branches have advanced.
    assert.equal(captured.eligibleCount, 3);
    assert.deepEqual(
      captured.candidates,
      ["z", "a", "gate"].map((taskId) => ({ taskId, canAdmit: true }))
    );
    assert.equal(Object.isFrozen(captured.candidates), true);
    assert.equal(Object.isFrozen(captured.candidates[0]), true);
    assert.equal(blocked.eligibleCount, 3);
    assert.deepEqual(blocked.candidates, [
      { taskId: "z", canAdmit: false },
      { taskId: "a", canAdmit: false },
      { taskId: "unrelated", canAdmit: true }
    ]);
  });

  it("consumes wide equivalent heads without materializing candidates and prunes arbitrary selections in transitions", () => {
    for (const width of [128, 512]) {
      const tasks = Array.from({ length: width }, (_, slot) => ({
        id: `t-${slot}`,
        scopeId: `scope-${slot}`,
        mutex: slot % 2 === 0 ? ["shared"] : ["shared", "shared"]
      }));
      const graph = prepareTaskGraph(
        {
          tasks,
          scopes: tasks.map((task) => ({
            id: task.scopeId,
            maxParallel: 4,
            activationTaskIds: [task.id],
            terminalTaskId: task.id
          }))
        },
        4
      );
      const compiled = compilePreparedAdmissionGraph(graph, 4);
      const plainInitial = createInitialAdmissionCoreState(compiled);
      assert.equal(plainInitial.selection.readyGroupFrontier.size, 1);
      let canEnumerateReadyMembers = false;
      const readySlots = new Proxy(plainInitial.selection.relationReadyTaskSlots, {
        get(target, key, receiver): unknown {
          if (
            !canEnumerateReadyMembers &&
            (key === Symbol.iterator ||
              ["toArray", "forEach", "filter", "some"].includes(String(key)))
          )
            assert.fail(`static selection enumerated ready members: ${String(key)}`);
          return Reflect.get(target, key, receiver);
        }
      });
      const initial: AdmissionCoreState = Object.freeze({
        ...plainInitial,
        selection: Object.freeze({ ...plainInitial.selection, relationReadyTaskSlots: readySlots })
      });
      const first = decision(initial);
      assert.equal(first.kind, "admit");
      assert.equal(first.taskId, "t-0");
      // Removing a non-head leaves a tombstone but never changes the live static head.
      const tail = selectedCore(initial, `t-${width - 1}`);
      const held = decision(tail);
      assert.equal(held.kind, "await-running");
      assert.equal(held.proposal, null);
      const released = settledCore(tail, `t-${width - 1}`);
      assert.equal(staticAdmissionCandidateForCore(released)?.task.id, "t-0");
      const afterFirst = settledCore(selectedCore(released, "t-0"), "t-0");
      assert.equal(staticAdmissionCandidateForCore(afterFirst)?.task.id, "t-1");
      const cancelled = cancelPendingAdmissionCore(afterFirst).state;
      assert.equal(cancelled.selection.readyGroupFrontier.size, 0);
      assert.equal(staticAdmissionCandidateForCore(cancelled), undefined);
      canEnumerateReadyMembers = true;
      assert.equal(first.eligibleCount, width);
      assert.equal(first.candidates.length, width);
      assert.equal(held.eligibleCount, 0);
      assert.deepEqual(held.candidates, []);
      assert.equal(admissionCandidatesForCore(released).length, width - 1);
      assert.equal(admissionCandidatesForCore(initial).length, width);
      assert.deepEqual(admissionStateForCore(initial).inspection.runningTaskIds, []);
    }
  });
});
