import { snapshotClosedArray, snapshotClosedPolicyRecord } from "../data-boundary/closed-values.ts";
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
    "measurement",
    "runningTaskIds",
    "runtime",
    "settledTaskIds"
  ] as const),
  terminal: Object.freeze(["execution", "graph", "rawMeasurement"] as const)
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
  if (isCallback<P>(value)) return value;
  const descriptor = snapshotClosedPolicyRecord(value, {
    required: ["callback"],
    optional: ["contextNeeds"]
  });
  if (descriptor === undefined || !isCallback<P>(descriptor.callback)) return undefined;
  const needs = snapshotNeeds(phase, descriptor.contextNeeds);
  if (needs === undefined) return undefined;
  return Object.freeze({
    callback: descriptor.callback,
    ...(descriptor.contextNeeds === undefined ? {} : { contextNeeds: needs })
  });
}

/** Revalidates raw private entry inputs, then captures a callable and the exact production request. */
export function normalizeSchedulerContextCallback<P extends SchedulerContextPhase>(
  phase: P,
  value: unknown
): NormalizedSchedulerContextCallback<P> | undefined {
  const snapshot = snapshotSchedulerContextCallback(phase, value);
  if (snapshot === undefined) return undefined;
  const callback = typeof snapshot === "function" ? snapshot : snapshot.callback;
  const contextNeeds =
    typeof snapshot === "function" || snapshot.contextNeeds === undefined
      ? keysForPhase(phase)
      : snapshot.contextNeeds;
  return Object.freeze({
    contextNeeds,
    invoke: (context: Readonly<Partial<SchedulerContextByPhase[P]>>) => {
      const result: unknown = Reflect.apply(callback, undefined, [context]);
      return result;
    }
  });
}

export function unionSchedulerContextNeeds<P extends SchedulerContextPhase>(
  phase: P,
  participants: readonly NormalizedSchedulerContextCallback<P>[]
): readonly (keyof SchedulerContextByPhase[P])[] {
  const requested = new Set(participants.flatMap((participant) => participant.contextNeeds));
  return Object.freeze(keysForPhase(phase).filter((key) => requested.has(key)));
}

function snapshotNeeds<P extends SchedulerContextPhase>(
  phase: P,
  value: unknown
): readonly (keyof SchedulerContextByPhase[P])[] | undefined {
  if (value === undefined) return keysForPhase(phase);
  const values = snapshotClosedArray(value);
  if (values === undefined) return undefined;
  const selected: (keyof SchedulerContextByPhase[P])[] = [];
  const keys = keysForPhase(phase);
  for (const token of values) {
    const key = keys.find((candidate) => candidate === token);
    if (key === undefined) return undefined;
    if (!selected.includes(key)) selected.push(key);
  }
  return Object.freeze(keys.filter((key) => selected.includes(key)));
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

function isCallback<P extends SchedulerContextPhase>(
  value: unknown
): value is (this: void, context: SchedulerContextByPhase[P]) => SchedulerContextResultByPhase[P] {
  // Only callability is validated here. Each lifecycle owner validates the eventual returned value.
  return typeof value === "function";
}
