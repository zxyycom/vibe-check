import type { SchedulerMeasurementIntervalContribution } from "../../../project-definition/project-definition.ts";
import type { SchedulerMeasurementGroups, SchedulerPerformanceState } from "./diagnostics.ts";
import type { SchedulerQueueMeasurements } from "./queue.ts";
import {
  ZERO_CONTRIBUTION,
  roundedContribution,
  type ExactIntervalContribution
} from "./exact-contributions.ts";
import { finiteNonnegative, roundedMilliseconds } from "./exact-time.ts";
/** Exact interval totals for fixed requested producers; queue classification has its own owner. */
export class SchedulerPerformanceIntegrals {
  readonly #groups: SchedulerMeasurementGroups;
  readonly #queue: SchedulerQueueMeasurements;
  #totals: ExactIntervalContribution = ZERO_CONTRIBUTION;
  readonly #quantumExponent: number;
  constructor(
    groups: SchedulerMeasurementGroups,
    queue: SchedulerQueueMeasurements,
    quantumExponent = -1074
  ) {
    this.#groups = groups;
    this.#queue = queue;
    this.#quantumExponent = quantumExponent;
  }
  public addInterval(elapsed: bigint, state: SchedulerPerformanceState): boolean {
    if (elapsed < 0n) return false;
    if (this.#groups.cumulative || this.#groups.runMeasurement || this.#groups.actionHistory) {
      const counts = this.#groups.actionHistory ? this.#queue.counts() : undefined;
      const prior = this.#totals;
      this.#totals = {
        acceptedWaitMs: 0n,
        taskSlotMs: prior.taskSlotMs + elapsed * BigInt(state.running),
        rootCapacitySlotMs: prior.rootCapacitySlotMs + elapsed * BigInt(state.rootMaxParallel),
        effectiveCapacitySlotMs:
          prior.effectiveCapacitySlotMs + elapsed * BigInt(state.effectiveMaxParallel),
        mutexBlockedTaskMs: prior.mutexBlockedTaskMs + elapsed * BigInt(counts?.mutexBlocked ?? 0),
        capacityBlockedTaskMs:
          prior.capacityBlockedTaskMs + elapsed * BigInt(counts?.capacityBlocked ?? 0),
        admissiblePendingTaskMs:
          prior.admissiblePendingTaskMs + elapsed * BigInt(counts?.admissiblePending ?? 0)
      };
    }
    return true;
  }
  public exactTotals(): ExactIntervalContribution {
    return Object.freeze({ ...this.#totals });
  }
  public totals(): SchedulerMeasurementIntervalContribution {
    return roundedContribution(this.#totals, this.#quantumExponent);
  }
  /** Private action prefixes may overflow binary64; validate only demanded cumulative/Run scalars. */
  public validAggregateTotals(): boolean {
    if (!this.#groups.cumulative && !this.#groups.runMeasurement) return true;
    return [
      this.#totals.taskSlotMs,
      this.#totals.rootCapacitySlotMs,
      this.#totals.effectiveCapacitySlotMs
    ].every((units) => finiteNonnegative(roundedMilliseconds(units, this.#quantumExponent)));
  }
}
