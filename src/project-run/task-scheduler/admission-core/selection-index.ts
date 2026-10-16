import { List } from "immutable";
import type { ReadyGroupFrontier } from "./ready-frontier.ts";
import type { StaticGroupFrontier } from "./static-frontier.ts";
import type { AdmissionMembershipIndex } from "./membership-index.ts";
import {
  mergeTaskQueues,
  queueWithTask,
  type PersistentTaskQueue
} from "./persistent-task-queue.ts";
import type { SchedulerSettlementKind } from "../scheduler-decision-model.ts";

export type CoreTaskStatus =
  | Readonly<{ kind: "pending" }>
  /** Only used while adapting private partial SchedulerSnapshot test inputs. */
  | Readonly<{ kind: "absent" }>
  | Readonly<{ kind: "running" }>
  | Readonly<{ kind: "settled"; settlementKind: SchedulerSettlementKind }>;
export const PENDING: CoreTaskStatus = Object.freeze({ kind: "pending" });
export const ABSENT: CoreTaskStatus = Object.freeze({ kind: "absent" });
export type PersistentIndexedStore<T> = Readonly<{ values: List<T> }>;
export type NumberStore = PersistentIndexedStore<number>;
export type StatusStore = PersistentIndexedStore<CoreTaskStatus>;
export type ScopeLifecycle = "inactive" | "active" | "closed";
export type ScopeStore = PersistentIndexedStore<ScopeLifecycle>;
export type ForcedTaskQueue = PersistentTaskQueue | undefined;
export type PendingBlockerStage = "depends-on-pending" | "mutex-held" | "observes-pending";
export type TaskPartitionKind = "pending" | "running" | "settled";

export interface AdmissionRelationFacts {
  readonly nonCompletedDependencies: NumberStore;
  readonly pendingObservations: NumberStore;
  readonly pendingDependencies: NumberStore;
}
export interface AdmissionOccupancyFacts {
  readonly mutexHolders: NumberStore;
  readonly resourceInUse: NumberStore;
}
/** Canonical facts have no policy ordering or observation-only state. */
export interface AdmissionSourceFacts {
  readonly statuses: StatusStore;
  readonly relations: AdmissionRelationFacts;
  readonly occupancy: AdmissionOccupancyFacts;
  readonly scopes: ScopeStore;
  readonly legacyRunningMutexes: readonly string[] | undefined;
}
export interface AdmissionSelectionFrontiers {
  readonly ready: ReadyGroupFrontier;
  readonly static: StaticGroupFrontier;
  readonly forced: ForcedTaskQueue;
  /** Ordered current roots serve minimum-cap lookup and ordered public enumeration. */
  readonly activeScopeOrder: readonly number[];
}
export interface AdmissionSelectionIndex {
  readonly facts: AdmissionSourceFacts;
  readonly memberships: AdmissionMembershipIndex;
  readonly frontiers: AdmissionSelectionFrontiers;
}

/** Shared relation predicate. Mutex, resources and global gates are deliberately not task labels. */
export function pendingRelationBlockerStageForSelection(
  relations: Pick<AdmissionRelationFacts, "pendingDependencies" | "pendingObservations">,
  taskSlot: number
): Exclude<PendingBlockerStage, "mutex-held"> | undefined {
  if (numberFor(relations.pendingDependencies, taskSlot) > 0) return "depends-on-pending";
  if (numberFor(relations.pendingObservations, taskSlot) > 0) return "observes-pending";
  return undefined;
}
export function persistentStatuses(values: readonly CoreTaskStatus[]): StatusStore {
  return Object.freeze({ values: List(values) });
}
export function persistentNumbersFor(values: readonly number[]): NumberStore {
  return Object.freeze({ values: List(values) });
}
export function persistentScopesFor(values: readonly ScopeLifecycle[]): ScopeStore {
  return Object.freeze({ values: List(values) });
}
export function statusForSelection(
  selection: AdmissionSelectionIndex,
  taskSlot: number
): CoreTaskStatus {
  return statusForStore(selection.facts.statuses, taskSlot);
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
export function scopeForStore(store: ScopeStore, scopeSlot: number): ScopeLifecycle {
  const value = store.values.get(scopeSlot);
  if (value === undefined) throw new Error(`admission core scope slot is unknown: ${scopeSlot}`);
  return value;
}
export function forcedTaskSlotFor(selection: AdmissionSelectionIndex): number | undefined {
  return selection.frontiers.forced?.taskSlot;
}
export function withoutForcedTask(selection: AdmissionSelectionIndex): AdmissionSelectionIndex {
  const root = selection.frontiers.forced;
  if (root === undefined) return selection;
  return Object.freeze({
    ...selection,
    frontiers: Object.freeze({
      ...selection.frontiers,
      forced: mergeTaskQueues(root.left, root.right)
    })
  });
}
export function forcedQueueFromTaskSlots(taskSlots: readonly number[]): ForcedTaskQueue {
  let queue: ForcedTaskQueue;
  for (const taskSlot of taskSlots) queue = forcedQueueWithTask(queue, taskSlot);
  return queue;
}
export function enqueueForcedTaskSlots(
  existing: ForcedTaskQueue,
  additions: ReadonlySet<number>
): ForcedTaskQueue {
  let queue = existing;
  for (const taskSlot of additions) queue = forcedQueueWithTask(queue, taskSlot);
  return queue;
}
function forcedQueueWithTask(queue: ForcedTaskQueue, taskSlot: number): ForcedTaskQueue {
  return queueWithTask(queue, { taskSlot, preferenceRank: -taskSlot });
}

/** A pending cancellation may leave a queued forced entry; prune each stale root once. */
export function liveForcedQueue(queue: ForcedTaskQueue, statuses: StatusStore): ForcedTaskQueue {
  let current = queue;
  while (current !== undefined && statusForStore(statuses, current.taskSlot).kind !== "pending")
    current = mergeTaskQueues(current.left, current.right);
  return current;
}
