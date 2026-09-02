import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defineConfig,
  type AdmissionPolicyContext,
  type AdmissionProposal
} from "../../project-definition/project-definition.ts";
import { run } from "../run.ts";
import { admissionSelectionPolicyFor } from "./custom-admission-policy.ts";
import { prepareTaskGraph } from "./graph.ts";
import { decideScheduler, type SchedulerSnapshot } from "./scheduler-decision.ts";
import { runTaskGraph } from "./scheduler.ts";
import { staticAdmissionSelectionPolicy } from "./admission-selection-policy.ts";
import { createDeferred, recordingLogger, waitFor } from "./task-engine.test-support.ts";
import type { DiagnosticObservation } from "../diagnostic-logging/logger.ts";

const EXECUTION_STARTED = Object.freeze({ kind: "execution-started" as const });

describe("task engine admission policy", () => {
  it("recomputes static select or wait from each frozen scheduler snapshot without reservation state", () => {
    const graph = prepareTaskGraph(
      {
        tasks: [
          { id: "first", admissionPriority: 1 },
          { id: "second", dependsOn: ["first"], admissionPriority: 9 }
        ]
      },
      1
    );
    const initial = decideScheduler(
      snapshot(graph),
      EXECUTION_STARTED,
      staticAdmissionSelectionPolicy
    );
    const capacityBlocked = decideScheduler(
      snapshot(graph, { pendingTaskIds: ["second"], runningTaskIds: ["first"] }),
      EXECUTION_STARTED,
      staticAdmissionSelectionPolicy
    );
    const afterSettlement = decideScheduler(
      snapshot(graph, {
        pendingTaskIds: ["second"],
        settledTasks: [{ kind: "completed", taskId: "first" }]
      }),
      EXECUTION_STARTED,
      staticAdmissionSelectionPolicy
    );

    assert.equal(initial.kind, "admit");
    assert.equal(initial.taskId, "first");
    assert.equal(capacityBlocked.kind, "await-running");
    assert.equal(afterSettlement.kind, "admit");
    assert.equal(afterSettlement.taskId, "second");
    assert.equal("reason" in initial, false);
    assert.equal("reservation" in initial, false);
    assert.equal("reservationUpdate" in initial, false);
  });

  it("adapts custom select from a detached frozen full-graph context", async () => {
    let received: AdmissionPolicyContext | undefined;
    const selected: string[] = [];
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: (context) => {
        if (received === undefined) received = context;
        const admissible = context.candidates.find((candidate) => candidate.canAdmit);
        if (admissible === undefined) return { kind: "wait" };
        return {
          kind: "select",
          taskId:
            context.candidates.find(
              (candidate) => candidate.canAdmit && candidate.taskId === "second"
            )?.taskId ?? admissible.taskId
        };
      }
    });
    if (policy === undefined) assert.fail("expected custom policy adapter");

    const graph = {
      tasks: [
        { id: "first", admissionPriority: 1, mutex: ["shared"], scopeId: "limited" },
        { id: "second", admissionPriority: 9 }
      ],
      scopes: [
        {
          activationTaskIds: ["first"],
          id: "limited",
          maxParallel: 1,
          terminalTaskId: "first"
        }
      ]
    };
    const graphRun = await runTaskGraph({
      admissionPolicy: policy,
      execute: (task) => {
        selected.push(task.id);
        return task.id;
      },
      graph,
      maxParallel: 1
    });

    assert.deepEqual(selected, ["second", "first"]);
    assert.equal(graphRun.admissionPolicyFault, undefined);
    assert.ok(received);
    const context = received;
    assert.deepEqual(context.graph.tasks, [
      {
        admissionPriority: 1,
        dependsOn: [],
        mutex: ["shared"],
        observes: [],
        scopeId: "limited",
        taskId: "first"
      },
      {
        admissionPriority: 9,
        dependsOn: [],
        mutex: [],
        observes: [],
        scopeId: null,
        taskId: "second"
      }
    ]);
    assert.deepEqual(context.graph.scopes, [
      {
        activationTaskIds: ["first"],
        id: "limited",
        maxParallel: 1,
        terminalTaskId: "first"
      }
    ]);
    assert.deepEqual(context.candidates, [
      { canAdmit: true, taskId: "first" },
      { canAdmit: true, taskId: "second" }
    ]);
    assert.deepEqual(context.capacity, { effectiveMaxParallel: 1, maxParallel: 1, running: 0 });
    assert.deepEqual(context.runtime, { abortRequested: false, cancelled: false });
    assert.equal(Object.isFrozen(context), true);
    assert.equal(Object.isFrozen(context.graph), true);
    assert.equal(Object.isFrozen(context.graph.tasks), true);
    assert.equal(Object.isFrozen(context.graph.tasks[0]), true);
    assert.equal(Object.isFrozen(context.candidates), true);
    assert.equal(context.graph.tasks instanceof Map, false);
    assert.equal(context.candidates instanceof Set, false);
    assert.equal("priority" in context, false);
    assert.throws(
      () => Reflect.apply(Array.prototype.push, context.graph.tasks, [context.graph.tasks[0]]),
      TypeError
    );
    assert.throws(
      () =>
        Reflect.apply(Array.prototype.push, context.candidates, [
          { canAdmit: true, taskId: "other" }
        ]),
      TypeError
    );
  });

  it("shares one frozen graph while exposing only decision-boundary measurement scalars", async () => {
    const contexts: AdmissionPolicyContext[] = [];
    let terminalTiming: unknown;
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: (context) => {
        contexts.push(context);
        if (contexts.length === 1) {
          assert.equal(
            Reflect.set(
              context.measurement.cumulative.timing as object,
              "availability",
              "unavailable"
            ),
            false
          );
        }
        const candidate = context.candidates.find((item) => item.canAdmit);
        return candidate === undefined
          ? { kind: "wait" }
          : { kind: "select", taskId: candidate.taskId };
      }
    });
    if (policy === undefined) assert.fail("expected custom policy adapter");

    await runTaskGraph({
      admissionPolicy: policy,
      execute: () => undefined,
      graph: { tasks: Array.from({ length: 40 }, (_, index) => ({ id: `task-${index}` })) },
      maxParallel: 40,
      performanceDiagnostics: Object.freeze({
        clock: Object.freeze({ now: () => 0 }),
        declarativeFingerprint: "measurement-sharing"
      }),
      measurementHooks: [
        (context) => {
          terminalTiming = context.rawMeasurement.timing;
        }
      ]
    });

    assert.equal(contexts.length, 40);
    assert.equal(new Set(contexts.map((context) => context.graph)).size, 1);
    assert.equal(contexts[0]?.measurement.measurementCount, 0);
    assert.equal(contexts[0]?.measurement.measurementAt(0), undefined);
    assert.deepEqual(contexts[1]?.measurement.measurementAt(0), {
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
      effects: [{ kind: "admitted", taskId: "task-0" }],
      kind: "select",
      sequence: 1,
      taskId: "task-0"
    });
    assert.equal(contexts[1]?.measurement.measurementCount, 1);
    assert.equal(contexts[1]?.measurement.measurementAt(1), undefined);
    assert.equal(contexts[0]?.measurement.measurementAt(39), undefined);
    assert.equal(contexts[0]?.measurement.cumulative.discrete.admittedCount, 0);
    assert.equal("admissions" in (contexts[39]?.measurement.cumulative.timingFacts ?? {}), false);
    assert.equal(Object.isFrozen(contexts[1]?.measurement), true);
    assert.equal(Object.isFrozen(contexts[1]?.measurement.measurementAt), true);
    assert.equal(Object.isFrozen(contexts[1]?.measurement.measurementAt(0)), true);
    const firstTiming = contexts[0]?.measurement.cumulative.timing;
    assert.equal(Object.isFrozen(firstTiming), true);
    assert.equal(Reflect.set(firstTiming as object, "availability", "unavailable"), false);
    assert.deepEqual(firstTiming, { availability: "available" });
    assert.deepEqual(terminalTiming, { availability: "available" });
  });

  it("commits a settled running-cohort interval before the next custom policy callback", async () => {
    let now = 0;
    const started = createDeferred<void>();
    const release = createDeferred<void>();
    const contexts: AdmissionPolicyContext[] = [];
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: (context) => {
        contexts.push(context);
        const candidate = context.candidates.find((item) => item.canAdmit);
        return candidate === undefined
          ? { kind: "wait" }
          : { kind: "select", taskId: candidate.taskId };
      }
    });
    if (policy === undefined) assert.fail("expected custom policy adapter");

    const settled = runTaskGraph({
      admissionPolicy: policy,
      execute: async (task) => {
        if (task.id === "first") {
          started.resolve();
          await release.promise;
        }
      },
      graph: { tasks: [{ id: "first" }, { id: "second" }] },
      maxParallel: 1,
      performanceDiagnostics: Object.freeze({
        clock: Object.freeze({ now: () => now }),
        declarativeFingerprint: "wait-settlement"
      })
    });
    await started.promise;
    now = 9;
    release.resolve();
    await settled;

    const afterSettlement = contexts.at(-1);
    assert.equal(afterSettlement?.measurement.measurementCount, 2);
    assert.equal(afterSettlement?.measurement.measurementAt(2), undefined);
    assert.deepEqual(
      afterSettlement?.measurement.measurementAt(
        (afterSettlement?.measurement.measurementCount ?? 1) - 1
      ),
      {
        interval: {
          availability: "available",
          contribution: {
            admissiblePendingTaskMs: 0,
            acceptedWaitMs: 9,
            capacityBlockedTaskMs: 9,
            effectiveCapacitySlotMs: 9,
            mutexBlockedTaskMs: 0,
            rootCapacitySlotMs: 9,
            taskSlotMs: 9
          }
        },
        effects: [{ kind: "settled", settlementKind: "completed", taskId: "first" }],
        kind: "wait",
        sequence: 2,
        taskId: null
      }
    );
  });

  it("retains custom action effects while unavailable clocks omit interval contributions", async () => {
    const clockFailures = [
      {
        reason: "clock-threw" as const,
        sample: () => {
          throw new Error("clock failure");
        }
      },
      { reason: "clock-non-finite" as const, sample: () => Number.NaN },
      { reason: "clock-backward" as const, sample: () => -1 }
    ];

    for (const failure of clockFailures) {
      let samples = 0;
      const contexts: AdmissionPolicyContext[] = [];
      const policy = admissionSelectionPolicyFor({
        kind: "custom",
        proposeAdmission: (context) => {
          contexts.push(context);
          const candidate = context.candidates.find((item) => item.canAdmit);
          return candidate === undefined
            ? { kind: "wait" }
            : { kind: "select", taskId: candidate.taskId };
        }
      });
      if (policy === undefined) assert.fail("expected custom policy adapter");

      await runTaskGraph({
        admissionPolicy: policy,
        execute: () => undefined,
        graph: { tasks: [{ id: "first" }, { id: "second" }] },
        maxParallel: 2,
        performanceDiagnostics: Object.freeze({
          clock: Object.freeze({
            now: () => {
              samples += 1;
              return samples === 8 ? failure.sample() : 0;
            }
          }),
          declarativeFingerprint: `unavailable-${failure.reason}`
        })
      });

      const observation = contexts[1]?.measurement.measurementAt(0);
      assert.deepEqual(observation, {
        effects: [{ kind: "admitted", taskId: "first" }],
        interval: { availability: "unavailable", reason: failure.reason },
        kind: "select",
        sequence: 1,
        taskId: "first"
      });
      assert.equal(observation?.interval.availability, "unavailable");
      if (observation?.interval.availability === "unavailable") {
        assert.equal("contribution" in observation.interval, false);
      }
    }
  });

  it("preserves the caller closure across overlapping custom Runs without a Scheduler callback lock", async () => {
    let callbackCalls = 0;
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: (context) => {
        callbackCalls += 1;
        const candidate = context.candidates.find((item) => item.canAdmit);
        return candidate === undefined
          ? { kind: "wait" }
          : { kind: "select", taskId: candidate.taskId };
      }
    });
    if (policy === undefined) assert.fail("expected custom policy adapter");

    await Promise.all([
      runTaskGraph({
        admissionPolicy: policy,
        execute: async () => undefined,
        graph: { tasks: [{ id: "first" }] },
        maxParallel: 1
      }),
      runTaskGraph({
        admissionPolicy: policy,
        execute: async () => undefined,
        graph: { tasks: [{ id: "second" }] },
        maxParallel: 1
      })
    ]);

    assert.equal(callbackCalls, 2);
  });

  it("fails custom policy faults without fallback, cancels pending work, and drains admitted work", async () => {
    const started = createDeferred<void>();
    const calls: string[] = [];
    let proposals = 0;
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: () => {
        proposals += 1;
        return proposals === 1 ? { kind: "select", taskId: "started" } : malformedWaitProposal();
      }
    });
    if (policy === undefined) assert.fail("expected custom policy adapter");

    const running = runTaskGraph({
      admissionPolicy: policy,
      execute: async (task) => {
        calls.push(task.id);
        if (task.id === "started") await started.promise;
        return task.id;
      },
      graph: { tasks: [{ id: "started" }, { id: "pending" }] },
      maxParallel: 2
    });
    await waitFor(() => calls.includes("started"));
    started.resolve();
    const graphRun = await running;

    assert.deepEqual(calls, ["started"]);
    assert.equal(graphRun.admissionPolicyFault, "malformed-proposal");
    assert.equal(graphRun.cancelled, true);
    assert.equal(
      graphRun.settlements.find(({ task }) => task.id === "started")?.settlement.kind,
      "completed"
    );
    assert.equal(
      graphRun.settlements.find(({ task }) => task.id === "pending")?.settlement.kind,
      "cancelled-before-start"
    );
  });

  it("classifies every bounded custom fault without exposing callback values", async () => {
    const immediateFaults: readonly Readonly<{
      readonly category:
        | "callback-threw"
        | "thenable-proposal"
        | "malformed-proposal"
        | "non-candidate-select"
        | "undrainable-wait";
      readonly proposeAdmission: () => AdmissionProposal;
    }>[] = [
      {
        category: "callback-threw",
        proposeAdmission: () => {
          throw new Error("secret");
        }
      },
      { category: "thenable-proposal", proposeAdmission: thenableWaitProposal },
      { category: "malformed-proposal", proposeAdmission: malformedWaitProposal },
      {
        category: "non-candidate-select",
        proposeAdmission: () => ({ kind: "select", taskId: "missing" })
      },
      { category: "undrainable-wait", proposeAdmission: () => ({ kind: "wait" }) }
    ];

    for (const fault of immediateFaults) {
      const graphRun = await runWithCustomProposal(fault.proposeAdmission, {
        tasks: [{ id: "pending" }]
      });
      assert.equal(graphRun.admissionPolicyFault, fault.category);
      assert.equal(graphRun.settlements[0]?.settlement.kind, "cancelled-before-start");
    }

    let proposals = 0;
    const capacityRun = await runWithCustomProposal(
      () => {
        proposals += 1;
        return proposals === 1
          ? { kind: "select", taskId: "started" }
          : { kind: "select", taskId: "pending" };
      },
      { tasks: [{ id: "started" }, { id: "pending" }] }
    );
    assert.equal(capacityRun.admissionPolicyFault, "capacity-invalid-select");

    const controller = new AbortController();
    const lifecycleRun = await runWithCustomProposal(
      () => {
        controller.abort();
        return { kind: "select", taskId: "pending" };
      },
      { tasks: [{ id: "pending" }] },
      controller.signal
    );
    assert.equal(lifecycleRun.admissionPolicyFault, "lifecycle-invalid-select");

    const observations: DiagnosticObservation[] = [];
    const policy = admissionSelectionPolicyFor({
      kind: "custom",
      proposeAdmission: () => {
        const proposal: AdmissionProposal = { kind: "wait" };
        Reflect.set(proposal, "raw", { caller: "secret" });
        return proposal;
      }
    });
    if (policy === undefined) assert.fail("expected custom policy adapter");
    await runTaskGraph({
      admissionPolicy: policy,
      diagnosticLogger: recordingLogger(observations),
      execute: () => undefined,
      graph: { tasks: [{ id: "pending" }] },
      maxParallel: 1
    });
    const diagnostic = observations.find(
      (observation) => observation.event === "scheduler.admission-policy-failed"
    );
    assert.deepEqual(diagnostic?.details, { category: "malformed-proposal" });
    assert.equal(JSON.stringify(diagnostic).includes("secret"), false);
  });

  it("drains an admitted public Check before returning an admission policy fault", async () => {
    const started = createDeferred<void>();
    const release = createDeferred<void>();
    const executions: string[] = [];
    let proposals = 0;
    let resolved = false;
    const resultPromise = run(
      defineConfig({
        checks: [
          {
            checkId: "started",
            displayName: "Started",
            execution: async () => {
              executions.push("started");
              started.resolve();
              await release.promise;
              return { status: "passed", data: {} };
            }
          },
          {
            checkId: "pending",
            displayName: "Pending",
            execution: () => {
              executions.push("pending");
              return { status: "passed", data: {} };
            }
          }
        ],
        outputs: {
          diagnosticLogging: { enabled: false },
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        scheduler: {
          admissionPolicy: {
            kind: "custom",
            proposeAdmission: () => {
              proposals += 1;
              return proposals === 1
                ? { kind: "select", taskId: "started" }
                : malformedWaitProposal();
            }
          },
          maxParallel: 2
        }
      })
    );
    void resultPromise.then(
      () => {
        resolved = true;
      },
      () => undefined
    );

    await started.promise;
    await Promise.resolve();
    assert.equal(resolved, false);
    assert.deepEqual(executions, ["started"]);
    release.resolve();
    const result = await resultPromise;

    assert.equal(result.kind, "execution");
    if (result.kind !== "execution") return;
    assert.deepEqual(result.diagnostic, { code: "admission-policy-failed" });
    assert.deepEqual(executions, ["started"]);
    assert.deepEqual(Object.keys(result).sort(), [
      "declarativeFingerprint",
      "definitionWarnings",
      "diagnostic",
      "kind",
      "outputs"
    ]);
    assert.equal("checkMessages" in result, false);
    assert.equal("checkDurations" in result, false);
    assert.equal("timing" in result, false);
  });

  it("returns the dedicated execution result for a custom callback failure", async () => {
    let executions = 0;
    const result = await run(
      defineConfig({
        checks: [
          {
            checkId: "never-started",
            displayName: "Never started",
            execution: () => {
              executions += 1;
              return { status: "passed", data: {} };
            }
          }
        ],
        outputs: {
          machinePublication: { enabled: false },
          progressRendering: { enabled: false }
        },
        scheduler: {
          admissionPolicy: {
            kind: "custom",
            proposeAdmission: () => {
              throw new Error("caller detail must not escape");
            }
          },
          maxParallel: 1
        }
      })
    );

    assert.equal(executions, 0);
    assert.equal(result.kind, "execution");
    if (result.kind === "execution") {
      assert.deepEqual(result.diagnostic, { code: "admission-policy-failed" });
    }
  });
});

function snapshot(
  graph: ReturnType<typeof prepareTaskGraph>,
  overrides: Partial<SchedulerSnapshot> = {}
): SchedulerSnapshot {
  return Object.freeze({
    activeScopeIds: [],
    graph,
    isAbortRequested: false,
    isCancelled: false,
    maxParallel: 1,
    pendingTaskIds: graph.tasks.map((task) => task.id),
    runningMutexes: [],
    runningTaskIds: [],
    settledTasks: [],
    ...overrides
  });
}

function runWithCustomProposal(
  proposeAdmission: () => AdmissionProposal,
  graph: { readonly tasks: readonly { readonly id: string }[] },
  signal?: AbortSignal
) {
  const policy = admissionSelectionPolicyFor({
    kind: "custom",
    proposeAdmission
  });
  if (policy === undefined) assert.fail("expected custom policy adapter");
  return runTaskGraph({
    admissionPolicy: policy,
    execute: () => undefined,
    graph,
    maxParallel: 1,
    signal
  });
}

function malformedWaitProposal(): AdmissionProposal {
  const proposal: AdmissionProposal = { kind: "wait" };
  Reflect.set(proposal, "extra", true);
  return proposal;
}

function thenableWaitProposal(): AdmissionProposal {
  const proposal: AdmissionProposal = { kind: "wait" };
  Reflect.set(proposal, "then", () => undefined);
  return proposal;
}
