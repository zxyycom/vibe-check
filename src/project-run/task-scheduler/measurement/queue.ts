import { SchedulerQueueConstraints } from "./queue-constraints.ts";
import type { AdmissionCoreState } from "../admission-core/selection.ts";
import {
  admissionQueueLocalKindForCore,
  isAdmissionViablePendingTaskForCore
} from "../admission-core/selection-query.ts";
import {
  effectiveMaxParallelForCore,
  relationReadyTaskSlotsForCore
} from "../admission-core/state-query.ts";
import { ZERO_DELAY, subtractDelay, type ExactAdmissionDelay } from "./exact-contributions.ts";

type LocalQueueKind = ReturnType<typeof admissionQueueLocalKindForCore>;
interface ClockMark {
  readonly elapsed: bigint;
  readonly open: bigint;
  readonly closed: bigint;
}
interface QueueGroup {
  readonly representative: number;
  members: number;
  localKind: LocalQueueKind;
  settled: ExactAdmissionDelay;
  mark: ClockMark;
}
type TaskDelayMark =
  | Readonly<{ kind: "pending"; groupSlot: number; baseline: ExactAdmissionDelay }>
  | Readonly<{ kind: "finished"; delay: ExactAdmissionDelay }>;
export interface QueueCounts {
  readonly admissionViablePending: number;
  readonly mutexBlocked: number;
  readonly capacityBlocked: number;
  readonly admissiblePending: number;
}
export interface QueuePeaks {
  readonly admissionViablePendingTaskCount: number;
  readonly mutexBlockedTaskCount: number;
  readonly capacityBlockedTaskCount: number;
  readonly admissiblePendingTaskCount: number;
}
const ZERO_MARK: ClockMark = Object.freeze({ elapsed: 0n, open: 0n, closed: 0n });

/** Measurement-only indexes and clocks; Core remains the sole readiness/legality owner. */
export class SchedulerQueueMeasurements {
  #core: AdmissionCoreState;
  readonly #groups: QueueGroup[] = [];
  readonly #constraints: SchedulerQueueConstraints;
  readonly #taskDelays: Map<number, TaskDelayMark> | undefined;
  readonly #withPeaks: boolean;
  #mutexCount = 0;
  #localCapacityCount = 0;
  #sharedCapacityCount = 0;
  #isGlobalCapacityOpen: boolean;
  #elapsed = 0n;
  #open = 0n;
  #closed = 0n;
  #peaks: QueuePeaks = {
    admissionViablePendingTaskCount: 0,
    mutexBlockedTaskCount: 0,
    capacityBlockedTaskCount: 0,
    admissiblePendingTaskCount: 0
  };

  constructor(core: AdmissionCoreState, options: Readonly<{ delays: boolean; peaks: boolean }>) {
    this.#core = core;
    this.#taskDelays = options.delays ? new Map() : undefined;
    this.#withPeaks = options.peaks;
    this.#isGlobalCapacityOpen =
      core.selection.memberships.status.running.size < effectiveMaxParallelForCore(core);
    this.#constraints = this.#compileGroups(core);
    for (const slot of relationReadyTaskSlotsForCore(core)) {
      if (isAdmissionViablePendingTaskForCore(core, slot)) this.#enter(slot, true, core);
    }
    this.#capturePeaks();
  }

  /** Advances shared clocks only, including a root/active-scope gate flip: no pending/group retag. */
  public addInterval(elapsed: bigint): void {
    if (this.#taskDelays === undefined) return;
    this.#elapsed += elapsed;
    if (this.#isGlobalCapacityOpen) this.#open += elapsed;
    else this.#closed += elapsed;
  }

  public capture(core: AdmissionCoreState, timingAvailable: boolean): void {
    if (core === this.#core) return;
    const delta = core.lastTransition;
    if (delta === undefined) throw new Error("measurement capture has no Core transition delta");
    const dirty = this.#constraints.affectedGroups(core, delta);
    for (const slot of delta.membership.relationReady.removed) {
      if (isAdmissionViablePendingTaskForCore(this.#core, slot)) this.#leave(slot);
    }
    for (const groupSlot of dirty) {
      const group = this.#requiredGroup(groupSlot);
      if (group.members > 0) this.#refresh(group, core);
    }
    for (const slot of delta.membership.relationReady.added) {
      if (isAdmissionViablePendingTaskForCore(core, slot)) this.#enter(slot, timingAvailable, core);
    }
    this.#core = core;
    this.#isGlobalCapacityOpen =
      core.selection.memberships.status.running.size < effectiveMaxParallelForCore(core);
    this.#capturePeaks();
  }

  public counts(): QueueCounts {
    return {
      admissionViablePending:
        this.#mutexCount + this.#localCapacityCount + this.#sharedCapacityCount,
      mutexBlocked: this.#mutexCount,
      capacityBlocked:
        this.#localCapacityCount + (this.#isGlobalCapacityOpen ? 0 : this.#sharedCapacityCount),
      admissiblePending: this.#isGlobalCapacityOpen ? this.#sharedCapacityCount : 0
    };
  }
  public peaks(): QueuePeaks {
    return Object.freeze({ ...this.#peaks });
  }
  public takeAdmissionDelay(taskId: string): ExactAdmissionDelay | undefined {
    const slot = this.#core.compiled.taskSlotsById.get(taskId);
    if (slot === undefined) return undefined;
    const mark = this.#taskDelays?.get(slot);
    if (mark === undefined) return undefined;
    const delay = this.#delayFor(mark);
    this.#taskDelays?.delete(slot);
    return delay;
  }
  public pendingAdmissionDelays(): readonly Readonly<{
    taskId: string;
    admissionDelay: ExactAdmissionDelay;
  }>[] {
    return [...(this.#taskDelays ?? [])].map(([slot, mark]) => {
      const taskId = this.#core.compiled.graph.tasks[slot]?.id;
      if (taskId === undefined) throw new Error("measurement Task slot is missing");
      return { taskId, admissionDelay: this.#delayFor(mark) };
    });
  }

  #compileGroups(core: AdmissionCoreState): SchedulerQueueConstraints {
    const compiled = core.compiled;
    for (const [slot, groupSlot] of compiled.constraintGroups.taskGroupSlots.entries()) {
      if (this.#groups[groupSlot] !== undefined) continue;
      this.#groups[groupSlot] = {
        representative: slot,
        members: 0,
        localKind: admissionQueueLocalKindForCore(core, slot),
        settled: ZERO_DELAY,
        mark: ZERO_MARK
      };
    }
    return new SchedulerQueueConstraints(core, this.#groups);
  }
  #requiredGroup(slot: number): QueueGroup {
    const group = this.#groups[slot];
    if (group === undefined) throw new Error("measurement constraint group is missing");
    return group;
  }
  #groupForTask(slot: number): QueueGroup {
    const groupSlot = this.#core.compiled.constraintGroups.taskGroupSlots[slot];
    if (groupSlot === undefined) throw new Error("measurement Task group is missing");
    return this.#requiredGroup(groupSlot);
  }
  #enter(slot: number, timingAvailable: boolean, core: AdmissionCoreState): void {
    const group = this.#groupForTask(slot);
    if (group.members === 0) this.#refresh(group, core);
    group.members++;
    this.#adjustCount(group.localKind, 1);
    if (this.#taskDelays !== undefined && timingAvailable) {
      const groupSlot = core.compiled.constraintGroups.taskGroupSlots[slot];
      if (groupSlot === undefined) throw new Error("measurement Task group is missing");
      this.#taskDelays.set(slot, { kind: "pending", groupSlot, baseline: this.#clocksFor(group) });
    }
  }
  #leave(slot: number): void {
    const group = this.#groupForTask(slot);
    const mark = this.#taskDelays?.get(slot);
    if (mark !== undefined)
      this.#taskDelays?.set(slot, { kind: "finished", delay: this.#delayFor(mark) });
    group.members--;
    this.#adjustCount(group.localKind, -1);
  }
  #refresh(group: QueueGroup, core: AdmissionCoreState): void {
    const localKind = admissionQueueLocalKindForCore(core, group.representative);
    if (localKind === group.localKind) return;
    if (this.#taskDelays !== undefined) {
      group.settled = this.#clocksFor(group);
      group.mark = { elapsed: this.#elapsed, open: this.#open, closed: this.#closed };
    }
    this.#adjustCount(group.localKind, -group.members);
    group.localKind = localKind;
    this.#adjustCount(group.localKind, group.members);
  }
  #adjustCount(localKind: LocalQueueKind, amount: number): void {
    if (localKind === "mutex-blocked") this.#mutexCount += amount;
    else if (localKind === "capacity-blocked") this.#localCapacityCount += amount;
    else this.#sharedCapacityCount += amount;
  }
  #clocksFor(group: QueueGroup): ExactAdmissionDelay {
    const elapsed = this.#elapsed - group.mark.elapsed;
    return {
      mutexBlockedMs:
        group.settled.mutexBlockedMs + (group.localKind === "mutex-blocked" ? elapsed : 0n),
      capacityBlockedMs:
        group.settled.capacityBlockedMs +
        (group.localKind === "capacity-blocked" ? elapsed : 0n) +
        (group.localKind === "shared-capacity" ? this.#closed - group.mark.closed : 0n),
      admissiblePendingMs:
        group.settled.admissiblePendingMs +
        (group.localKind === "shared-capacity" ? this.#open - group.mark.open : 0n)
    };
  }
  #delayFor(mark: TaskDelayMark): ExactAdmissionDelay {
    return mark.kind === "finished"
      ? mark.delay
      : subtractDelay(this.#clocksFor(this.#requiredGroup(mark.groupSlot)), mark.baseline);
  }
  #capturePeaks(): void {
    if (!this.#withPeaks) return;
    const counts = this.counts();
    this.#peaks = {
      admissionViablePendingTaskCount: Math.max(
        this.#peaks.admissionViablePendingTaskCount,
        counts.admissionViablePending
      ),
      mutexBlockedTaskCount: Math.max(this.#peaks.mutexBlockedTaskCount, counts.mutexBlocked),
      capacityBlockedTaskCount: Math.max(
        this.#peaks.capacityBlockedTaskCount,
        counts.capacityBlocked
      ),
      admissiblePendingTaskCount: Math.max(
        this.#peaks.admissiblePendingTaskCount,
        counts.admissiblePending
      )
    };
  }
}
