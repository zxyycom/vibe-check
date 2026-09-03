import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { AdmissionPolicyContext } from "../../project-definition/project-definition.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import {
  createAdmissionGraph,
  type AdmissionState,
  type AdmissionTransitionResult
} from "../../index.ts";
import { admissionSelectionPolicyFor } from "./custom-admission-policy.ts";
import {
  admissionStateForCore,
  compilePreparedAdmissionGraph,
  createAdmissionCoreFromSchedulerSnapshot,
  createInitialAdmissionCoreState,
  selectAdmissionCore,
  settleRunningAdmissionCore,
  validateAdmissionCoreSelection,
  type AdmissionCoreState
} from "./admission-core.ts";
import { admissionCoreTraceProjectionFor, traceAdmissionCore } from "./admission-core-trace.ts";
import { prepareTaskGraph } from "./graph.ts";
import { runTaskGraph } from "./scheduler.ts";
import { recordingLogger } from "./task-engine.test-support.ts";

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

    const graph = createAdmissionGraph({ graph: schedulerGraph(), maxParallel: 2 });
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
        graph: admissionSnapshot([
          admissionTask("left", { mutex: ["shared"] }),
          admissionTask("right", { mutex: ["shared"] })
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
        graph: admissionSnapshot([admissionTask("first"), admissionTask("second")]),
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

  it("keeps duplicate blocker payloads and global active-scope capacity for every candidate", () => {
    const duplicateRelations = createAdmissionGraph({
      graph: admissionSnapshot([
        admissionTask("z"),
        admissionTask("a"),
        admissionTask("dependent", { dependsOn: ["z", "z", "a"] }),
        admissionTask("holder", { mutex: ["z-lock", "z-lock", "a-lock"] }),
        admissionTask("contender", { mutex: ["z-lock", "z-lock", "a-lock"] })
      ]),
      maxParallel: 2
    }).initialState();
    assert.deepEqual(duplicateRelations.validateSelection("dependent"), {
      accepted: false,
      reason: { kind: "depends-on-pending", taskIds: ["a", "z", "z"] }
    });
    const held = acceptedState(duplicateRelations.select("holder"));
    assert.deepEqual(held.validateSelection("contender"), {
      accepted: false,
      reason: { kind: "mutex-held", mutexIds: ["a-lock", "z-lock", "z-lock"] }
    });

    const scope = createAdmissionGraph({
      graph: admissionSnapshot(
        [
          admissionTask("activate", { scopeId: "limited" }),
          admissionTask("inside", { scopeId: "limited" }),
          admissionTask("terminal", { dependsOn: ["activate", "inside"], scopeId: "limited" }),
          admissionTask("outside"),
          admissionTask("unscoped")
        ],
        [
          {
            activationTaskIds: ["activate"],
            id: "limited",
            maxParallel: 2,
            terminalTaskId: "terminal"
          }
        ]
      ),
      maxParallel: 3
    }).initialState();
    const active = acceptedState(scope.select("activate"));
    const globallyFull = acceptedState(active.select("outside"));
    const expected = {
      accepted: false as const,
      reason: {
        kind: "scope-capacity-reached" as const,
        maxParallel: 2,
        running: 2,
        scopeId: "limited"
      }
    };
    assert.deepEqual(globallyFull.validateSelection("inside"), expected);
    assert.deepEqual(globallyFull.validateSelection("unscoped"), expected);
  });

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

  it("traces public and private binary/failed/cancellation transitions through one reducer", async () => {
    const planned = prepareTaskGraph(
      { tasks: [{ id: "source" }, { id: "dependent", dependsOn: ["source"] }, { id: "other" }] },
      2
    );
    const trace = traceAdmissionCore(
      createInitialAdmissionCoreState(compilePreparedAdmissionGraph(planned, 2)),
      [
        { kind: "select", taskId: "source" },
        { kind: "settle-running", settlementKind: "failed", taskId: "source" },
        { kind: "select", taskId: "other" },
        { kind: "cancel-pending" }
      ]
    );

    assert.deepEqual(
      trace.map((step) => step.result),
      [
        { accepted: true, reasonKind: null },
        { accepted: true, reasonKind: null },
        { accepted: true, reasonKind: null },
        { accepted: true, reasonKind: null }
      ]
    );
    assert.deepEqual(trace[1]?.effects, [
      { kind: "settled", settlementKind: "failed", taskId: "source" },
      {
        dependencyIds: ["source"],
        kind: "settled",
        settlementKind: "blocked",
        taskId: "dependent"
      }
    ]);
    assert.deepEqual(
      trace[1]?.post.validation.find((entry) => entry.taskId === "dependent"),
      {
        taskId: "dependent",
        value: { accepted: false, reason: { kind: "not-pending", status: "settled" } }
      }
    );
    assert.deepEqual(trace[3]?.post.inspection.nextBoundary, "wait");

    const mutexTrace = traceFromTaskGraph(
      {
        tasks: [
          { id: "left", mutex: ["shared"] },
          { id: "right", mutex: ["shared"] }
        ]
      },
      2,
      [{ kind: "select", taskId: "left" }]
    );
    assert.deepEqual(traceValidation(mutexTrace[0], "right"), {
      accepted: false,
      reason: { kind: "mutex-held", mutexIds: ["shared"] }
    });

    const rootCapacityTrace = traceFromTaskGraph(
      { tasks: [{ id: "first" }, { id: "second" }] },
      1,
      [{ kind: "select", taskId: "first" }]
    );
    assert.deepEqual(traceValidation(rootCapacityTrace[0], "second"), {
      accepted: false,
      reason: { kind: "root-capacity-reached", maxParallel: 1, running: 1 }
    });

    const scopeCapacityTrace = traceFromTaskGraph(
      {
        scopes: [
          { activationTaskIds: ["worker"], id: "scope", maxParallel: 1, terminalTaskId: "terminal" }
        ],
        tasks: [
          { id: "worker", scopeId: "scope" },
          { id: "peer", scopeId: "scope" },
          { id: "terminal", dependsOn: ["worker", "peer"], scopeId: "scope" }
        ]
      },
      2,
      [{ kind: "select", taskId: "worker" }]
    );
    assert.deepEqual(traceValidation(scopeCapacityTrace[0], "peer"), {
      accepted: false,
      reason: { kind: "scope-capacity-reached", maxParallel: 1, running: 1, scopeId: "scope" }
    });

    const completeTrace = traceFromTaskGraph({ tasks: [{ id: "only" }] }, 1, [
      { kind: "select", taskId: "only" },
      { kind: "settle", outcome: "satisfied", taskId: "only" }
    ]);
    assert.equal(completeTrace[1]?.post.inspection.nextBoundary, "complete");

    const forcedOrderTrace = traceFromTaskGraph(
      {
        tasks: [
          { id: "source" },
          { id: "first-dependent", dependsOn: ["source"] },
          { id: "last-dependent", dependsOn: ["source"] }
        ]
      },
      1,
      [
        { kind: "select", taskId: "source" },
        { kind: "settle-running", settlementKind: "failed", taskId: "source" }
      ]
    );
    assert.deepEqual(
      forcedOrderTrace[1]?.effects.map((effect) => effect.taskId),
      ["source", "last-dependent", "first-dependent"]
    );

    const liveGraph = prepareTaskGraph(
      { tasks: [{ id: "running" }, { id: "dependent", dependsOn: ["running"] }] },
      1
    );
    const liveTrace = traceAdmissionCore(
      createAdmissionCoreFromSchedulerSnapshot(compilePreparedAdmissionGraph(liveGraph, 1), {
        activeScopeIds: [],
        graph: liveGraph,
        isAbortRequested: false,
        isCancelled: false,
        maxParallel: 1,
        pendingTaskIds: ["dependent"],
        runningMutexes: [],
        runningTaskIds: ["running"],
        settledTasks: []
      }),
      [{ kind: "settle-running", settlementKind: "failed", taskId: "running" }]
    );
    assert.deepEqual(liveTrace[0]?.pre.inspection.runningTaskIds, ["running"]);
    assert.deepEqual(
      liveTrace[0]?.effects.map((effect) => effect.taskId),
      ["running", "dependent"]
    );

    const realRun = await runTaskGraph({
      execute: (task) => {
        if (task.id === "source") throw new Error("failed source");
        return task.id;
      },
      graph: {
        tasks: [{ id: "source" }, { id: "dependent", dependsOn: ["source"] }, { id: "other" }]
      },
      maxParallel: 2
    });
    assert.deepEqual(
      realRun.settlements.map(({ settlement, task }) => ({
        kind: settlement.kind,
        taskId: task.id
      })),
      [
        { kind: "failed", taskId: "source" },
        { kind: "blocked", taskId: "dependent" },
        { kind: "completed", taskId: "other" }
      ]
    );
  });

  it("replays canonical failed and forced effects through shell diagnostics and measurement", async () => {
    const graph = {
      tasks: [
        { id: "source" },
        { id: "first-dependent", dependsOn: ["source"] },
        { id: "last-dependent", dependsOn: ["source"] },
        { id: "tail" }
      ]
    };
    const planned = prepareTaskGraph(graph, 1);
    const coreTrace = traceAdmissionCore(
      createInitialAdmissionCoreState(compilePreparedAdmissionGraph(planned, 1)),
      [
        { kind: "select", taskId: "source" },
        { kind: "settle-running", settlementKind: "failed", taskId: "source" },
        { kind: "select", taskId: "tail" },
        { kind: "settle-running", settlementKind: "completed", taskId: "tail" }
      ]
    );
    const expectedEffects = coreTrace.flatMap((step) =>
      step.effects.map((effect, index) => ({
        effect,
        projection: step.effectProjections[index]
      }))
    );
    const shellEffects: typeof expectedEffects = [];
    const contexts: AdmissionPolicyContext[] = [];
    const observations: DiagnosticObservation[] = [];

    const run = await runTaskGraph({
      admissionPolicy: admissionSelectionPolicyFor((context) => {
        contexts.push(context);
        const candidate = context.candidates.find((item) => item.canAdmit);
        if (candidate === undefined) return { kind: "wait" };
        assert.equal(context.admissionState.validateSelection(candidate.taskId).accepted, true);
        return { kind: "select", taskId: candidate.taskId };
      }),
      diagnosticLogger: recordingLogger(observations),
      execute: (task) => {
        if (task.id === "source") throw new Error("expected source failure");
        return task.id;
      },
      graph,
      maxParallel: 1,
      onAdmissionCoreEffect: ({ effect, state }) => {
        shellEffects.push({ effect, projection: admissionCoreTraceProjectionFor(state) });
      },
      performanceDiagnostics: Object.freeze({
        clock: Object.freeze({ now: () => 0 }),
        declarativeFingerprint: "canonical-effect-replay"
      })
    });

    assert.deepEqual(shellEffects, expectedEffects);
    const sourceSettlementMeasurement = contexts
      .flatMap((context) =>
        Array.from({ length: context.measurement.measurementCount }, (_, index) =>
          context.measurement.measurementAt(index)
        )
      )
      .find((measurement) =>
        measurement?.effects.some(
          (effect) => effect.kind === "settled" && effect.taskId === "source"
        )
      );
    assert.deepEqual(sourceSettlementMeasurement, {
      interval: {
        availability: "available",
        contribution: {
          admissiblePendingTaskMs: 0,
          acceptedWaitMs: 0,
          capacityBlockedTaskMs: 0,
          effectiveCapacitySlotMs: 0,
          mutexBlockedTaskMs: 0,
          rootCapacitySlotMs: 0,
          taskSlotMs: 0
        }
      },
      effects: [
        { kind: "settled", settlementKind: "failed", taskId: "source" },
        { kind: "settled", settlementKind: "blocked", taskId: "last-dependent" },
        { kind: "settled", settlementKind: "blocked", taskId: "first-dependent" }
      ],
      kind: "wait",
      sequence: 2,
      taskId: null
    });
    assert.deepEqual(
      observations.flatMap((observation) => {
        const details = observation.details;
        if (
          observation.event !== "scheduler.decision" ||
          details === null ||
          typeof details !== "object"
        )
          return [];
        const kind: unknown = Reflect.get(details, "kind");
        if (kind !== "settle-blocked") return [];
        const taskId: unknown = Reflect.get(details, "taskId");
        const blockers: unknown = Reflect.get(details, "blockers");
        if (blockers === null || typeof blockers !== "object") return [];
        const dependency: unknown = Reflect.get(blockers, "dependency");
        return typeof taskId === "string" && typeof dependency === "number"
          ? [Object.freeze({ dependency, taskId })]
          : [];
      }),
      [
        { dependency: 1, taskId: "last-dependent" },
        { dependency: 0, taskId: "first-dependent" }
      ]
    );
    assert.deepEqual(
      run.settlements.map(({ settlement, task }) => ({ kind: settlement.kind, taskId: task.id })),
      [
        { kind: "failed", taskId: "source" },
        { kind: "blocked", taskId: "first-dependent" },
        { kind: "blocked", taskId: "last-dependent" },
        { kind: "completed", taskId: "tail" }
      ]
    );

    let terminalLastSettledTaskId: string | null | undefined;
    await runTaskGraph({
      admissionPolicy: admissionSelectionPolicyFor(() => ({ kind: "select", taskId: "source" })),
      execute: () => {
        throw new Error("expected source failure");
      },
      graph: { tasks: graph.tasks.slice(0, 3) },
      maxParallel: 1,
      measurementHooks: [
        (context) => {
          terminalLastSettledTaskId = context.rawMeasurement.discrete.lastSettledTaskId;
        }
      ],
      performanceDiagnostics: Object.freeze({
        clock: Object.freeze({ now: () => 0 }),
        declarativeFingerprint: "canonical-effect-last-settled"
      })
    });
    assert.equal(terminalLastSettledTaskId, "first-dependent");
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
  return Object.freeze({
    scopes: Object.freeze([
      Object.freeze({
        activationTaskIds: Object.freeze(["worker"]),
        id: "limited",
        maxParallel: 1,
        terminalTaskId: "terminal"
      })
    ]),
    tasks: Object.freeze([
      Object.freeze({
        admissionPriority: 0,
        dependsOn: Object.freeze([]),
        mutex: Object.freeze([]),
        observes: Object.freeze([]),
        scopeId: null,
        taskId: "source"
      }),
      Object.freeze({
        admissionPriority: 0,
        dependsOn: Object.freeze(["source"]),
        mutex: Object.freeze([]),
        observes: Object.freeze([]),
        scopeId: null,
        taskId: "dependent"
      }),
      Object.freeze({
        admissionPriority: 0,
        dependsOn: Object.freeze([]),
        mutex: Object.freeze([]),
        observes: Object.freeze(["source"]),
        scopeId: null,
        taskId: "observer"
      }),
      Object.freeze({
        admissionPriority: 0,
        dependsOn: Object.freeze(["source"]),
        mutex: Object.freeze([]),
        observes: Object.freeze([]),
        scopeId: "limited",
        taskId: "worker"
      }),
      Object.freeze({
        admissionPriority: 0,
        dependsOn: Object.freeze(["worker"]),
        mutex: Object.freeze([]),
        observes: Object.freeze([]),
        scopeId: "limited",
        taskId: "terminal"
      }),
      Object.freeze({
        admissionPriority: 0,
        dependsOn: Object.freeze([]),
        mutex: Object.freeze([]),
        observes: Object.freeze([]),
        scopeId: null,
        taskId: "alpha"
      })
    ])
  });
}

function scopeGraph() {
  return Object.freeze({
    scopes: Object.freeze([
      Object.freeze({
        activationTaskIds: Object.freeze(["worker"]),
        id: "scope",
        maxParallel: 1,
        terminalTaskId: "terminal"
      })
    ]),
    tasks: Object.freeze([
      Object.freeze({
        admissionPriority: 0,
        dependsOn: Object.freeze([]),
        mutex: Object.freeze([]),
        observes: Object.freeze([]),
        scopeId: "scope",
        taskId: "worker"
      }),
      Object.freeze({
        admissionPriority: 0,
        dependsOn: Object.freeze(["worker"]),
        mutex: Object.freeze([]),
        observes: Object.freeze([]),
        scopeId: "scope",
        taskId: "terminal"
      })
    ])
  });
}

function scopeCapacityGraph() {
  return admissionSnapshot(
    [
      admissionTask("worker", { scopeId: "scope" }),
      admissionTask("peer", { scopeId: "scope" }),
      admissionTask("terminal", { dependsOn: ["worker", "peer"], scopeId: "scope" })
    ],
    [
      {
        activationTaskIds: ["worker"],
        id: "scope",
        maxParallel: 1,
        terminalTaskId: "terminal"
      }
    ]
  );
}

function admissionSnapshot(
  tasks: readonly ReturnType<typeof admissionTask>[],
  scopes: readonly Readonly<{
    readonly activationTaskIds: readonly string[];
    readonly id: string;
    readonly maxParallel: number;
    readonly terminalTaskId: string;
  }>[] = []
) {
  return { scopes, tasks };
}

function admissionTask(
  taskId: string,
  overrides: Readonly<
    Partial<{
      readonly dependsOn: readonly string[];
      readonly mutex: readonly string[];
      readonly observes: readonly string[];
      readonly scopeId: string | null;
    }>
  > = {}
) {
  return {
    admissionPriority: 0,
    dependsOn: [],
    mutex: [],
    observes: [],
    scopeId: null,
    taskId,
    ...overrides
  };
}

function acceptedState(result: AdmissionTransitionResult): AdmissionState {
  if (!result.accepted) assert.fail(`expected accepted transition: ${result.reason.kind}`);
  return result.state;
}

function traceFromTaskGraph(
  graph: Parameters<typeof prepareTaskGraph>[0],
  maxParallel: number,
  actions: Parameters<typeof traceAdmissionCore>[1]
) {
  const planned = prepareTaskGraph(graph, maxParallel);
  return traceAdmissionCore(
    createInitialAdmissionCoreState(compilePreparedAdmissionGraph(planned, maxParallel)),
    actions
  );
}

function traceValidation(
  step: ReturnType<typeof traceAdmissionCore>[number] | undefined,
  taskId: string
) {
  return step?.post.validation.find((entry) => entry.taskId === taskId)?.value;
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
