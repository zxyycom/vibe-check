import type {
  AdmissionPolicyContext,
  SchedulerMeasurementActionObservation,
  SchedulerMeasurementEffect
} from "@zxyycom/vibe-check";

import { stateSummary } from "./simulation-evidence.ts";
import {
  freezeValue,
  type MutableContribution,
  type MutableObservation,
  type Run,
  SimulationFault
} from "./simulation-types.ts";

export function contextFor(
  run: Run,
  candidates: AdmissionPolicyContext["candidates"]
): AdmissionPolicyContext {
  const observations = Object.freeze([...run.observations]);
  const capacityBlockedTaskCount = candidates.filter(({ canAdmit }) => !canAdmit).length;
  const mutexBlockedTaskCount = mutexBlockedCount(run);
  return Object.freeze({
    activeScopeIds: Object.freeze(
      run.state.inspection.scopes
        .filter(({ lifecycle }) => lifecycle === "active")
        .map(({ scopeId }) => scopeId)
    ),
    admissionState: run.state,
    candidates,
    capacity: run.state.inspection.capacity,
    graph: run.scenario.graph.graph,
    measurement: Object.freeze({
      cumulative: Object.freeze({
        declarativeFingerprint: run.declarativeFingerprint,
        discrete: Object.freeze({
          acceptedWaitCount: run.acceptedWaitCount,
          admittedCount: run.admittedCount,
          maxRunning: run.maxRunning
        }),
        peaks: Object.freeze({
          ...run.peaks,
          capacityBlockedTaskCount: Math.max(
            run.peaks.capacityBlockedTaskCount,
            capacityBlockedTaskCount
          ),
          mutexBlockedTaskCount: Math.max(run.peaks.mutexBlockedTaskCount, mutexBlockedTaskCount)
        }),
        timing: Object.freeze({ availability: "available" as const }),
        timingFacts: Object.freeze({
          acceptedWaitMs: observations.reduce(
            (total, observation) =>
              total +
              (observation.interval.availability === "available"
                ? observation.interval.contribution.acceptedWaitMs
                : 0),
            0
          ),
          effectiveCapacitySlotMs: run.effectiveCapacitySlotMs,
          rootCapacitySlotMs: run.rootCapacitySlotMs,
          taskSlotMs: run.slotTimeMs
        })
      }),
      measurementAt: (index: number) => observations[index],
      measurementCount: observations.length
    }),
    runningTaskIds: run.state.inspection.runningTaskIds,
    runtime: Object.freeze({ abortRequested: false, cancelled: false }),
    settledTaskIds: Object.freeze(run.state.inspection.settledTasks.map(({ taskId }) => taskId))
  });
}

export function closePendingObservation(run: Run): void {
  const pending = run.pendingObservation;
  if (pending === null) return;
  run.observations.push(freezeObservation(pending));
  run.pendingObservation = null;
}

export function actionObservationPrefix(
  run: Run | undefined,
  includePending: boolean
): readonly SchedulerMeasurementActionObservation[] {
  if (run === undefined) return Object.freeze([]);
  const observations = [...run.observations];
  if (includePending && run.pendingObservation !== null) {
    observations.push(freezeObservation(run.pendingObservation));
  }
  return Object.freeze(observations);
}

function freezeObservation(pending: MutableObservation): SchedulerMeasurementActionObservation {
  const interval = freezeValue({
    availability: "available" as const,
    contribution: pending.contribution
  });
  if (pending.kind === "wait") {
    return freezeValue({
      effects: pending.effects,
      interval,
      kind: "wait" as const,
      sequence: pending.sequence,
      taskId: null
    });
  }
  if (pending.taskId === null) {
    throw new SimulationFault("invalid-input", "select observation is missing task identity");
  }
  return freezeValue({
    effects: pending.effects,
    interval,
    kind: "select" as const,
    sequence: pending.sequence,
    taskId: pending.taskId
  });
}

export function addEffect(run: Run, effect: SchedulerMeasurementEffect): void {
  run.pendingObservation?.effects.push(effect);
}

export function updatePeaks(run: Run, candidates: AdmissionPolicyContext["candidates"]): void {
  run.peaks.admissionViablePendingTaskCount = Math.max(
    run.peaks.admissionViablePendingTaskCount,
    candidates.length
  );
  run.peaks.admissiblePendingTaskCount = Math.max(
    run.peaks.admissiblePendingTaskCount,
    candidates.filter(({ canAdmit }) => canAdmit).length
  );
  run.peaks.capacityBlockedTaskCount = Math.max(
    run.peaks.capacityBlockedTaskCount,
    candidates.filter(({ canAdmit }) => !canAdmit).length
  );
  run.peaks.mutexBlockedTaskCount = Math.max(
    run.peaks.mutexBlockedTaskCount,
    mutexBlockedCount(run)
  );
}

export function emptyContribution(): MutableContribution {
  return {
    acceptedWaitMs: 0,
    admissiblePendingTaskMs: 0,
    capacityBlockedTaskMs: 0,
    effectiveCapacitySlotMs: 0,
    mutexBlockedTaskMs: 0,
    rootCapacitySlotMs: 0,
    taskSlotMs: 0
  };
}

export function recordSelection(run: Run, taskId: string): void {
  run.trace.push(
    freezeValue({
      atMs: run.virtualTimeMs,
      boundaryIndex: run.boundaryIndex,
      kind: "select" as const,
      state: stateSummary(run.state),
      taskId
    })
  );
}

export function recordWait(run: Run): void {
  run.trace.push(
    freezeValue({
      atMs: run.virtualTimeMs,
      boundaryIndex: run.boundaryIndex,
      kind: "policy-wait" as const,
      state: stateSummary(run.state)
    })
  );
}

function mutexBlockedCount(run: Run): number {
  return run.state.catalog.nonSelectableTasks.filter(({ reason }) => reason.kind === "mutex-held")
    .length;
}
