import type {
  AdmissionPolicyMeasurement,
  SchedulerDecisionMeasurementCumulative,
  SchedulerMeasurementActionObservation,
  SchedulerMeasurementEffect,
  SchedulerMeasurementIntervalContribution,
  SchedulerMeasurementTiming
} from "../../project-definition/project-definition.ts";

type AcceptedPolicyAction =
  | Readonly<{ readonly kind: "select"; readonly taskId: string }>
  | Readonly<{ readonly kind: "wait"; readonly taskId: null }>;

type PendingPolicyAction = AcceptedPolicyAction & {
  readonly baseline: SchedulerMeasurementIntervalContribution;
  readonly effects: SchedulerMeasurementEffect[];
  readonly sequence: number;
};

/** Owns the immutable prefix of observations formed after accepted custom-policy actions. */
export class SchedulerPolicyMeasurement {
  #pendingAction: PendingPolicyAction | undefined;
  #actionSequence = 0;
  readonly #actionObservations: SchedulerMeasurementActionObservation[] = [];

  public beginSelected(taskId: string, baseline: SchedulerMeasurementIntervalContribution): void {
    this.#begin(Object.freeze({ kind: "select", taskId }), baseline);
  }

  public beginWait(baseline: SchedulerMeasurementIntervalContribution): void {
    this.#begin(Object.freeze({ kind: "wait", taskId: null }), baseline);
  }

  public recordEffect(effect: SchedulerMeasurementEffect): void {
    this.#pendingAction?.effects.push(Object.freeze({ ...effect }));
  }

  public complete(
    totals: SchedulerMeasurementIntervalContribution,
    timing: SchedulerMeasurementTiming
  ): void {
    const action = this.#pendingAction;
    if (action === undefined) return;
    this.#pendingAction = undefined;
    const interval =
      timing.availability === "available"
        ? Object.freeze({
            availability: "available" as const,
            contribution: subtractIntervalContribution(totals, action.baseline)
          })
        : Object.freeze({ availability: "unavailable" as const, reason: timing.reason });
    this.#actionObservations.push(completedObservation(action, interval));
  }

  public snapshot(cumulative: SchedulerDecisionMeasurementCumulative): AdmissionPolicyMeasurement {
    const endCount = this.#actionObservations.length;
    const measurementAt = Object.freeze((index: number) => this.#measurementAt(index, endCount));
    return Object.freeze({ cumulative, measurementAt, measurementCount: endCount });
  }

  #begin(action: AcceptedPolicyAction, baseline: SchedulerMeasurementIntervalContribution): void {
    if (this.#pendingAction !== undefined) {
      throw new Error("previous policy action was not observed before the next action");
    }
    const sequence = ++this.#actionSequence;
    this.#pendingAction = Object.assign({ baseline, effects: [], sequence }, action);
  }

  #measurementAt(
    index: number,
    endCount: number
  ): SchedulerMeasurementActionObservation | undefined {
    if (!Number.isSafeInteger(index) || index < 0 || index >= endCount) return undefined;
    return this.#actionObservations[index];
  }
}

function completedObservation(
  action: PendingPolicyAction,
  interval: SchedulerMeasurementActionObservation["interval"]
): SchedulerMeasurementActionObservation {
  const facts = {
    effects: Object.freeze([...action.effects]),
    interval,
    sequence: action.sequence
  };
  return action.kind === "select"
    ? Object.freeze({ ...facts, kind: "select", taskId: action.taskId })
    : Object.freeze({ ...facts, kind: "wait", taskId: null });
}

function subtractIntervalContribution(
  current: SchedulerMeasurementIntervalContribution,
  prior: SchedulerMeasurementIntervalContribution
): SchedulerMeasurementIntervalContribution {
  return Object.freeze({
    admissiblePendingTaskMs: current.admissiblePendingTaskMs - prior.admissiblePendingTaskMs,
    acceptedWaitMs: current.acceptedWaitMs - prior.acceptedWaitMs,
    capacityBlockedTaskMs: current.capacityBlockedTaskMs - prior.capacityBlockedTaskMs,
    effectiveCapacitySlotMs: current.effectiveCapacitySlotMs - prior.effectiveCapacitySlotMs,
    mutexBlockedTaskMs: current.mutexBlockedTaskMs - prior.mutexBlockedTaskMs,
    rootCapacitySlotMs: current.rootCapacitySlotMs - prior.rootCapacitySlotMs,
    taskSlotMs: current.taskSlotMs - prior.taskSlotMs
  });
}
