import assert from "node:assert/strict";

import type { DiagnosticLogger, DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import type { TaskGraph } from "./graph.ts";
import { prepareTaskGraph } from "./graph.ts";
import type { TaskGraphRun } from "./scheduler.ts";
import {
  decideScheduler,
  type SchedulerDecision,
  type SchedulerSnapshot
} from "./scheduler-decision.ts";

export function recordingLogger(observations: DiagnosticObservation[]): DiagnosticLogger {
  return Object.freeze({
    close: () => "disabled" as const,
    observe: (observation: DiagnosticObservation): void => {
      observations.push(observation);
    }
  });
}

export function recordedSchedulerDecisions(
  observations: readonly DiagnosticObservation[]
): readonly SchedulerDecision[] {
  assert.ok(observations.length > 0, "expected scheduler decisions to be observed");
  const decisions: SchedulerDecision[] = [];
  for (const observation of observations) {
    assert.equal(observation.tags[0], "SCHEDULER");
    assert.equal(observation.event, "scheduler.decision");
    assertNoUndefinedValue(observation.details);
    if (!isSchedulerDecision(observation.details)) {
      assert.fail("scheduler observation did not contain a SchedulerDecision");
    }
    assertSchedulerDecisionContext(observation.details);
    decisions.push(observation.details);
  }
  return Object.freeze(decisions);
}

interface SchedulerDecisionScenario {
  readonly activeScopeIds?: readonly string[];
  readonly isAbortRequested?: boolean;
  readonly isCancelled?: boolean;
  readonly maxParallel: number;
  readonly pendingTaskIds?: readonly string[];
  readonly reservationTaskId?: string;
  readonly runningMutexes?: readonly string[];
  readonly runningTaskIds?: readonly string[];
  readonly settledTasks?: SchedulerSnapshot["settledTasks"];
}

const DEFAULT_SCHEDULER_SCENARIO = Object.freeze({
  activeScopeIds: Object.freeze([]),
  isAbortRequested: false,
  isCancelled: false,
  runningMutexes: Object.freeze([]),
  runningTaskIds: Object.freeze([]),
  settledTasks: Object.freeze([])
});

const EXECUTION_STARTED_TRIGGER = Object.freeze({ kind: "execution-started" as const });

/** Builds the immutable public input used to probe one pure scheduler decision. */
export function decisionFor(graph: TaskGraph, input: SchedulerDecisionScenario): SchedulerDecision {
  const scenario = {
    ...DEFAULT_SCHEDULER_SCENARIO,
    ...input,
    pendingTaskIds: input.pendingTaskIds ?? graph.tasks.map((task) => task.id)
  };
  return decideScheduler(
    Object.freeze({
      ...scenario,
      activeScopeIds: Object.freeze([...scenario.activeScopeIds]),
      graph: prepareTaskGraph(graph, scenario.maxParallel),
      pendingTaskIds: Object.freeze([...scenario.pendingTaskIds]),
      reservationTaskId: scenario.reservationTaskId,
      runningMutexes: Object.freeze([...scenario.runningMutexes]),
      runningTaskIds: Object.freeze([...scenario.runningTaskIds]),
      settledTasks: Object.freeze([...scenario.settledTasks])
    }),
    EXECUTION_STARTED_TRIGGER
  );
}

/** Proves that the pure decision boundary does not retain mutable caller input. */
export function assertSchedulerDecisionCopiesSnapshotInputs(): void {
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
  assert.equal(Object.isFrozen(copiedDecision.capacity), true);
  assert.equal(Object.isFrozen(copiedDecision.blockers), true);
  assert.equal(Object.isFrozen(copiedDecision.reservation), true);
}

/** Narrows a recorded decision while retaining an actionable assertion failure. */
export function admissionDecision(
  decision: SchedulerDecision | undefined
): Extract<SchedulerDecision, { readonly kind: "admit" }> {
  if (decision?.kind !== "admit") assert.fail("expected scheduler admission");
  return decision;
}

/** Narrows a recorded decision while retaining an actionable assertion failure. */
export function awaitingDecision(
  decision: SchedulerDecision | undefined
): Extract<SchedulerDecision, { readonly kind: "await-running" }> {
  if (decision?.kind !== "await-running") assert.fail("expected scheduler wait");
  return decision;
}

/** Narrows a recorded decision while retaining an actionable assertion failure. */
export function completionDecision(
  decision: SchedulerDecision | undefined
): Extract<SchedulerDecision, { readonly kind: "complete" }> {
  if (decision?.kind !== "complete") assert.fail("expected scheduler completion");
  return decision;
}

function assertSchedulerDecisionContext(decision: SchedulerDecision): void {
  assert.deepEqual(Object.keys(decision.capacity).sort(), [
    "effectiveMaxParallel",
    "maxParallel",
    "running"
  ]);
  assert.deepEqual(Object.keys(decision.blockers).sort(), [
    "dependency",
    "mutex",
    "rootCapacity",
    "scopeCapacity"
  ]);
  assert.deepEqual(Object.keys(decision.reservation), ["taskId"]);
  assert.equal(Object.isFrozen(decision.capacity), true);
  assert.equal(Object.isFrozen(decision.blockers), true);
  assert.equal(Object.isFrozen(decision.reservation), true);
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

export function rootBudgetGraph(): TaskGraph {
  return {
    tasks: [
      { id: "base" },
      { id: "dependent", dependsOn: ["base"] },
      { id: "mutex-one", mutex: ["shared"] },
      { id: "mutex-two", mutex: ["shared"] },
      { id: "independent" }
    ]
  };
}

export function continuationPriorityGraph(): TaskGraph {
  return {
    tasks: [
      { id: "limited-work", scopeId: "limited" },
      { id: "limited-terminal", dependsOn: ["limited-work"], scopeId: "limited" },
      { id: "wide-one" },
      { id: "wide-two" }
    ],
    scopes: [
      {
        id: "limited",
        maxParallel: 1,
        activationTaskIds: ["limited-work"],
        terminalTaskId: "limited-terminal"
      }
    ]
  };
}

export function tighteningScopeGraph(): TaskGraph {
  return {
    tasks: [
      { id: "gate" },
      { id: "wide-one", scopeId: "wide" },
      { id: "wide-two", scopeId: "wide" },
      { id: "wide-terminal", dependsOn: ["wide-one", "wide-two"], scopeId: "wide" },
      { id: "low", dependsOn: ["gate"], scopeId: "low" }
    ],
    scopes: [
      {
        id: "wide",
        maxParallel: 2,
        activationTaskIds: ["wide-one", "wide-two"],
        terminalTaskId: "wide-terminal"
      },
      {
        id: "low",
        maxParallel: 1,
        activationTaskIds: ["low"],
        terminalTaskId: "low"
      }
    ]
  };
}

export function noActivationGraph(): TaskGraph {
  return {
    tasks: [{ id: "zero-terminal", scopeId: "zero" }, { id: "wide-one" }, { id: "wide-two" }],
    scopes: [
      {
        id: "zero",
        maxParallel: 1,
        activationTaskIds: [],
        terminalTaskId: "zero-terminal"
      }
    ]
  };
}

export function failureGraph(): TaskGraph {
  return {
    tasks: [{ id: "failure" }, { id: "blocked", dependsOn: ["failure"] }, { id: "independent" }]
  };
}

export function cancellationGraph(): TaskGraph {
  return {
    tasks: [{ id: "started" }, { id: "pending-one" }, { id: "pending-two" }]
  };
}

export function completedValues(run: TaskGraphRun<string>): string[] {
  return run.settlements.flatMap(({ settlement }) =>
    settlement.kind === "completed" ? [settlement.value] : []
  );
}

export function settlementFor<TResult>(run: TaskGraphRun<TResult>, taskId: string) {
  const item = run.settlements.find(({ task }) => task.id === taskId);
  assert.ok(item, `expected settlement for ${taskId}`);
  return item.settlement;
}

export function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export interface Deferred<TResult> {
  readonly promise: Promise<TResult>;
  readonly resolve: (value: TResult | PromiseLike<TResult>) => void;
}

export function createDeferred<TResult>(): Deferred<TResult> {
  let resolve: ((value: TResult | PromiseLike<TResult>) => void) | undefined;
  const promise = new Promise<TResult>((resolvePromise) => {
    resolve = resolvePromise;
  });
  if (resolve === undefined) {
    throw new Error("failed to initialize deferred promise");
  }
  return { promise, resolve };
}

export async function waitFor(condition: () => boolean): Promise<void> {
  const deadline = Date.now() + 1_000;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error("condition timed out");
    }
    await delay(1);
  }
}
