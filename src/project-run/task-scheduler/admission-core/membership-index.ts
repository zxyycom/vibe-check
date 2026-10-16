import type { Set as PersistentSet } from "immutable";
import type { AdmissionSourceFacts, TaskPartitionKind, CoreTaskStatus } from "./selection-index.ts";
import { pendingRelationBlockerStageForSelection, statusForStore } from "./selection-index.ts";

export interface AdmissionMembershipIndex {
  readonly status: Readonly<Record<TaskPartitionKind, PersistentSet<number>>>;
  readonly relationReady: PersistentSet<number>;
}

export interface MembershipChanges {
  readonly added: readonly number[];
  readonly removed: readonly number[];
}

export interface TaskStatusMembershipChange {
  readonly taskSlot: number;
  readonly removed: TaskPartitionKind | undefined;
  readonly added: TaskPartitionKind | undefined;
}

export interface AdmissionMembershipDelta {
  readonly status: readonly TaskStatusMembershipChange[];
  readonly relationReady: MembershipChanges;
}

/** The transaction's single membership owner records actual changes while applying them. */
export function transitionTaskMemberships(
  input: Readonly<{
    previous: AdmissionMembershipIndex;
    facts: AdmissionSourceFacts;
    taskSlot: number;
    previousStatus: CoreTaskStatus;
    affectedRelationSlots: ReadonlySet<number>;
  }>
): Readonly<{ memberships: AdmissionMembershipIndex; delta: AdmissionMembershipDelta }> {
  const { previous, facts, taskSlot, previousStatus, affectedRelationSlots } = input;
  const nextStatus = statusForStore(facts.statuses, taskSlot);
  const status = { ...previous.status };
  if (previousStatus.kind !== "absent")
    status[previousStatus.kind] = status[previousStatus.kind].delete(taskSlot);
  if (nextStatus.kind !== "absent") status[nextStatus.kind] = status[nextStatus.kind].add(taskSlot);
  const added: number[] = [];
  const removed: number[] = [];
  const relationReady = previous.relationReady.withMutations((batch) => {
    for (const slot of affectedRelationSlots) {
      const wasReady = previous.relationReady.has(slot);
      const isReady =
        statusForStore(facts.statuses, slot).kind === "pending" &&
        pendingRelationBlockerStageForSelection(facts.relations, slot) === undefined;
      if (wasReady === isReady) continue;
      if (isReady) {
        batch.add(slot);
        added.push(slot);
      } else {
        batch.delete(slot);
        removed.push(slot);
      }
    }
  });
  return Object.freeze({
    memberships: Object.freeze({ status: Object.freeze(status), relationReady }),
    delta: Object.freeze({
      status: Object.freeze([
        Object.freeze({
          taskSlot,
          removed: previousStatus.kind === "absent" ? undefined : previousStatus.kind,
          added: nextStatus.kind === "absent" ? undefined : nextStatus.kind
        })
      ]),
      relationReady: Object.freeze({ added: Object.freeze(added), removed: Object.freeze(removed) })
    })
  });
}
