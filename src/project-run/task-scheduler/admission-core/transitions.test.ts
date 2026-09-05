import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  admissionStateForCore,
  compilePreparedAdmissionGraph,
  createAdmissionCoreFromSchedulerSnapshot,
  createInitialAdmissionCoreState,
  selectAdmissionCore,
  settleRunningAdmissionCore,
  validateAdmissionCoreSelection,
  type AdmissionCoreState
} from "./core.ts";
import { prepareTaskGraph } from "../graph.ts";

describe("admission core transitions", () => {
  it("admission core settles in the selected implementation", () => {
    const expected = {
      accepted: false as const,
      reason: { kind: "mutex-held" as const, mutexIds: ["shared", "shared"] }
    };
    const planned = prepareTaskGraph(
      {
        tasks: [
          { id: "dynamic-holder", mutex: ["shared"] },
          { id: "contender", mutex: ["shared", "shared"] }
        ]
      },
      2
    );
    const seeded = createAdmissionCoreFromSchedulerSnapshot(
      compilePreparedAdmissionGraph(planned, 2),
      {
        activeScopeIds: [],
        graph: planned,
        isAbortRequested: false,
        isCancelled: false,
        maxParallel: 2,
        pendingTaskIds: ["contender"],
        runningMutexes: ["shared"],
        runningTaskIds: ["dynamic-holder"],
        settledTasks: []
      }
    );
    assert.deepEqual(validateAdmissionCoreSelection(seeded, "contender"), expected);
    assert.equal(admissionStateForCore(seeded).inspection.nextBoundary, "wait");
    const settled = settleRunningAdmissionCore(seeded, "dynamic-holder", "completed");
    if (!settled.accepted) assert.fail("expected dynamic holder settlement");
    assert.deepEqual(
      validateAdmissionCoreSelection(settled.transition.state, "contender"),
      expected
    );
    assert.equal(
      admissionStateForCore(settled.transition.state).inspection.nextBoundary,
      "complete"
    );
  });

  it("keeps persistent forced-frontier priority and closed scope roots across a 80-by-80 cascade", () => {
    const layerOne = Array.from(
      { length: 80 },
      (_, index) => `l1-${String(index).padStart(2, "0")}`
    );
    const layerTwo = Array.from(
      { length: 80 },
      (_, index) => `l2-${String(index).padStart(2, "0")}`
    );
    const cascade = prepareTaskGraph(
      {
        tasks: [
          { id: "root" },
          ...layerOne.map((id) => ({ dependsOn: ["root"], id })),
          ...layerTwo.map((id) => ({ dependsOn: layerOne, id }))
        ]
      },
      1
    );
    const selectedRoot = selectAdmissionCore(
      createInitialAdmissionCoreState(compilePreparedAdmissionGraph(cascade, 1)),
      "root"
    );
    if (!selectedRoot.accepted) assert.fail("expected cascade root selection");
    const failedRoot = settleRunningAdmissionCore(selectedRoot.transition.state, "root", "failed");
    if (!failedRoot.accepted) assert.fail("expected cascade root failure");
    const expectedEffectTaskIds = ["root", ...[...layerOne].reverse(), ...[...layerTwo].reverse()];
    assert.deepEqual(
      failedRoot.transition.effects.map((effect) => effect.taskId),
      expectedEffectTaskIds
    );
    assert.equal(failedRoot.transition.effects.length, 161);
    const firstLayerTwo = failedRoot.transition.effects.find((effect) => effect.taskId === "l2-79");
    assert.deepEqual(firstLayerTwo, {
      dependencyIds: layerOne,
      kind: "settled",
      settlementKind: "blocked",
      taskId: "l2-79"
    });
    for (const [index, effect] of failedRoot.transition.effects.entries()) {
      const effectState: AdmissionCoreState | undefined = failedRoot.transition.effectStates[index];
      if (effectState === undefined) assert.fail(`missing immutable effect state ${index}`);
      assert.deepEqual(
        validateAdmissionCoreSelection(effectState, effect.taskId),
        index === failedRoot.transition.effects.length - 1
          ? { accepted: false, reason: { kind: "state-complete" } }
          : { accepted: false, reason: { kind: "not-pending", status: "settled" } }
      );
    }

    const scoped = prepareTaskGraph(
      {
        scopes: [
          { activationTaskIds: ["worker"], id: "scope", maxParallel: 1, terminalTaskId: "terminal" }
        ],
        tasks: [
          { id: "worker", scopeId: "scope" },
          { dependsOn: ["worker"], id: "terminal", scopeId: "scope" }
        ]
      },
      1
    );
    const worker = selectAdmissionCore(
      createInitialAdmissionCoreState(compilePreparedAdmissionGraph(scoped, 1)),
      "worker"
    );
    if (!worker.accepted) assert.fail("expected scope worker selection");
    const afterWorker = settleRunningAdmissionCore(worker.transition.state, "worker", "completed");
    if (!afterWorker.accepted) assert.fail("expected scope worker settlement");
    const terminal = selectAdmissionCore(afterWorker.transition.state, "terminal");
    if (!terminal.accepted) assert.fail("expected scope terminal selection");
    const afterTerminal = settleRunningAdmissionCore(
      terminal.transition.state,
      "terminal",
      "completed"
    );
    if (!afterTerminal.accepted) assert.fail("expected scope terminal settlement");
    assert.deepEqual(admissionStateForCore(afterTerminal.transition.state).inspection.scopes, [
      { lifecycle: "closed", scopeId: "scope" }
    ]);
  });
});
