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
    assertReplacedHeadRevision();
    assertUnchangedActiveRoots();
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
      assertHeterogeneousHeads(width);
    }
  });
});

/** Distinct groups must consume a ranked prefix, including blocked ordinary priority heads. */
function assertHeterogeneousHeads(width: number): void {
  const graph = prepareTaskGraph(
    {
      resourceCapacities: { worker: 1 },
      tasks: Array.from({ length: width }, (_, slot) => ({
        id: `unique-${slot}`,
        mutex: [`mutex-${slot}`],
        resourceClaims: slot < width / 2 || slot === width - 1 ? { worker: 1 } : {}
      }))
    },
    4
  );
  const initial = createInitialAdmissionCoreState(compilePreparedAdmissionGraph(graph, 4));
  assert.equal(initial.selection.readyGroupFrontier.size, width);
  const frontier = new Proxy(initial.selection.readyGroupFrontier, {
    get(target, key, receiver): unknown {
      if (key === Symbol.iterator || ["values", "keys", "entries", "forEach"].includes(String(key)))
        assert.fail(`static query enumerated all groups: ${String(key)}`);
      return Reflect.get(target, key, receiver);
    }
  });
  const captured: AdmissionCoreState = Object.freeze({
    ...initial,
    selection: Object.freeze({ ...initial.selection, readyGroupFrontier: frontier })
  });
  assert.equal(staticAdmissionCandidateForCore(captured)?.task.id, "unique-0");
  const held = selectedCore(captured, `unique-${width - 1}`);
  assert.equal(staticAdmissionCandidateForCore(held)?.task.id, `unique-${width / 2}`);
  const released = settledCore(held, `unique-${width - 1}`);
  assert.equal(staticAdmissionCandidateForCore(released)?.task.id, "unique-0");
  assert.equal(staticAdmissionCandidateForCore(captured)?.task.id, "unique-0");
  const cancelled = cancelPendingAdmissionCore(released).state;
  assert.equal(staticAdmissionCandidateForCore(cancelled), undefined);
}

/** A temporarily displaced Task gets a new entry identity when it returns as group head. */
function assertReplacedHeadRevision(): void {
  const graph = prepareTaskGraph(
    {
      tasks: [
        { id: "low", admissionPriority: -1 },
        { id: "high", admissionPriority: 10, dependsOn: ["gate"] },
        { id: "gate", mutex: ["gate"] }
      ]
    },
    4
  );
  const initial = createInitialAdmissionCoreState(compilePreparedAdmissionGraph(graph, 4));
  const oldEntry = initial.selection.staticGroupFrontier.queues.ordinary;
  assert.equal(oldEntry?.taskSlot, 2);
  const beforeHigh = settledCore(selectedCore(initial, "gate"), "gate");
  assert.equal(staticAdmissionCandidateForCore(beforeHigh)?.task.id, "high");
  const afterHigh = settledCore(selectedCore(beforeHigh, "high"), "high");
  const returnedEntry = afterHigh.selection.staticGroupFrontier.queues.ordinary;
  assert.equal(returnedEntry?.taskSlot, 0);
  const groupSlot = initial.compiled.constraintGroups.taskGroupSlots[0];
  assert.ok(groupSlot !== undefined);
  assert.equal(initial.selection.staticGroupFrontier.revisions.get(groupSlot), 1);
  assert.equal(afterHigh.selection.staticGroupFrontier.revisions.get(groupSlot), 3);
  assert.equal(returnedEntry?.revision, 3);
  assert.equal(staticAdmissionCandidateForCore(initial)?.task.id, "gate");
  assert.equal(oldEntry?.revision, 1);
}

/** Ordinary work and inactive terminal closure cannot change the active-root projection. */
function assertUnchangedActiveRoots(): void {
  const graph = prepareTaskGraph(
    {
      tasks: [
        { id: "open", scopeId: "active" },
        { id: "end", scopeId: "active", observes: ["open"] },
        { id: "inactive", scopeId: "inactive" },
        { id: "ordinary" }
      ],
      scopes: [
        { id: "active", maxParallel: 4, activationTaskIds: ["open"], terminalTaskId: "end" },
        { id: "inactive", maxParallel: 4, activationTaskIds: [], terminalTaskId: "inactive" }
      ]
    },
    4
  );
  const initial = createInitialAdmissionCoreState(compilePreparedAdmissionGraph(graph, 4));
  const active = selectedCore(initial, "open");
  const roots = active.selection.activeScopeSlots;
  const guardedRoots = new Proxy(roots, {
    get(target, key, receiver): unknown {
      if (key === "includes") assert.fail("unchanged active roots were searched");
      return Reflect.get(target, key, receiver);
    }
  });
  const guarded: AdmissionCoreState = Object.freeze({
    ...active,
    selection: Object.freeze({ ...active.selection, activeScopeSlots: guardedRoots })
  });
  const ordinary = settledCore(selectedCore(guarded, "ordinary"), "ordinary");
  assert.equal(ordinary.selection.activeScopeSlots, guardedRoots);
  const closedInactive = settledCore(selectedCore(ordinary, "inactive"), "inactive");
  assert.equal(closedInactive.selection.activeScopeSlots, guardedRoots);
  assert.deepEqual(
    [...active.selection.activeScopeSlotSet],
    [...closedInactive.selection.activeScopeSlotSet]
  );
  assert.deepEqual(roots, [0]);
  assert.deepEqual(initial.selection.activeScopeSlots, []);
}
