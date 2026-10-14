import { List, Set as PersistentSet } from "immutable";

import type { ReadyGroupFrontier } from "./ready-frontier.ts";
import type { StaticGroupFrontier } from "./static-frontier.ts";
import {
  mergeTaskQueues,
  queueWithTask,
  type PersistentTaskQueue
} from "./persistent-task-queue.ts";

import type { SchedulerSettlementKind } from "../scheduler-decision-model.ts";

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

/** Negative task slots retain canonical descending-slot forced-effect priority. */
export type ForcedTaskQueue = PersistentTaskQueue | undefined;

/** Primary relation/mutex blocker, shared by seed, transition and read-only query owners. */
export type PendingBlockerStage = "depends-on-pending" | "mutex-held" | "observes-pending";
export type TaskPartitionKind = "pending" | "running" | "settled";

export interface AdmissionSelectionIndex {
  /** Persistent memberships; order is applied only at consuming projection boundaries. */
  readonly taskSlotsByStatus: Readonly<Record<TaskPartitionKind, PersistentSet<number>>>;
  /** Pending tasks with resolved relations; mutex and capacity are evaluated dynamically. */
  readonly relationReadyTaskSlots: PersistentSet<number>;
  readonly readyGroupFrontier: ReadyGroupFrontier;
  readonly staticGroupFrontier: StaticGroupFrontier;
  readonly activeScopeSlotSet: PersistentSet<number>;
  readonly activeScopeSlots: readonly number[];
  readonly activeScopes: NumberStore;
  readonly forcedQueue: ForcedTaskQueue;
  readonly legacyRunningMutexes: readonly string[] | undefined;
  readonly mutexHolders: NumberStore;
  readonly nonCompletedDependencies: NumberStore;
  readonly pendingObservations: NumberStore;
  readonly pendingDependencies: NumberStore;
  readonly remainingTaskCount: number;
  readonly resourceInUse: NumberStore;
  readonly runningTotal: number;
  readonly statuses: StatusStore;
}

/** Shared relation readiness; mutex occupancy is judged dynamically by the query owner. */
export function pendingRelationBlockerStageForSelection(
  selection: Pick<AdmissionSelectionIndex, "pendingDependencies" | "pendingObservations">,
  taskSlot: number
): Exclude<PendingBlockerStage, "mutex-held"> | undefined {
  if (numberFor(selection.pendingDependencies, taskSlot) > 0) return "depends-on-pending";
  if (numberFor(selection.pendingObservations, taskSlot) > 0) return "observes-pending";
  return undefined;
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
  const values = store.values.withMutations((batch) => {
    for (const [slot, delta] of aggregated) {
      const current = batch.get(slot);
      if (current === undefined) throw new Error(`admission core index slot is unknown: ${slot}`);
      batch.set(slot, current + delta);
    }
  });
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
    forcedQueue: mergeTaskQueues(root.left, root.right)
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

function forcedQueueWithTask(queue: ForcedTaskQueue, taskSlot: number): ForcedTaskQueue {
  return queueWithTask(queue, { taskSlot, preferenceRank: -taskSlot });
}
