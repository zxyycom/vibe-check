import { createAdmissionGraph } from "../../project-run/task-scheduler/admission-core/core.ts";
import type {
  AdmissionPolicyContext,
  SchedulerGraphSnapshot
} from "../../project-definition/project-definition.ts";

export function task(
  taskId: string,
  overrides: Partial<SchedulerGraphSnapshot["tasks"][number]> = {}
): SchedulerGraphSnapshot["tasks"][number] {
  return Object.freeze({
    admissionPriority: 0,
    dependsOn: Object.freeze([]),
    mutex: Object.freeze([]),
    observes: Object.freeze([]),
    resourceClaims: Object.freeze([]),
    scopeId: null,
    taskId,
    ...overrides
  });
}

export function graph(): SchedulerGraphSnapshot {
  return graphFor(
    [task("ordinary", { admissionPriority: 99 }), task("activate", { scopeId: "limited" })],
    Object.freeze([
      Object.freeze({
        activationTaskIds: Object.freeze(["activate"]),
        id: "limited",
        maxParallel: 1,
        terminalTaskId: "activate"
      })
    ])
  );
}

export function graphFor(
  tasks: readonly SchedulerGraphSnapshot["tasks"][number][],
  scopes: readonly SchedulerGraphSnapshot["scopes"][number][] = Object.freeze([])
): SchedulerGraphSnapshot {
  return Object.freeze({
    resourceCapacities: Object.freeze([]),
    scopes: Object.freeze(scopes),
    tasks: Object.freeze(tasks)
  });
}

export function contextFor(
  schedulerGraph: SchedulerGraphSnapshot,
  candidates: readonly { readonly canAdmit: boolean; readonly taskId: string }[],
  activeScopeIds: readonly string[] = []
): AdmissionPolicyContext {
  return {
    activeScopeIds,
    admissionState: createAdmissionGraph({ graph: schedulerGraph, maxParallel: 4 }).initialState(),
    candidates,
    capacity: { effectiveMaxParallel: 4, maxParallel: 4, running: 0 },
    graph: schedulerGraph,
    measurement: emptyMeasurement(),
    runningTaskIds: [],
    runtime: { abortRequested: false, cancelled: false },
    settledTaskIds: []
  };
}

function emptyMeasurement(): AdmissionPolicyContext["measurement"] {
  return Object.freeze({
    cumulative: Object.freeze({
      declarativeFingerprint: "test",
      discrete: Object.freeze({ acceptedWaitCount: 0, admittedCount: 0, maxRunning: 0 }),
      peaks: Object.freeze({
        admissionViablePendingTaskCount: 0,
        admissiblePendingTaskCount: 0,
        capacityBlockedTaskCount: 0,
        mutexBlockedTaskCount: 0
      }),
      timing: Object.freeze({
        availability: "unavailable" as const,
        reason: "clock-threw" as const
      })
    }),
    measurementAt: () => undefined,
    measurementCount: 0
  });
}

export function context(
  candidates: readonly { readonly canAdmit: boolean; readonly taskId: string }[],
  activeScopeIds: readonly string[] = []
): AdmissionPolicyContext {
  return contextFor(graph(), candidates, activeScopeIds);
}
