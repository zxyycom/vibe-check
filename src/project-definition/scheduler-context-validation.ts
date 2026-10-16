import {
  snapshotContextCallback,
  normalizeContextCallback
} from "../data-boundary/context-callback.ts";
import type {
  SchedulerContextByPhase,
  SchedulerContextCallbackInput,
  SchedulerContextPhase,
  SchedulerContextResultByPhase
} from "./scheduler-context-callback.ts";

const CONTEXT_KEYS = Object.freeze({
  preparation: Object.freeze(["graph"] as const),
  decision: Object.freeze([
    "activeScopeIds",
    "admissionState",
    "candidates",
    "capacity",
    "graph",
    "cumulative",
    "actionHistory",
    "runningTaskIds",
    "runtime",
    "settledTaskIds"
  ] as const),
  terminal: Object.freeze(["execution", "graph", "runMeasurement", "taskTimings"] as const)
});

/** A closed, known-demand private callable; erased public storage is never invoked directly. */
export interface NormalizedSchedulerContextCallback<P extends SchedulerContextPhase> {
  readonly contextNeeds: readonly (keyof SchedulerContextByPhase[P])[];
  readonly invoke: (context: Readonly<Partial<SchedulerContextByPhase[P]>>) => unknown;
}

/** Snapshots descriptor authoring without calling accessors or a callback. */
export function snapshotSchedulerContextCallback<P extends SchedulerContextPhase>(
  phase: P,
  value: unknown
):
  | SchedulerContextCallbackInput<SchedulerContextByPhase[P], SchedulerContextResultByPhase[P]>
  | undefined {
  return snapshotContextCallback<[], SchedulerContextByPhase[P], SchedulerContextResultByPhase[P]>(
    value,
    keysForPhase(phase)
  );
}

/** Revalidates raw private entry inputs, then captures a callable and the exact production request. */
export function normalizeSchedulerContextCallback<P extends SchedulerContextPhase>(
  phase: P,
  value: unknown
): NormalizedSchedulerContextCallback<P> | undefined {
  return normalizeContextCallback<[], SchedulerContextByPhase[P]>(value, keysForPhase(phase));
}

export function unionSchedulerContextNeeds<P extends SchedulerContextPhase>(
  phase: P,
  participants: readonly NormalizedSchedulerContextCallback<P>[]
): readonly (keyof SchedulerContextByPhase[P])[] {
  const requested = new Set(participants.flatMap((participant) => participant.contextNeeds));
  return Object.freeze(keysForPhase(phase).filter((key) => requested.has(key)));
}

function keysForPhase<P extends SchedulerContextPhase>(
  phase: P
): readonly (keyof SchedulerContextByPhase[P])[] {
  // The mapped annotation checks each field against its actual Context, not an open string grammar.
  const keys: {
    readonly [K in SchedulerContextPhase]: readonly (keyof SchedulerContextByPhase[K])[];
  } = CONTEXT_KEYS;
  return keys[phase];
}
