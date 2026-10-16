import type {
  SchedulerActionHistory,
  SchedulerMeasurementActionObservation,
  SchedulerMeasurementEffect,
  SchedulerMeasurementTiming
} from "../../../project-definition/project-definition.ts";
import { finiteNonnegative } from "./exact-time.ts";
import {
  roundedContribution,
  subtractContribution,
  type ExactIntervalContribution
} from "./exact-contributions.ts";

type AcceptedPolicyAction =
  | Readonly<{ readonly kind: "select"; readonly taskId: string }>
  | Readonly<{ readonly kind: "wait"; readonly taskId: null }>;

type PendingPolicyAction = AcceptedPolicyAction & {
  readonly baseline: ExactIntervalContribution;
  readonly effects: SchedulerMeasurementEffect[];
  readonly sequence: number;
};

/** Owns the immutable prefix of observations formed after accepted custom-policy actions. */
export class SchedulerPolicyMeasurement {
  readonly #quantumExponent: number;
  #pendingAction: PendingPolicyAction | undefined;
  #actionSequence = 0;
  readonly #actionObservations: SchedulerMeasurementActionObservation[] = [];
  public constructor(quantumExponent = -1074) {
    this.#quantumExponent = quantumExponent;
  }

  public beginSelected(taskId: string, baseline: ExactIntervalContribution): void {
    this.#begin(Object.freeze({ kind: "select", taskId }), baseline);
  }

  public beginWait(baseline: ExactIntervalContribution): void {
    this.#begin(Object.freeze({ kind: "wait", taskId: null }), baseline);
  }

  public recordEffect(effect: SchedulerMeasurementEffect): void {
    this.#pendingAction?.effects.push(Object.freeze({ ...effect }));
  }

  public complete(totals: ExactIntervalContribution, timing: SchedulerMeasurementTiming): boolean {
    const action = this.#pendingAction;
    if (action === undefined) return true;
    this.#pendingAction = undefined;
    const contribution =
      timing.availability === "available"
        ? roundedContribution(subtractContribution(totals, action.baseline), this.#quantumExponent)
        : undefined;
    const valid =
      contribution === undefined || Object.values(contribution).every(finiteNonnegative);
    const interval =
      timing.availability === "available" && contribution !== undefined && valid
        ? Object.freeze({
            availability: "available" as const,
            contribution
          })
        : Object.freeze({
            availability: "unavailable" as const,
            reason:
              timing.availability === "unavailable" ? timing.reason : ("integral-invalid" as const)
          });
    this.#actionObservations.push(completedObservation(action, interval));
    return valid;
  }

  public snapshot(): SchedulerActionHistory {
    const endCount = this.#actionObservations.length;
    const measurementAt = Object.freeze((index: number) => this.#measurementAt(index, endCount));
    return Object.freeze({ measurementAt, measurementCount: endCount });
  }

  #begin(action: AcceptedPolicyAction, baseline: ExactIntervalContribution): void {
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
