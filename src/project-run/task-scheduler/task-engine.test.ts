import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runTaskGraph } from "./scheduler.ts";
import { prepareTaskGraph, validateTaskGraph, type TaskGraph } from "./graph.ts";
import {
  decideScheduler,
  type SchedulerDecision,
  type SchedulerSnapshot
} from "./scheduler-decision.ts";
import type { DiagnosticLogger, DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import {
  completedValues,
  continuationPriorityGraph,
  createDeferred,
  delay,
  failureGraph,
  noActivationGraph,
  rootBudgetGraph,
  settlementFor,
  tighteningScopeGraph,
  waitFor
} from "./task-engine.test-support.ts";

function recordingLogger(observations: DiagnosticObservation[]): DiagnosticLogger {
  return Object.freeze({
    close: () => "disabled" as const,
    observe: (observation: DiagnosticObservation): void => {
      observations.push(observation);
    }
  });
}

function recordedSchedulerDecisions(
  observations: readonly DiagnosticObservation[]
): readonly SchedulerDecision[] {
  assert.ok(observations.length > 0, "expected scheduler decisions to be observed");
  const decisions: SchedulerDecision[] = [];
  for (const observation of observations) {
    assert.equal(observation.scope, "SCHEDULER");
    assert.equal(observation.event, "scheduler.decision");
    assertNoUndefinedValue(observation.details);
    if (!isSchedulerDecision(observation.details)) {
      assert.fail("scheduler observation did not contain a SchedulerDecision");
    }
    decisions.push(observation.details);
  }
  return Object.freeze(decisions);
}

function assertNoUndefinedValue(value: unknown): void {
  assert.notEqual(value, undefined);
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoUndefinedValue(item);
    return;
  }
  for (const item of Object.values(value)) assertNoUndefinedValue(item);
}

function isSchedulerDecision(value: unknown): value is SchedulerDecision {
  if (!isRecord(value)) return false;
  const kind = value["kind"];
  return (
    kind === "admit" ||
    kind === "await-running" ||
    kind === "settle-blocked" ||
    kind === "cancel-pending" ||
    kind === "complete"
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function decisionFor(
  graph: TaskGraph,
  input: Readonly<{
    readonly activeScopeIds?: readonly string[];
    readonly isAbortRequested?: boolean;
    readonly isCancelled?: boolean;
    readonly maxParallel: number;
    readonly pendingTaskIds?: readonly string[];
    readonly reservationTaskId?: string;
    readonly runningMutexes?: readonly string[];
    readonly runningTaskIds?: readonly string[];
    readonly settledTasks?: SchedulerSnapshot["settledTasks"];
  }>
): SchedulerDecision {
  return decideScheduler(
    Object.freeze({
      activeScopeIds: Object.freeze(input.activeScopeIds ?? []),
      graph: prepareTaskGraph(graph, input.maxParallel),
      isAbortRequested: input.isAbortRequested ?? false,
      isCancelled: input.isCancelled ?? false,
      maxParallel: input.maxParallel,
      pendingTaskIds: Object.freeze(input.pendingTaskIds ?? graph.tasks.map((task) => task.id)),
      reservationTaskId: input.reservationTaskId,
      runningMutexes: Object.freeze(input.runningMutexes ?? []),
      runningTaskIds: Object.freeze(input.runningTaskIds ?? []),
      settledTasks: Object.freeze(input.settledTasks ?? [])
    }),
    Object.freeze({ kind: "execution-started" })
  );
}

describe("static task engine", () => {
  it("validates static task identity dependency and scope structure before execution", async () => {
    assert.throws(
      () => validateTaskGraph({ tasks: [], dependOn: [] }),
      /task graph has unknown property: dependOn/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [{ id: "script-task", command: "bun" }]
        }),
      /task graph tasks\[0\] has unknown property: command/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [{ id: "terminal", scopeId: "scope" }],
          scopes: [
            {
              id: "scope",
              maxParallel: 1,
              activationTaskIds: [],
              terminalTaskId: "terminal",
              terminal: "terminal"
            }
          ]
        }),
      /task graph scopes\[0\] has unknown property: terminal/
    );
    assert.throws(
      () => validateTaskGraph({ tasks: [{ id: "same" }, { id: "same" }] }),
      /duplicate task id: same/
    );
    assert.throws(
      () => validateTaskGraph({ tasks: [{ id: "dependent", dependsOn: ["missing"] }] }),
      /task dependent depends on unknown task missing/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [
            { id: "one", dependsOn: ["two"] },
            { id: "two", dependsOn: ["one"] }
          ]
        }),
      /task dependency cycle includes/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [{ id: "terminal", scopeId: "scope" }],
          scopes: [
            {
              id: "scope",
              maxParallel: 1,
              activationTaskIds: ["other"],
              terminalTaskId: "terminal"
            }
          ]
        }),
      /activation task must belong to the scope: other/
    );
    assert.throws(
      () =>
        validateTaskGraph({
          tasks: [
            { id: "work", scopeId: "scope" },
            { id: "terminal", scopeId: "scope" }
          ],
          scopes: [
            {
              id: "scope",
              maxParallel: 1,
              activationTaskIds: ["work"],
              terminalTaskId: "terminal"
            }
          ]
        }),
      /terminal task must depend on scoped task work/
    );
    await assert.rejects(
      () =>
        runTaskGraph({
          graph: {
            tasks: [{ id: "terminal", scopeId: "scope" }],
            scopes: [
              {
                id: "scope",
                maxParallel: 2,
                activationTaskIds: [],
                terminalTaskId: "terminal"
              }
            ]
          },
          maxParallel: 1,
          execute: () => undefined
        }),
      /scope scope maxParallel exceeds task engine maxParallel/
    );
  });

  it("uses one root budget for dependency order and named mutex admission", async () => {
    const events: string[] = [];
    const observations: DiagnosticObservation[] = [];
    let active = 0;
    let maxActive = 0;
    const graph = rootBudgetGraph();

    const run = await runTaskGraph<string>({
      graph,
      maxParallel: 3,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        events.push(`start:${task.id}`);
        await delay(task.id === "base" ? 10 : 2);
        events.push(`end:${task.id}`);
        active -= 1;
        return task.id;
      }
    });

    assert.equal(maxActive, 3);
    assert.ok(events.indexOf("end:base") < events.indexOf("start:dependent"));
    assert.ok(events.indexOf("end:mutex-one") < events.indexOf("start:mutex-two"));
    assert.deepEqual(completedValues(run), [
      "base",
      "dependent",
      "mutex-one",
      "mutex-two",
      "independent"
    ]);
    const rootDecisions = recordedSchedulerDecisions(observations);
    const rootAdmission = rootDecisions[0];
    if (rootAdmission?.kind !== "admit") assert.fail("expected initial scheduler admission");
    assert.equal(rootAdmission.trigger.kind, "execution-started");
    assert.equal(rootAdmission.taskId, "base");
    assert.equal(rootAdmission.reason, "canonical-order");
    assert.deepEqual(rootAdmission.capacity, {
      effectiveMaxParallel: 3,
      maxParallel: 3,
      running: 0
    });

    const initialDecision = decisionFor(graph, { maxParallel: 3 });
    assert.equal(initialDecision.kind, "admit");
    assert.equal(initialDecision.taskId, "base");
    assert.equal(initialDecision.reason, "canonical-order");
    assert.equal(Object.isFrozen(initialDecision), true);

    const staleReservation = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: ["independent"],
      reservationTaskId: "base"
    });
    assert.equal(staleReservation.kind, "admit");
    assert.equal(staleReservation.taskId, "independent");
    assert.deepEqual(staleReservation.reservation, { kind: "clear" });

    const mutexWait = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: ["mutex-two"],
      runningMutexes: ["shared"],
      runningTaskIds: ["mutex-one"]
    });
    assert.equal(mutexWait.kind, "await-running");
    assert.equal(mutexWait.reason, "dependency-or-mutex");
    assert.equal(mutexWait.blockers.mutex, 1);

    const pendingTaskIds = ["waiting"];
    const mutableTrigger = {
      kind: "task-settled" as const,
      settlementKind: "completed" as const,
      taskId: "first"
    };
    const copiedDecision = decideScheduler(
      {
        activeScopeIds: [],
        graph: prepareTaskGraph({ tasks: [{ id: "first" }, { id: "waiting" }] }, 1),
        isAbortRequested: false,
        isCancelled: false,
        maxParallel: 1,
        pendingTaskIds,
        reservationTaskId: undefined,
        runningMutexes: [],
        runningTaskIds: ["first"],
        settledTasks: []
      },
      mutableTrigger
    );
    assert.deepEqual(pendingTaskIds, ["waiting"]);
    assert.equal(copiedDecision.kind, "await-running");
    assert.notEqual(copiedDecision.trigger, mutableTrigger);
    assert.equal(Object.isFrozen(copiedDecision.trigger), true);

    const releaseFirst = createDeferred<void>();
    const budgetObservations: DiagnosticObservation[] = [];
    const rootBudgetRun = runTaskGraph({
      graph: { tasks: [{ id: "first" }, { id: "waiting" }] },
      maxParallel: 1,
      diagnosticLogger: recordingLogger(budgetObservations),
      execute: async (task) => {
        if (task.id === "first") await releaseFirst.promise;
        return task.id;
      }
    });
    await waitFor(() =>
      budgetObservations.some((observation) => observation.event === "scheduler.decision")
    );
    const capacityDecisions = recordedSchedulerDecisions(budgetObservations);
    assert.deepEqual(
      capacityDecisions.map((decision) => decision.kind),
      ["admit", "await-running"]
    );
    const capacityAdmission = capacityDecisions[0];
    if (capacityAdmission?.kind !== "admit") assert.fail("expected first budget admission");
    assert.equal(capacityAdmission.taskId, "first");
    assert.equal(capacityAdmission.trigger.kind, "execution-started");
    const capacityWait = capacityDecisions[1];
    if (capacityWait?.kind !== "await-running") assert.fail("expected capacity wait");
    assert.equal(capacityWait.reason, "root-capacity");
    assert.equal(capacityWait.trigger.kind, "admission-continued");
    assert.deepEqual(capacityWait.capacity, {
      effectiveMaxParallel: 1,
      maxParallel: 1,
      running: 1
    });
    const rootBudgetWait = decisionFor(
      { tasks: [{ id: "first" }, { id: "waiting" }] },
      {
        maxParallel: 1,
        pendingTaskIds: ["waiting"],
        runningTaskIds: ["first"]
      }
    );
    assert.equal(rootBudgetWait.kind, "await-running");
    assert.equal(rootBudgetWait.reason, "root-capacity");

    const runningDrain = decisionFor(graph, {
      maxParallel: 3,
      pendingTaskIds: [],
      runningTaskIds: ["independent"]
    });
    assert.equal(runningDrain.kind, "await-running");
    assert.equal(runningDrain.reason, "running-drain");
    releaseFirst.resolve(undefined);
    await rootBudgetRun;
    const completedBudgetDecisions = recordedSchedulerDecisions(budgetObservations);
    assert.deepEqual(
      completedBudgetDecisions.map((decision) => decision.kind),
      ["admit", "await-running", "admit", "await-running", "complete"]
    );
    const drain = completedBudgetDecisions[3];
    if (drain?.kind !== "await-running") assert.fail("expected running drain");
    assert.equal(drain.reason, "running-drain");
    assert.equal(drain.trigger.kind, "admission-continued");
    const complete = completedBudgetDecisions[4];
    if (complete?.kind !== "complete") assert.fail("expected scheduler completion");
    assert.equal(complete.trigger.kind, "task-settled");
  });

  it("keeps a scope cap active through terminal settlement and prioritizes its continuation", async () => {
    const events: string[] = [];
    const observations: DiagnosticObservation[] = [];
    const releaseTerminal = createDeferred<void>();
    const graph = continuationPriorityGraph();

    const running = runTaskGraph({
      graph,
      maxParallel: 3,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        events.push(`start:${task.id}`);
        if (task.id === "limited-terminal") {
          await releaseTerminal.promise;
        }
        events.push(`end:${task.id}`);
        return task.id;
      }
    });

    await waitFor(() => events.includes("start:limited-terminal"));
    const scopeBudgetWait = decisionFor(graph, {
      activeScopeIds: ["limited"],
      maxParallel: 3,
      pendingTaskIds: ["wide-one", "wide-two"],
      runningTaskIds: ["limited-terminal"],
      settledTasks: [{ kind: "completed", taskId: "limited-work" }]
    });
    assert.equal(scopeBudgetWait.kind, "await-running");
    assert.equal(scopeBudgetWait.reason, "active-scope-capacity");
    assert.equal(scopeBudgetWait.blockers.scopeCapacity, true);
    assert.equal(events.includes("start:wide-one"), false);
    assert.equal(events.includes("start:wide-two"), false);
    releaseTerminal.resolve();
    await running;
    assert.ok(events.indexOf("end:limited-terminal") < events.indexOf("start:wide-one"));
    recordedSchedulerDecisions(observations);
  });

  it("uses the minimum active cap and reserves capacity for a newly ready tighter scope", async () => {
    const events: string[] = [];
    const observations: DiagnosticObservation[] = [];
    const releaseWide = createDeferred<void>();
    const releaseLow = createDeferred<void>();
    const graph = tighteningScopeGraph();

    const running = runTaskGraph({
      graph,
      maxParallel: 2,
      diagnosticLogger: recordingLogger(observations),
      execute: async (task) => {
        events.push(`start:${task.id}`);
        if (task.id === "gate") {
          await waitFor(() => events.includes("start:wide-one"));
        }
        if (task.id === "wide-one") {
          await releaseWide.promise;
        }
        if (task.id === "low") {
          await releaseLow.promise;
        }
        events.push(`end:${task.id}`);
        return task.id;
      }
    });

    await waitFor(() => events.includes("end:gate"));
    await delay(2);
    const reservationWait = decisionFor(graph, {
      activeScopeIds: ["wide"],
      maxParallel: 2,
      pendingTaskIds: ["wide-two", "wide-terminal", "low"],
      runningTaskIds: ["wide-one"],
      settledTasks: [{ kind: "completed", taskId: "gate" }]
    });
    assert.equal(reservationWait.kind, "await-running");
    assert.equal(reservationWait.reason, "reserved-tightening-scope");
    assert.deepEqual(reservationWait.reservation, { kind: "set", taskId: "low" });

    const reservedAdmission = decisionFor(graph, {
      activeScopeIds: ["wide"],
      maxParallel: 2,
      pendingTaskIds: ["wide-two", "wide-terminal", "low"],
      reservationTaskId: "low",
      settledTasks: [{ kind: "completed", taskId: "gate" }]
    });
    assert.equal(reservedAdmission.kind, "admit");
    assert.equal(reservedAdmission.taskId, "low");
    assert.equal(reservedAdmission.reason, "reservation");
    assert.deepEqual(reservedAdmission.reservation, { kind: "clear" });
    assert.equal(events.includes("start:wide-two"), false);
    assert.equal(events.includes("start:low"), false);
    releaseWide.resolve();
    await waitFor(() => events.includes("start:low"));
    assert.equal(events.includes("start:wide-two"), false);
    releaseLow.resolve();
    await running;
    assert.ok(events.indexOf("start:low") < events.indexOf("start:wide-two"));
    recordedSchedulerDecisions(observations);
  });

  it("does not activate a cap for a scope with no activation task", async () => {
    const started: string[] = [];
    const release = createDeferred<void>();
    const graph = noActivationGraph();

    const running = runTaskGraph({
      graph,
      maxParallel: 3,
      execute: async (task) => {
        started.push(task.id);
        await release.promise;
        return task.id;
      }
    });

    await waitFor(() => started.length === 3);
    assert.deepEqual([...started].sort(), ["wide-one", "wide-two", "zero-terminal"]);
    release.resolve();
    await running;
  });

  it("settles executor failures and blocks only their dependent tasks", async () => {
    const calls: string[] = [];
    const observations: DiagnosticObservation[] = [];
    const run = await runTaskGraph<string>({
      graph: failureGraph(),
      maxParallel: 2,
      diagnosticLogger: recordingLogger(observations),
      execute: (task) => {
        calls.push(task.id);
        if (task.id === "failure") {
          throw new Error("task failure");
        }
        return task.id;
      }
    });

    assert.deepEqual(calls.sort(), ["failure", "independent"]);
    assert.equal(settlementFor(run, "failure").kind, "failed");
    assert.deepEqual(settlementFor(run, "blocked"), {
      kind: "blocked",
      dependencyIds: ["failure"]
    });
    assert.deepEqual(settlementFor(run, "independent"), {
      kind: "completed",
      value: "independent"
    });

    const blockedDecision = decisionFor(failureGraph(), {
      maxParallel: 2,
      pendingTaskIds: ["blocked"],
      settledTasks: [{ kind: "failed", taskId: "failure" }]
    });
    assert.equal(blockedDecision.kind, "settle-blocked");
    assert.deepEqual(blockedDecision.dependencyIds, ["failure"]);
    const failureDecisions = recordedSchedulerDecisions(observations);
    const appliedBlock = failureDecisions.find((decision) => decision.kind === "settle-blocked");
    if (appliedBlock === undefined) assert.fail("expected a blocked settlement decision");
    assert.equal(appliedBlock.taskId, "blocked");
    assert.deepEqual(appliedBlock.dependencyIds, ["failure"]);
    assert.equal(appliedBlock.trigger.kind, "task-settled");
  });

  it("stops new admission after abort while admitted work receives the same signal and drains", async () => {
    const controller = new AbortController();
    const started: string[] = [];
    const observations: DiagnosticObservation[] = [];
    let observedSignal: AbortSignal | undefined;
    const graph: TaskGraph = {
      tasks: [{ id: "started-one" }, { id: "started-two" }, { id: "pending" }]
    };

    const running = runTaskGraph({
      graph,
      maxParallel: 2,
      diagnosticLogger: recordingLogger(observations),
      signal: controller.signal,
      execute: async (task, context) => {
        started.push(task.id);
        observedSignal = context.signal;
        await waitFor(() => context.signal?.aborted === true);
        return task.id;
      }
    });

    await waitFor(() => started.length === 2);
    controller.abort();
    const run = await running;

    assert.equal(observedSignal, controller.signal);
    assert.deepEqual([...started].sort(), ["started-one", "started-two"]);
    assert.equal(run.cancelled, true);
    assert.deepEqual(settlementFor(run, "started-one"), {
      kind: "completed",
      value: "started-one"
    });
    assert.deepEqual(settlementFor(run, "started-two"), {
      kind: "completed",
      value: "started-two"
    });
    assert.deepEqual(settlementFor(run, "pending"), { kind: "cancelled-before-start" });
    const cancellationDecisions = recordedSchedulerDecisions(observations);
    assert.deepEqual(
      cancellationDecisions.map((decision) => decision.kind),
      ["admit", "admit", "await-running", "cancel-pending", "await-running", "complete"]
    );
    const appliedCancellation = cancellationDecisions[3];
    if (appliedCancellation?.kind !== "cancel-pending") {
      assert.fail("expected pending cancellation decision");
    }
    assert.deepEqual(appliedCancellation.taskIds, ["pending"]);
    assert.equal(appliedCancellation.trigger.kind, "cancellation-observed");
    const appliedCancellationDrain = cancellationDecisions[4];
    if (appliedCancellationDrain?.kind !== "await-running") {
      assert.fail("expected cancellation drain decision");
    }
    assert.equal(appliedCancellationDrain.reason, "cancellation-drain");
    assert.equal(appliedCancellationDrain.trigger.kind, "cancellation-applied");
    const cancellationComplete = cancellationDecisions[5];
    if (cancellationComplete?.kind !== "complete") {
      assert.fail("expected cancellation completion decision");
    }
    assert.equal(cancellationComplete.trigger.kind, "task-settled");
    const cancellation = decisionFor(graph, {
      isAbortRequested: true,
      maxParallel: 2,
      pendingTaskIds: ["pending"],
      runningTaskIds: ["started-one", "started-two"]
    });
    assert.equal(cancellation.kind, "cancel-pending");
    assert.deepEqual(cancellation.taskIds, ["pending"]);
    assert.equal(Object.isFrozen(cancellation.taskIds), true);
    assert.equal("reservationTaskId" in cancellation, false);
    assert.equal(cancellation.trigger.kind, "cancellation-observed");

    const cancellationDrain = decisionFor(graph, {
      isCancelled: true,
      maxParallel: 2,
      pendingTaskIds: [],
      runningTaskIds: ["started-one"]
    });
    assert.equal(cancellationDrain.kind, "await-running");
    assert.equal(cancellationDrain.reason, "cancellation-drain");

    const complete = decisionFor(graph, { isCancelled: true, maxParallel: 2, pendingTaskIds: [] });
    assert.equal(complete.kind, "complete");
  });
});
