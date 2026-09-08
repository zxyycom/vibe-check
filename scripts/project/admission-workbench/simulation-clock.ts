import { contentionAlpha, stateSummary } from "./simulation-evidence.ts";
import { addEffect } from "./simulation-observations.ts";
import {
  freezeValue,
  recordCoreEvent,
  required,
  type Run,
  SimulationFault
} from "./simulation-types.ts";

export function advanceRunning(run: Run): void {
  const runningTaskIds = run.state.inspection.runningTaskIds;
  if (runningTaskIds.length === 0) {
    throw new SimulationFault("no-progress", "advance requires running work");
  }
  computeRates(run);
  const deltaMs = nextCompletionDelta(run, runningTaskIds);
  recordCoreEvent(run);
  recordInterval(run, deltaMs);
  run.trace.push(
    freezeValue({
      atMs: run.virtualTimeMs,
      boundaryIndex: run.boundaryIndex,
      deltaMs,
      kind: "advance" as const,
      rates: [...run.rates]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([taskId, rate]) => ({ rate, taskId })),
      runningTaskIds
    })
  );
  settleCompletions(run, runningTaskIds, deltaMs);
}

function computeRates(run: Run): void {
  run.rates.clear();
  const alpha = contentionAlpha(run.scenario.contention);
  for (const taskId of run.state.inspection.runningTaskIds) {
    const task = run.scenario.graph.graph.tasks.find((candidate) => candidate.taskId === taskId);
    if (task === undefined) {
      throw new SimulationFault("invalid-input", `running task is absent from graph: ${taskId}`);
    }
    let rate = 1;
    for (const claim of task.resourceClaims) {
      const occupancy = run.state.inspection.resources.find(
        ({ resourceId }) => resourceId === claim.resourceId
      );
      if (occupancy === undefined) {
        throw new SimulationFault(
          "invalid-input",
          `missing resource occupancy: ${claim.resourceId}`
        );
      }
      const slowdown =
        1 + alpha * Math.max(0, (occupancy.inUse - claim.units) / occupancy.capacity);
      rate = Math.min(rate, 1 / slowdown);
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new SimulationFault("non-positive-rate", `task ${taskId} has a non-positive rate`);
    }
    run.rates.set(taskId, rate);
  }
}

function nextCompletionDelta(run: Run, runningTaskIds: readonly string[]): number {
  let deltaMs = Number.POSITIVE_INFINITY;
  for (const taskId of runningTaskIds) {
    const workMs = required(run.remainingWork, taskId, "remaining work");
    const rate = required(run.rates, taskId, "rate");
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new SimulationFault("non-positive-rate", `task ${taskId} has a non-positive rate`);
    }
    deltaMs = Math.min(deltaMs, workMs / rate);
  }
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) {
    throw new SimulationFault(
      "non-advancing-event",
      "next completion does not advance virtual time"
    );
  }
  return deltaMs;
}

function recordInterval(run: Run, deltaMs: number): void {
  const { catalog, inspection } = run.state;
  const admissible = catalog.selectableTaskIds.length;
  const capacityBlocked = catalog.nonSelectableTasks.filter(({ reason }) =>
    isCapacityBlock(reason.kind)
  ).length;
  const mutexBlocked = catalog.nonSelectableTasks.filter(
    ({ reason }) => reason.kind === "mutex-held"
  ).length;
  run.slotTimeMs += inspection.runningTaskIds.length * deltaMs;
  run.rootCapacitySlotMs += inspection.capacity.maxParallel * deltaMs;
  run.effectiveCapacitySlotMs += inspection.capacity.effectiveMaxParallel * deltaMs;
  for (const resource of inspection.resources) {
    run.unitTimeMs[resource.resourceId] =
      (run.unitTimeMs[resource.resourceId] ?? 0) + resource.inUse * deltaMs;
  }
  recordObservationInterval(run, deltaMs, { admissible, capacityBlocked, mutexBlocked });
  const nextTime = run.virtualTimeMs + deltaMs;
  if (!Number.isFinite(nextTime) || nextTime <= run.virtualTimeMs) {
    throw new SimulationFault("non-advancing-event", "virtual clock did not advance");
  }
  run.virtualTimeMs = nextTime;
}

function isCapacityBlock(kind: string): boolean {
  return (
    kind === "root-capacity-reached" ||
    kind === "scope-capacity-reached" ||
    kind === "resource-capacity-insufficient"
  );
}

function recordObservationInterval(
  run: Run,
  deltaMs: number,
  counts: Readonly<{
    readonly admissible: number;
    readonly capacityBlocked: number;
    readonly mutexBlocked: number;
  }>
): void {
  const pending = run.pendingObservation;
  if (pending === null) return;
  const contribution = pending.contribution;
  const { capacity, runningTaskIds } = run.state.inspection;
  contribution.acceptedWaitMs += pending.kind === "wait" ? deltaMs : 0;
  contribution.admissiblePendingTaskMs += counts.admissible * deltaMs;
  contribution.capacityBlockedTaskMs += counts.capacityBlocked * deltaMs;
  contribution.effectiveCapacitySlotMs += capacity.effectiveMaxParallel * deltaMs;
  contribution.mutexBlockedTaskMs += counts.mutexBlocked * deltaMs;
  contribution.rootCapacitySlotMs += capacity.maxParallel * deltaMs;
  contribution.taskSlotMs += runningTaskIds.length * deltaMs;
}

function settleCompletions(run: Run, runningTaskIds: readonly string[], deltaMs: number): void {
  const finished: string[] = [];
  for (const taskId of runningTaskIds) {
    const previous = required(run.remainingWork, taskId, "remaining work");
    const remaining = previous - required(run.rates, taskId, "rate") * deltaMs;
    if (Math.abs(remaining) <= numericTolerance(previous, remaining)) {
      run.remainingWork.set(taskId, 0);
      finished.push(taskId);
    } else if (remaining > 0) {
      run.remainingWork.set(taskId, remaining);
    } else {
      throw new SimulationFault(
        "non-advancing-event",
        `task ${taskId} overshot completion tolerance`
      );
    }
  }
  if (finished.length === 0) {
    throw new SimulationFault("non-advancing-event", "advance completed no task");
  }
  for (const taskId of finished.sort((left, right) => left.localeCompare(right)))
    settleTask(run, taskId);
}

function settleTask(run: Run, taskId: string): void {
  const pendingBefore = pendingTaskIds(run);
  const outcome = run.scenario.outcomes?.[taskId] ?? "satisfied";
  const settled = run.state.settle(taskId, outcome);
  if (!settled.accepted) {
    throw new SimulationFault(
      "graph-rejected",
      `public AdmissionState rejected settle(${taskId}): ${settled.reason.kind}`
    );
  }
  recordCoreEvent(run);
  run.state = settled.state;
  addEffect(run, {
    kind: "settled",
    settlementKind: outcome === "satisfied" ? "completed" : "prerequisite-unsatisfied",
    taskId
  });
  run.trace.push(
    freezeValue({
      atMs: run.virtualTimeMs,
      boundaryIndex: run.boundaryIndex,
      kind: "settle" as const,
      outcome,
      state: stateSummary(run.state),
      taskId
    })
  );
  recordForcedBlocks(run, taskId, pendingBefore);
}

function pendingTaskIds(run: Run): Set<string> {
  return new Set([
    ...run.state.catalog.selectableTaskIds,
    ...run.state.catalog.nonSelectableTasks.map(({ taskId }) => taskId)
  ]);
}

function recordForcedBlocks(
  run: Run,
  causedByTaskId: string,
  pendingBefore: ReadonlySet<string>
): void {
  const presentAfter = new Set([
    ...run.state.catalog.selectableTaskIds,
    ...run.state.catalog.nonSelectableTasks.map(({ taskId }) => taskId),
    ...run.state.inspection.runningTaskIds,
    ...run.state.inspection.settledTasks.map(({ taskId }) => taskId)
  ]);
  for (const taskId of [...pendingBefore].sort((left, right) => left.localeCompare(right))) {
    if (taskId === causedByTaskId || presentAfter.has(taskId)) continue;
    addEffect(run, { kind: "settled", settlementKind: "blocked", taskId });
    run.trace.push(
      freezeValue({
        atMs: run.virtualTimeMs,
        boundaryIndex: run.boundaryIndex,
        causedByTaskId,
        effect: "blocked" as const,
        kind: "forced-effect" as const,
        taskId
      })
    );
  }
}

function numericTolerance(left: number, right: number): number {
  return 64 * Number.EPSILON * Math.max(1, Math.abs(left), Math.abs(right));
}
