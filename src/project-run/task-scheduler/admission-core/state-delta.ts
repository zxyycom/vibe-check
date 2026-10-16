import type { CoreTaskStatus, ScopeLifecycle } from "./selection-index.ts";
import type { AdmissionMembershipDelta, MembershipChanges } from "./membership-index.ts";

export type AdmissionCounterKind =
  | "pendingDependencies"
  | "pendingObservations"
  | "nonCompletedDependencies"
  | "mutexHolders"
  | "resourceInUse";
export interface AdmissionCounterChange {
  readonly kind: AdmissionCounterKind;
  readonly slot: number;
  readonly before: number;
  readonly after: number;
}
export interface AdmissionStatusChange {
  readonly taskSlot: number;
  readonly previous: CoreTaskStatus;
  readonly next: CoreTaskStatus;
}
export interface AdmissionScopeChange {
  readonly scopeSlot: number;
  readonly previous: ScopeLifecycle;
  readonly next: ScopeLifecycle;
}
/** Only facts of this successor's transaction; no state references or accumulated history. */
export interface AdmissionStateDelta {
  readonly status: readonly AdmissionStatusChange[];
  readonly membership: AdmissionMembershipDelta;
  readonly counters: readonly AdmissionCounterChange[];
  readonly scopes: readonly AdmissionScopeChange[];
  readonly activeScopes: MembershipChanges;
  readonly running: Readonly<{ before: number; after: number }>;
}

/** Cancellation is observed once; compose net changes without exposing zero-duration intermediate membership. */
export function composeAdmissionStateDeltas(
  deltas: readonly AdmissionStateDelta[]
): AdmissionStateDelta | undefined {
  const first = deltas[0];
  const last = deltas.at(-1);
  if (first === undefined || last === undefined) return undefined;
  const statuses = composeStatusChanges(deltas);
  const counters = composeCounterChanges(deltas);
  const scopes = composeScopeChanges(deltas);
  return Object.freeze({
    status: statuses,
    membership: Object.freeze({
      status: Object.freeze(statuses.map(statusMembershipChange)),
      relationReady: composeMembershipChanges(deltas.map((delta) => delta.membership.relationReady))
    }),
    counters: counters,
    scopes: scopes,
    activeScopes: composeMembershipChanges(deltas.map((delta) => delta.activeScopes)),
    running: Object.freeze({ before: first.running.before, after: last.running.after })
  });
}

function composeMembershipChanges(deltas: readonly MembershipChanges[]): MembershipChanges {
  const membership = new Map<number, { before: boolean; after: boolean }>();
  for (const delta of deltas) {
    for (const slot of delta.added)
      membership.set(slot, { before: membership.get(slot)?.before ?? false, after: true });
    for (const slot of delta.removed)
      membership.set(slot, { before: membership.get(slot)?.before ?? true, after: false });
  }
  return netMembershipChanges(membership);
}

function composeStatusChanges(
  deltas: readonly AdmissionStateDelta[]
): readonly AdmissionStatusChange[] {
  const changes = new Map<number, AdmissionStatusChange>();
  for (const delta of deltas) {
    for (const change of delta.status) {
      changes.set(
        change.taskSlot,
        Object.freeze({
          ...change,
          previous: changes.get(change.taskSlot)?.previous ?? change.previous
        })
      );
    }
  }
  return Object.freeze([...changes.values()]);
}
function composeCounterChanges(
  deltas: readonly AdmissionStateDelta[]
): readonly AdmissionCounterChange[] {
  const changes = new Map<string, AdmissionCounterChange>();
  for (const delta of deltas) {
    for (const change of delta.counters) {
      const key = `${change.kind}:${change.slot}`;
      changes.set(
        key,
        Object.freeze({ ...change, before: changes.get(key)?.before ?? change.before })
      );
    }
  }
  return Object.freeze([...changes.values()].filter((change) => change.before !== change.after));
}
function composeScopeChanges(
  deltas: readonly AdmissionStateDelta[]
): readonly AdmissionScopeChange[] {
  const changes = new Map<number, AdmissionScopeChange>();
  for (const delta of deltas) {
    for (const change of delta.scopes) {
      changes.set(
        change.scopeSlot,
        Object.freeze({
          ...change,
          previous: changes.get(change.scopeSlot)?.previous ?? change.previous
        })
      );
    }
  }
  return Object.freeze([...changes.values()].filter((change) => change.previous !== change.next));
}
function statusMembershipChange(change: AdmissionStatusChange) {
  return Object.freeze({
    taskSlot: change.taskSlot,
    removed: change.previous.kind === "absent" ? undefined : change.previous.kind,
    added: change.next.kind === "absent" ? undefined : change.next.kind
  });
}
function netMembershipChanges(
  membership: ReadonlyMap<number, Readonly<{ before: boolean; after: boolean }>>
): MembershipChanges {
  const added: number[] = [];
  const removed: number[] = [];
  for (const [slot, change] of membership)
    if (change.before !== change.after) (change.after ? added : removed).push(slot);
  return Object.freeze({ added: Object.freeze(added), removed: Object.freeze(removed) });
}
