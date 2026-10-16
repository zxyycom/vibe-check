import type { AdmissionCoreState } from "../admission-core/selection.ts";
import type { AdmissionCounterChange, AdmissionStateDelta } from "../admission-core/state-delta.ts";
import {
  requiredTaskMutexSlotsForCompiled,
  requiredTaskResourceClaimsForCompiled
} from "../admission-core/compiled-graph-lookup.ts";
import { requiredScopeForCore } from "../admission-core/state-query.ts";

interface ThresholdEntry {
  readonly threshold: number;
  readonly groupSlot: number;
}

/** Measurement-only influence indexes. All classification and legality stays in Core queries. */
export class SchedulerQueueConstraints {
  readonly #mutexGroups = new Map<number, number[]>();
  readonly #resourceThresholds = new Map<number, ThresholdEntry[]>();
  readonly #activationThresholds: ThresholdEntry[] = [];

  constructor(core: AdmissionCoreState, groups: readonly Readonly<{ representative: number }>[]) {
    const compiled = core.compiled;
    for (const [groupSlot, group] of groups.entries()) {
      const slot = group.representative;
      for (const mutex of new Set(requiredTaskMutexSlotsForCompiled(compiled, slot))) {
        const mutexGroups = this.#mutexGroups.get(mutex) ?? [];
        mutexGroups.push(groupSlot);
        this.#mutexGroups.set(mutex, mutexGroups);
      }
      for (const claim of requiredTaskResourceClaimsForCompiled(compiled, slot)) {
        const thresholds = this.#resourceThresholds.get(claim.resourceSlot) ?? [];
        thresholds.push({ threshold: claim.units, groupSlot });
        this.#resourceThresholds.set(claim.resourceSlot, thresholds);
      }
      const scopeSlot = compiled.constraintGroups.groupScopeSlots[groupSlot];
      if (
        scopeSlot !== undefined &&
        compiled.constraintGroups.groupActivatesScope[groupSlot] === true
      ) {
        this.#activationThresholds.push({
          threshold: requiredScopeForCore(core, scopeSlot).maxParallel,
          groupSlot
        });
      }
    }
    for (const entries of this.#resourceThresholds.values()) entries.sort(compareThreshold);
    this.#activationThresholds.sort(compareThreshold);
  }

  public affectedGroups(core: AdmissionCoreState, delta: AdmissionStateDelta): ReadonlySet<number> {
    const dirty = new Set<number>();
    for (const counter of delta.counters) this.#addCounterAffectedGroups(core, counter, dirty);
    const compiledGroups = core.compiled.constraintGroups;
    for (const scope of delta.scopes) {
      for (const groupSlot of compiledGroups.scopeGroupSlots[scope.scopeSlot] ?? []) {
        if (compiledGroups.groupActivatesScope[groupSlot] === true) dirty.add(groupSlot);
      }
    }
    addCrossed(this.#activationThresholds, delta.running.before, delta.running.after, dirty);
    return dirty;
  }

  #addCounterAffectedGroups(
    core: AdmissionCoreState,
    counter: AdmissionCounterChange,
    dirty: Set<number>
  ): void {
    if (counter.kind === "mutexHolders" && (counter.before === 0) !== (counter.after === 0)) {
      for (const groupSlot of this.#mutexGroups.get(counter.slot) ?? []) dirty.add(groupSlot);
    } else if (counter.kind === "resourceInUse") {
      const capacity = core.compiled.resourceCapacityBySlot[counter.slot];
      if (capacity === undefined) throw new Error("measurement resource capacity is missing");
      addCrossed(
        this.#resourceThresholds.get(counter.slot) ?? [],
        capacity - counter.before,
        capacity - counter.after,
        dirty
      );
    }
  }
}

function compareThreshold(left: ThresholdEntry, right: ThresholdEntry): number {
  return left.threshold - right.threshold || left.groupSlot - right.groupSlot;
}
function upperBound(entries: readonly ThresholdEntry[], threshold: number): number {
  let low = 0,
    high = entries.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((entries[mid]?.threshold ?? Number.POSITIVE_INFINITY) <= threshold) low = mid + 1;
    else high = mid;
  }
  return low;
}
function addCrossed(
  entries: readonly ThresholdEntry[],
  before: number,
  after: number,
  dirty: Set<number>
): void {
  if (before === after) return;
  const start = upperBound(entries, Math.min(before, after));
  const end = upperBound(entries, Math.max(before, after));
  for (let index = start; index < end; index++) {
    const groupSlot = entries[index]?.groupSlot;
    if (groupSlot !== undefined) dirty.add(groupSlot);
  }
}
