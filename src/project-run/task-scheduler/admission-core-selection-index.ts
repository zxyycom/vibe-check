import { List } from "immutable";

import type { SchedulerSettlementKind } from "./scheduler-decision-model.ts";

export type CoreTaskStatus =
  | Readonly<{ readonly kind: "pending" }>
  /** Only used while adapting private partial SchedulerSnapshot test inputs. */
  | Readonly<{ readonly kind: "absent" }>
  | Readonly<{ readonly kind: "running" }>
  | Readonly<{ readonly kind: "settled"; readonly settlementKind: SchedulerSettlementKind }>;

export const PENDING: CoreTaskStatus = Object.freeze({ kind: "pending" });
export const ABSENT: CoreTaskStatus = Object.freeze({ kind: "absent" });

/** Immutable.List is the persistent indexed backing for every dense selection counter. */
export type PersistentIndexedStore<T> = Readonly<{
  readonly values: List<T>;
}>;

export type NumberStore = PersistentIndexedStore<number>;
export type StatusStore = PersistentIndexedStore<CoreTaskStatus>;

/** Persistent leftist max-heap: task slots are the canonical forced-effect priority. */
export type ForcedTaskQueue =
  | undefined
  | Readonly<{
      readonly left: ForcedTaskQueue;
      readonly rank: number;
      readonly right: ForcedTaskQueue;
      readonly taskSlot: number;
    }>;

/** Private dynamic index shared by the seed, delta reducer and read-only query owners. */
export interface AdmissionSelectionIndex {
  readonly activeScopeSlots: readonly number[];
  readonly activeScopes: NumberStore;
  readonly forcedQueue: ForcedTaskQueue;
  readonly legacyRunningMutexes: readonly string[] | undefined;
  readonly mutexHolders: NumberStore;
  /** Per-task reverse-mutex occurrence count; candidate sieving never builds mutex payloads. */
  readonly heldMutexBlockers: NumberStore;
  readonly nonCompletedDependencies: NumberStore;
  readonly pendingObservations: NumberStore;
  readonly pendingDependencies: NumberStore;
  readonly remainingTaskCount: number;
  readonly runningTotal: number;
  readonly statuses: StatusStore;
}

export function persistentStatuses(values: readonly CoreTaskStatus[]): StatusStore {
  return Object.freeze({ values: List(values) });
}

export function persistentNumbersFor(values: readonly number[]): NumberStore {
  return Object.freeze({ values: List(values) });
}

export function statusForSelection(
  selection: AdmissionSelectionIndex,
  taskSlot: number
): CoreTaskStatus {
  return statusForStore(selection.statuses, taskSlot);
}

export function statusForStore(store: StatusStore, taskSlot: number): CoreTaskStatus {
  const value = store.values.get(taskSlot);
  if (value === undefined) throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return value;
}

export function withStatusAt(
  store: StatusStore,
  taskSlot: number,
  value: CoreTaskStatus
): StatusStore {
  if (taskSlot < 0 || taskSlot >= store.values.size)
    throw new Error(`admission core task slot is unknown: ${taskSlot}`);
  return Object.freeze({ values: store.values.set(taskSlot, value) });
}

export function numberFor(store: NumberStore, slot: number): number {
  const value = store.values.get(slot);
  if (value === undefined) throw new Error(`admission core index slot is unknown: ${slot}`);
  return value;
}

/** Applies all occurrence deltas through one new persistent List value. */
export function withNumberDeltas(
  store: NumberStore,
  deltas: readonly (readonly [number, number])[]
): NumberStore {
  if (deltas.length === 0) return store;
  const aggregated = new Map<number, number>();
  for (const [slot, delta] of deltas) aggregated.set(slot, (aggregated.get(slot) ?? 0) + delta);
  let values = store.values;
  for (const [slot, delta] of aggregated) {
    const current = values.get(slot);
    if (current === undefined) throw new Error(`admission core index slot is unknown: ${slot}`);
    values = values.set(slot, current + delta);
  }
  return Object.freeze({ values });
}

export function forcedTaskSlotFor(selection: AdmissionSelectionIndex): number | undefined {
  return selection.forcedQueue?.taskSlot;
}

/** Removes just the persistent heap root; all retained branches remain shared. */
export function withoutForcedTask(selection: AdmissionSelectionIndex): AdmissionSelectionIndex {
  const root = selection.forcedQueue;
  if (root === undefined) return selection;
  return freezeSelectionIndex({
    ...selection,
    forcedQueue: mergeForcedTaskQueues(root.left, root.right)
  });
}

export function forcedQueueFromTaskSlots(taskSlots: readonly number[]): ForcedTaskQueue {
  let queue: ForcedTaskQueue;
  for (const taskSlot of taskSlots) queue = forcedQueueWithTask(queue, taskSlot);
  return queue;
}

/** Additions are newly-ready reverse dependents, so no extant frontier is copied or sorted. */
export function enqueueForcedTaskSlots(
  existing: ForcedTaskQueue,
  additions: ReadonlySet<number>
): ForcedTaskQueue {
  let queue = existing;
  for (const taskSlot of additions) queue = forcedQueueWithTask(queue, taskSlot);
  return queue;
}

export function freezeSelectionIndex(selection: AdmissionSelectionIndex): AdmissionSelectionIndex {
  return Object.freeze(selection);
}

function forcedQueueRank(queue: ForcedTaskQueue): number {
  return queue?.rank ?? 0;
}

/** Merges by task slot; only the right spine is copied and retained branches stay shared. */
function mergeForcedTaskQueues(left: ForcedTaskQueue, right: ForcedTaskQueue): ForcedTaskQueue {
  if (left === undefined) return right;
  if (right === undefined) return left;
  if (left.taskSlot < right.taskSlot) return mergeForcedTaskQueues(right, left);
  const mergedRight = mergeForcedTaskQueues(left.right, right);
  const nextLeft =
    forcedQueueRank(left.left) >= forcedQueueRank(mergedRight) ? left.left : mergedRight;
  const nextRight = nextLeft === left.left ? mergedRight : left.left;
  return Object.freeze({
    left: nextLeft,
    rank: forcedQueueRank(nextRight) + 1,
    right: nextRight,
    taskSlot: left.taskSlot
  });
}

function forcedQueueWithTask(queue: ForcedTaskQueue, taskSlot: number): ForcedTaskQueue {
  return mergeForcedTaskQueues(
    queue,
    Object.freeze({ left: undefined, rank: 1, right: undefined, taskSlot })
  );
}
