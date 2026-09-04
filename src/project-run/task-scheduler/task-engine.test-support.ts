import assert from "node:assert/strict";

import type { SchedulerGraphSnapshot } from "../../project-definition/project-definition.ts";
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

/** Named phase clock keeps Scheduler timing fixtures readable without call-count arrays. */
export function scriptedClock(initialMs = 0): Readonly<{
  readonly advance: (phase: string, milliseconds: number) => void;
  readonly now: () => number;
  readonly reads: () => number;
}> {
  let currentMs = initialMs;
  let reads = 0;
  return Object.freeze({
    advance: (phase, milliseconds) => {
      assert.ok(phase.length > 0, "scripted clock phase must be named");
      assert.ok(Number.isFinite(milliseconds) && milliseconds >= 0, "phase time must be finite");
      currentMs += milliseconds;
    },
    now: () => {
      reads += 1;
      return currentMs;
    },
    reads: () => reads
  });
}

export function schedulerSummary(
  observations: readonly DiagnosticObservation[]
): Readonly<Record<string, unknown>> {
  const summaries = observations.filter((observation) => observation.event === "scheduler.summary");
  assert.equal(summaries.length, 1, "expected exactly one scheduler summary");
  const details = summaries[0]?.details;
  if (!isRecord(details)) assert.fail("scheduler summary must have ordinary object details");
  return details;
}

/** Verifies the shared immutable graph boundary exposed by Scheduler contexts. */
export function assertFrozenSchedulerGraphSnapshot(graph: SchedulerGraphSnapshot): void {
  assert.equal(Object.isFrozen(graph), true);
  assert.equal(Object.isFrozen(graph.tasks), true);
  for (const task of graph.tasks) {
    assert.equal(Object.isFrozen(task), true);
    assert.equal(Object.isFrozen(task.dependsOn), true);
    assert.equal(Object.isFrozen(task.mutex), true);
    assert.equal(Object.isFrozen(task.observes), true);
  }
  assert.equal(Object.isFrozen(graph.scopes), true);
  for (const scope of graph.scopes) {
    assert.equal(Object.isFrozen(scope), true);
    assert.equal(Object.isFrozen(scope.activationTaskIds), true);
  }
}

export function recordedSchedulerDecisions(
  observations: readonly DiagnosticObservation[]
): readonly SchedulerDecision[] {
  const graphObservations = observations.filter(
    (observation) => observation.event === "scheduler.graph"
  );
  assert.equal(graphObservations.length, 1, "expected exactly one scheduler graph observation");
  const graphDetails = graphObservations[0]?.details;
  if (
    !isRecord(graphDetails) ||
    !isRecord(graphDetails.graph) ||
    typeof graphDetails.graphFingerprint !== "string"
  ) {
    assert.fail("scheduler graph observation must retain one full graph and fingerprint");
  }
  /* oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The Scheduler test seam emits this exact frozen public DTO and checks its object boundary before reusing existing decision assertions. */
  const graph = graphDetails.graph as unknown as SchedulerGraphSnapshot;
  const graphFingerprint = graphDetails.graphFingerprint;
  const decisionObservations = observations.filter(
    (observation) => observation.event === "scheduler.decision"
  );
  assert.ok(decisionObservations.length > 0, "expected scheduler decisions to be observed");
  const decisions: SchedulerDecision[] = [];
  for (const observation of decisionObservations) {
    assertNoUndefinedValue(observation.details);
    if (!isSchedulerDecisionDetails(observation.details)) {
      assert.fail("scheduler observation did not contain a SchedulerDecision");
    }
    assert.equal("graphIdentity" in observation.details, false);
    assert.equal(observation.details.graphFingerprint, graphFingerprint);
    /* oxlint-disable-next-line typescript/no-unsafe-type-assertion -- The test reattaches the just-validated graph solely to reuse existing typed Scheduler decision assertions. */
    const decision = Object.freeze({
      ...observation.details,
      graphIdentity: graph
    }) as SchedulerDecision;
    assertSchedulerDecisionContext(decision);
    decisions.push(decision);
  }
  return Object.freeze(decisions);
}

interface SchedulerDecisionScenario {
  readonly activeScopeIds?: readonly string[];
  readonly isAbortRequested?: boolean;
  readonly isCancelled?: boolean;
  readonly maxParallel: number;
  readonly pendingTaskIds?: readonly string[];
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
  assert.equal(Object.isFrozen(decision.capacity), true);
  assert.equal(Object.isFrozen(decision.blockers), true);
  assertFrozenSchedulerGraphSnapshot(decision.graphIdentity);
  if (decision.kind === "admit" || decision.kind === "await-running") {
    assert.equal(Object.isFrozen(decision.candidates), true);
    assert.equal(Object.isFrozen(decision.hardGuard), true);
    assert.equal("reason" in decision, false);
    assert.equal("reservation" in decision, false);
  }
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

function isSchedulerDecisionDetails(
  value: unknown
): value is Readonly<Record<string, unknown>> & Readonly<{ readonly kind: string }> {
  if (!isRecord(value) || typeof value.graphFingerprint !== "string") return false;
  const kind = value.kind;
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

export {
  cancellationGraph,
  continuationPriorityGraph,
  failureGraph,
  noActivationGraph,
  rootBudgetGraph,
  tighteningScopeGraph
} from "./task-engine.graph-fixtures.test-support.ts";

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
