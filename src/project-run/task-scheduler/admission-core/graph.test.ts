import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createAdmissionGraph,
  type AdmissionState,
  type AdmissionTransitionResult
} from "../../../index.ts";
import { admissionSelectionPolicyFor } from "../custom-admission-policy.ts";
import { runTaskGraph } from "../scheduler.ts";
import {
  schedulerGraphSnapshot,
  schedulerGraphTask
} from "../scheduler-graph-snapshot.test-support.ts";

describe("immutable admission graph", () => {
  it("validates exact input and returns frozen opaque branching successors", () => {
    assert.throws(
      () =>
        Reflect.apply(createAdmissionGraph, undefined, [
          { graph: schedulerGraph(), maxParallel: 2, unexpected: true }
        ]),
      /exactly/
    );
    assert.throws(
      () => createAdmissionGraph({ graph: schedulerGraph(), maxParallel: 0 }),
      /positive safe/
    );

    const input = schedulerGraph();
    const secondInput = schedulerGraph();
    assert.notEqual(input, secondInput);
    assert.equal(Object.isFrozen(input), true);
    assert.equal(Object.isFrozen(input.tasks), true);
    assert.equal(Object.isFrozen(input.tasks[0]), true);

    const graph = createAdmissionGraph({ graph: input, maxParallel: 2 });
    const initial = graph.initialState();
    const selected = initial.select("source");
    if (!selected.accepted) assert.fail("expected source selection");

    assert.equal(Object.isFrozen(graph), true);
    assert.equal(Object.isFrozen(graph.initialState), true);
    assert.equal(Object.isFrozen(initial), true);
    assert.equal(Object.isFrozen(initial.select), true);
    assert.equal(Object.isFrozen(initial.settle), true);
    assert.equal(Object.isFrozen(initial.validateSelection), true);
    assert.equal(Object.isFrozen(initial.inspection), true);
    assert.equal(Object.isFrozen(initial.catalog), true);
    assert.equal("compiled" in initial, false);
    assert.equal("node" in initial, false);
    assert.deepEqual(initial.inspection.runningTaskIds, []);
    assert.deepEqual(selected.state.inspection.runningTaskIds, ["source"]);
    assert.equal(selected.state === initial, false);
    assert.equal(Object.isFrozen(selected), true);
  });

  it("uses canonical catalog order, dedicated validation reasons, binary settlements, and scope lifecycle", () => {
    const initial = createAdmissionGraph({
      graph: schedulerGraph(),
      maxParallel: 2
    }).initialState();
    assert.deepEqual(initial.catalog.selectableTaskIds, ["alpha", "source"]);
    assert.deepEqual(initial.catalog.nonSelectableTasks, [
      {
        reason: { kind: "depends-on-pending", taskIds: ["source"] },
        taskId: "dependent"
      },
      {
        reason: { kind: "observes-pending", taskIds: ["source"] },
        taskId: "observer"
      },
      {
        reason: { kind: "depends-on-pending", taskIds: ["worker"] },
        taskId: "terminal"
      },
      {
        reason: { kind: "depends-on-pending", taskIds: ["source"] },
        taskId: "worker"
      }
    ]);
    assert.deepEqual(initial.validateSelection("missing"), {
      accepted: false,
      reason: { kind: "unknown-task" }
    });
    assert.deepEqual(initial.validateSelection("dependent"), {
      accepted: false,
      reason: { kind: "depends-on-pending", taskIds: ["source"] }
    });
    assert.deepEqual(initial.inspection.scopes, [{ lifecycle: "inactive", scopeId: "limited" }]);

    const source = acceptedState(initial.select("source"));
    assert.deepEqual(source.validateSelection("source"), {
      accepted: false,
      reason: { kind: "not-pending", status: "running" }
    });
    const unsatisfied = acceptedState(source.settle("source", "unsatisfied"));
    assert.deepEqual(unsatisfied.inspection.settledTasks, [
      { outcome: "unsatisfied", taskId: "source" }
    ]);
    assert.deepEqual(unsatisfied.validateSelection("dependent"), {
      accepted: false,
      reason: { kind: "not-pending", status: "settled" }
    });
    assert.deepEqual(unsatisfied.catalog.selectableTaskIds, ["alpha", "observer"]);
    assert.deepEqual(Reflect.apply(initial.settle, undefined, ["missing", "incorrect"]), {
      accepted: false,
      reason: { kind: "invalid-settlement-outcome" }
    });

    const mutexRunning = acceptedState(
      createAdmissionGraph({
        graph: schedulerGraphSnapshot([
          schedulerGraphTask("left", { mutex: ["shared"] }),
          schedulerGraphTask("right", { mutex: ["shared"] })
        ]),
        maxParallel: 2
      })
        .initialState()
        .select("left")
    );
    assert.deepEqual(mutexRunning.validateSelection("right"), {
      accepted: false,
      reason: { kind: "mutex-held", mutexIds: ["shared"] }
    });

    const rootRunning = acceptedState(
      createAdmissionGraph({
        graph: schedulerGraphSnapshot([schedulerGraphTask("first"), schedulerGraphTask("second")]),
        maxParallel: 1
      })
        .initialState()
        .select("first")
    );
    const rootCapacity = {
      accepted: false as const,
      reason: { kind: "root-capacity-reached" as const, maxParallel: 1, running: 1 }
    };
    assert.deepEqual(rootRunning.validateSelection("second"), rootCapacity);
    assert.deepEqual(rootRunning.select("second"), rootCapacity);

    const scopeCapacityRunning = acceptedState(
      createAdmissionGraph({ graph: scopeCapacityGraph(), maxParallel: 2 })
        .initialState()
        .select("worker")
    );
    assert.deepEqual(scopeCapacityRunning.validateSelection("peer"), {
      accepted: false,
      reason: { kind: "scope-capacity-reached", maxParallel: 1, running: 1, scopeId: "scope" }
    });

    const scopeInitial = createAdmissionGraph({
      graph: scopeGraph(),
      maxParallel: 2
    }).initialState();
    const worker = acceptedState(scopeInitial.select("worker"));
    assert.deepEqual(worker.inspection.scopes, [{ lifecycle: "active", scopeId: "scope" }]);
    const afterWorker = acceptedState(worker.settle("worker", "satisfied"));
    assert.deepEqual(afterWorker.inspection.scopes, [{ lifecycle: "active", scopeId: "scope" }]);
    const terminal = acceptedState(afterWorker.select("terminal"));
    const complete = acceptedState(terminal.settle("terminal", "satisfied"));
    assert.deepEqual(complete.inspection.scopes, [{ lifecycle: "closed", scopeId: "scope" }]);
    assert.deepEqual(complete.validateSelection("worker"), {
      accepted: false,
      reason: { kind: "state-complete" }
    });
  });

  it("supplies callback lookahead without reserving or starting a real Task", async () => {
    const started: string[] = [];
    const release = deferred<void>();
    let firstContextState: unknown;
    const policy = admissionSelectionPolicyFor((context) => {
      assert.equal(context.admissionState, context.admissionState);
      assert.equal(Object.isFrozen(context.admissionState), true);
      const selectable = context.admissionState.catalog.selectableTaskIds;
      if (firstContextState === undefined) {
        firstContextState = context.admissionState;
        const branch = context.admissionState.select("second");
        assert.equal(branch.accepted, true);
        return { kind: "select", taskId: "first" };
      }
      return selectable.length === 0 ? { kind: "wait" } : { kind: "select", taskId: selectable[0] };
    });
    const running = runTaskGraph({
      admissionPolicy: policy,
      execute: async (task) => {
        started.push(task.id);
        if (task.id === "first") await release.promise;
        return task.id;
      },
      graph: { tasks: [{ id: "first" }, { id: "second" }] },
      maxParallel: 1
    });
    await waitFor(() => started.length === 1);
    assert.deepEqual(started, ["first"]);
    release.resolve();
    const run = await running;
    assert.equal(run.admissionPolicyFault, undefined);
    assert.deepEqual(started, ["first", "second"]);

    const controller = new AbortController();
    const guarded = await runTaskGraph({
      admissionPolicy: admissionSelectionPolicyFor((context) => {
        assert.equal(context.admissionState.validateSelection("pending").accepted, true);
        controller.abort();
        return { kind: "select", taskId: "pending" };
      }),
      execute: () => assert.fail("hard revalidation must prevent execution after callback abort"),
      graph: { tasks: [{ id: "pending" }] },
      maxParallel: 1,
      signal: controller.signal
    });
    assert.equal(guarded.admissionPolicyFault, "lifecycle-invalid-select");
    assert.equal(guarded.settlements[0]?.settlement.kind, "cancelled-before-start");
  });
});

function schedulerGraph() {
  return schedulerGraphSnapshot(
    [
      schedulerGraphTask("source"),
      schedulerGraphTask("dependent", { dependsOn: ["source"] }),
      schedulerGraphTask("observer", { observes: ["source"] }),
      schedulerGraphTask("worker", { dependsOn: ["source"], scopeId: "limited" }),
      schedulerGraphTask("terminal", { dependsOn: ["worker"], scopeId: "limited" }),
      schedulerGraphTask("alpha")
    ],
    [{ activationTaskIds: ["worker"], id: "limited", maxParallel: 1, terminalTaskId: "terminal" }]
  );
}

function scopeGraph() {
  return schedulerGraphSnapshot(
    [
      schedulerGraphTask("worker", { scopeId: "scope" }),
      schedulerGraphTask("terminal", { dependsOn: ["worker"], scopeId: "scope" })
    ],
    [{ activationTaskIds: ["worker"], id: "scope", maxParallel: 1, terminalTaskId: "terminal" }]
  );
}

function scopeCapacityGraph() {
  return schedulerGraphSnapshot(
    [
      schedulerGraphTask("worker", { scopeId: "scope" }),
      schedulerGraphTask("peer", { scopeId: "scope" }),
      schedulerGraphTask("terminal", { dependsOn: ["worker", "peer"], scopeId: "scope" })
    ],
    [{ activationTaskIds: ["worker"], id: "scope", maxParallel: 1, terminalTaskId: "terminal" }]
  );
}

function acceptedState(result: AdmissionTransitionResult): AdmissionState {
  if (!result.accepted) assert.fail(`expected accepted transition: ${result.reason.kind}`);
  return result.state;
}

function deferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  while (!predicate()) await new Promise((resolve) => setTimeout(resolve, 0));
}
