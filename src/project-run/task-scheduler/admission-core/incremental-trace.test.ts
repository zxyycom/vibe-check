import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareTaskGraph } from "../graph.ts";
import {
  admissionStateForCore,
  compilePreparedAdmissionGraph,
  createAdmissionCoreFromSettlements,
  selectAdmissionCore,
  settleAdmissionCore,
  settleRunningAdmissionCore,
  cancelPendingAdmissionCore,
  reconcileAdmissionCore,
  type AdmissionCoreState
} from "./core.ts";
import { traceAdmissionCore, type AdmissionTraceAction } from "./trace.ts";
import { staticAdmissionCandidateForCore } from "./static-selection-query.ts";
import { ReferenceAdmissionState } from "./incremental-trace.test-support.ts";
import { traceCorpus } from "./incremental-trace-fixtures.test-support.ts";
import { runTaskGraph } from "../scheduler.ts";

function successor(state: AdmissionCoreState, action: AdmissionTraceAction): AdmissionCoreState {
  switch (action.kind) {
    case "select": {
      const result = selectAdmissionCore(state, action.taskId);
      return result.accepted ? result.transition.state : state;
    }
    case "settle": {
      const result = settleAdmissionCore(state, action.taskId, action.outcome);
      return result.accepted ? result.transition.state : state;
    }
    case "settle-running": {
      const result = settleRunningAdmissionCore(state, action.taskId, action.settlementKind);
      return result.accepted ? result.transition.state : state;
    }
    case "cancel-pending":
      return cancelPendingAdmissionCore(state).state;
    case "reconcile":
      return reconcileAdmissionCore(state).state;
  }
}
function selected(state: AdmissionCoreState, taskId: string): AdmissionCoreState {
  const result = selectAdmissionCore(state, taskId);
  if (!result.accepted) assert.fail(result.reason.kind);
  return result.transition.state;
}
function settled(state: AdmissionCoreState, taskId: string): AdmissionCoreState {
  const result = settleRunningAdmissionCore(state, taskId, "completed");
  if (!result.accepted) assert.fail(result.reason.kind);
  return result.transition.state;
}
function staticChoice(state: AdmissionCoreState) {
  const choice = staticAdmissionCandidateForCore(state);
  return choice === undefined ? undefined : { taskId: choice.task.id, canAdmit: choice.canAdmit };
}

describe("incremental admission state", () => {
  it("matches an independent full-scan oracle for every action, rejection, effect, static tie and retained fork", () => {
    for (const fixture of traceCorpus) {
      const graph = prepareTaskGraph(fixture.graph, fixture.maxParallel);
      const seeds = "settlements" in fixture ? fixture.settlements : [];
      const initial = createAdmissionCoreFromSettlements(
        compilePreparedAdmissionGraph(graph, fixture.maxParallel),
        seeds
      );
      const actions = fixture.actions;
      const trace = traceAdmissionCore(initial, actions);
      const reference = new ReferenceAdmissionState(graph, fixture.maxParallel, seeds);
      let state = initial;
      const captured = admissionStateForCore(initial);
      const catalog = captured.catalog;
      const inspection = captured.inspection;
      for (const [index, action] of actions.entries()) {
        assert.deepEqual(
          staticChoice(state),
          reference.staticChoice(),
          `${fixture.name}: static before ${index}`
        );
        assert.deepEqual(trace[index], reference.step(action), `${fixture.name}: action ${index}`);
        state = successor(state, action);
        assert.deepEqual(
          staticChoice(state),
          reference.staticChoice(),
          `${fixture.name}: static after ${index}`
        );
      }
      assert.deepEqual(captured.catalog, catalog, `${fixture.name}: retained catalog`);
      assert.deepEqual(captured.inspection, inspection, `${fixture.name}: retained inspection`);
      const forkTaskIds = catalog.selectableTaskIds;
      for (const taskId of forkTaskIds.slice(0, 3)) {
        const fork = selected(initial, taskId);
        const forkReference = new ReferenceAdmissionState(graph, fixture.maxParallel, seeds);
        forkReference.step({ kind: "select", taskId });
        assert.deepEqual(
          admissionStateForCore(fork).inspection,
          forkReference.projection().inspection
        );
        assert.deepEqual(captured.catalog, catalog);
      }
    }
    for (let seed = 0; seed < 8; seed++) assertGeneratedTrace(seed);
  });

  it("publishes actual counter thresholds, membership changes and net cancellation without rediscovery", async () => {
    const graph = prepareTaskGraph(
      {
        resourceCapacities: { r: 4 },
        tasks: [
          { id: "left", mutex: ["left", "left"], resourceClaims: { r: 1 } },
          { id: "right", mutex: ["right"], resourceClaims: { r: 2 } },
          { id: "dependent", dependsOn: ["left", "right"] }
        ]
      },
      4
    );
    const initial = createAdmissionCoreFromSettlements(compilePreparedAdmissionGraph(graph, 4), []);
    const running = selected(selected(initial, "left"), "right");
    const left = settled(running, "left");
    assert.deepEqual(left.lastTransition?.membership.relationReady, { added: [], removed: [] });
    assert.equal(
      left.selection.memberships.relationReady,
      running.selection.memberships.relationReady
    );
    assert.equal(left.selection.frontiers.ready, running.selection.frontiers.ready);
    assert.equal(left.selection.frontiers.static, running.selection.frontiers.static);
    assert.deepEqual(left.lastTransition?.counters, [
      { kind: "mutexHolders", slot: 0, before: 2, after: 0 },
      { kind: "resourceInUse", slot: 0, before: 3, after: 2 },
      { kind: "pendingDependencies", slot: 2, before: 2, after: 1 }
    ]);
    const right = settled(left, "right");
    assert.deepEqual(right.lastTransition?.membership.relationReady, { added: [2], removed: [] });
    assert.deepEqual(right.lastTransition?.running, { before: 1, after: 0 });
    assert.equal(staticChoice(right)?.taskId, "dependent");

    const chainGraph = prepareTaskGraph(
      {
        tasks: [
          { id: "running" },
          { id: "first", dependsOn: ["running"] },
          { id: "second", dependsOn: ["first"] }
        ]
      },
      1
    );
    const chain = selected(
      createAdmissionCoreFromSettlements(compilePreparedAdmissionGraph(chainGraph, 1), []),
      "running"
    );
    const cancelled = cancelPendingAdmissionCore(chain);
    assert.deepEqual(
      cancelled.effects.map((effect) => effect.taskId),
      ["first", "second"]
    );
    assert.deepEqual(
      cancelled.state.lastTransition?.status.map((change) => change.taskSlot),
      [1, 2]
    );
    assert.deepEqual(cancelled.state.lastTransition?.membership.relationReady, {
      added: [],
      removed: []
    });
    assert.equal(cancelled.state.selection.frontiers.forced, undefined);
    assert.equal(cancelled.effectStates[0]?.lastTransition?.status.length, 1);
    const drained = settleRunningAdmissionCore(cancelled.state, "running", "completed");
    if (!drained.accepted) assert.fail(drained.reason.kind);
    assert.deepEqual(drained.transition.effects, [
      { kind: "settled", settlementKind: "completed", taskId: "running" }
    ]);
    assert.deepEqual(admissionStateForCore(chain).inspection.runningTaskIds, ["running"]);
    assert.deepEqual(
      admissionStateForCore(chain).catalog.nonSelectableTasks.map((task) => task.taskId),
      ["first", "second"]
    );
    const controller = new AbortController();
    const shellBlocked: string[] = [];
    const run = await runTaskGraph({
      graph: {
        tasks: [
          { id: "fast" },
          { id: "running" },
          { id: "first", dependsOn: ["running"] },
          { id: "second", dependsOn: ["first"] }
        ]
      },
      maxParallel: 2,
      signal: controller.signal,
      execute(task) {
        if (task.id === "fast") controller.abort();
        return true;
      },
      onAdmissionCoreEffect({ effect }) {
        if (effect.kind === "settled" && effect.settlementKind === "blocked")
          shellBlocked.push(effect.taskId);
      }
    });
    assert.equal(run.cancelled, true);
    assert.deepEqual(
      run.settlements.map(({ task, settlement }) => [task.id, settlement.kind]),
      [
        ["fast", "completed"],
        ["running", "completed"],
        ["first", "cancelled-before-start"],
        ["second", "cancelled-before-start"]
      ]
    );
    assert.deepEqual(shellBlocked, []);
  });
});

function assertGeneratedTrace(seed: number): void {
  const ids = Array.from(
    { length: 12 + seed },
    (_, slot) => `t-${String(30 - slot).padStart(2, "0")}`
  );
  const graph = prepareTaskGraph(
    {
      resourceCapacities: { r: 4, s: 2 },
      tasks: ids.map((id, slot) => {
        const dependency = slot > 2 ? (slot * 7 + seed) % slot : undefined;
        const observation = slot > 3 ? (slot * 3 + seed + 1) % slot : undefined;
        return {
          id,
          admissionPriority: slot % 3,
          mutex: slot % 3 === 0 ? ["m", "m"] : [],
          resourceClaims: { r: 1 + (slot % 3), ...(slot % 2 === 0 ? { s: 1 } : {}) },
          ...(dependency === undefined
            ? {}
            : {
                dependsOn: slot % 2 === 0 ? [ids[dependency], ids[dependency]] : [ids[dependency]]
              }),
          ...(observation === undefined || observation === dependency
            ? {}
            : { observes: [ids[observation]] })
        };
      })
    },
    3
  );
  const reference = new ReferenceAdmissionState(graph, 3);
  const actions: AdmissionTraceAction[] = [];
  for (let step = 0; step < ids.length * 8; step++) {
    const projection = reference.projection();
    if (projection.inspection.nextBoundary === "complete") break;
    let action: AdmissionTraceAction;
    if (step === 7 && seed % 2 === 1) action = { kind: "cancel-pending" };
    else if (step % 9 === 4) action = { kind: "select", taskId: "missing" };
    else {
      const candidates = projection.catalog.selectableTaskIds;
      const candidate = candidates[(step + seed) % Math.max(1, candidates.length)];
      if (candidate !== undefined) action = { kind: "select", taskId: candidate };
      else {
        const running = projection.inspection.runningTaskIds[0];
        if (running === undefined) assert.fail("reference DAG cannot make progress");
        action = {
          kind: "settle",
          taskId: running,
          outcome: (step + seed) % 5 === 0 ? "unsatisfied" : "satisfied"
        };
      }
    }
    actions.push(action);
    reference.step(action);
  }
  assert.equal(reference.projection().inspection.nextBoundary, "complete");
  const initial = createAdmissionCoreFromSettlements(compilePreparedAdmissionGraph(graph, 3), []);
  const observed = traceAdmissionCore(initial, actions);
  const expected = new ReferenceAdmissionState(graph, 3);
  let state = initial;
  for (const [index, action] of actions.entries()) {
    assert.deepEqual(observed[index], expected.step(action), `generated ${seed}: ${index}`);
    state = successor(state, action);
    assert.deepEqual(
      staticChoice(state),
      expected.staticChoice(),
      `generated static ${seed}: ${index}`
    );
  }
}
