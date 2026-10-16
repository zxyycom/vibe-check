import type { SchedulerMeasurementIntervalContribution } from "../../../project-definition/project-definition.ts";
import { roundedMilliseconds } from "./exact-time.ts";

export interface ExactAdmissionDelay {
  readonly admissiblePendingMs: bigint;
  readonly capacityBlockedMs: bigint;
  readonly mutexBlockedMs: bigint;
}
export type ExactIntervalContribution = Readonly<{
  [Key in keyof SchedulerMeasurementIntervalContribution]: bigint;
}>;
export const ZERO_DELAY: ExactAdmissionDelay = Object.freeze({
  admissiblePendingMs: 0n,
  capacityBlockedMs: 0n,
  mutexBlockedMs: 0n
});
export const ZERO_CONTRIBUTION: ExactIntervalContribution = Object.freeze({
  admissiblePendingTaskMs: 0n,
  capacityBlockedTaskMs: 0n,
  mutexBlockedTaskMs: 0n,
  acceptedWaitMs: 0n,
  effectiveCapacitySlotMs: 0n,
  rootCapacitySlotMs: 0n,
  taskSlotMs: 0n
});
export function subtractDelay(
  current: ExactAdmissionDelay,
  prior: ExactAdmissionDelay
): ExactAdmissionDelay {
  return {
    admissiblePendingMs: current.admissiblePendingMs - prior.admissiblePendingMs,
    capacityBlockedMs: current.capacityBlockedMs - prior.capacityBlockedMs,
    mutexBlockedMs: current.mutexBlockedMs - prior.mutexBlockedMs
  };
}
export function roundDelay(delay: ExactAdmissionDelay, quantumExponent = -1074) {
  return Object.freeze({
    admissiblePendingMs: roundedMilliseconds(delay.admissiblePendingMs, quantumExponent),
    capacityBlockedMs: roundedMilliseconds(delay.capacityBlockedMs, quantumExponent),
    mutexBlockedMs: roundedMilliseconds(delay.mutexBlockedMs, quantumExponent)
  });
}
export function totalDelay(delay: ExactAdmissionDelay): bigint {
  return delay.admissiblePendingMs + delay.capacityBlockedMs + delay.mutexBlockedMs;
}
export function roundedContribution(
  exact: ExactIntervalContribution,
  quantumExponent = -1074
): SchedulerMeasurementIntervalContribution {
  return Object.freeze({
    acceptedWaitMs: roundedMilliseconds(exact.acceptedWaitMs, quantumExponent),
    admissiblePendingTaskMs: roundedMilliseconds(exact.admissiblePendingTaskMs, quantumExponent),
    capacityBlockedTaskMs: roundedMilliseconds(exact.capacityBlockedTaskMs, quantumExponent),
    mutexBlockedTaskMs: roundedMilliseconds(exact.mutexBlockedTaskMs, quantumExponent),
    effectiveCapacitySlotMs: roundedMilliseconds(exact.effectiveCapacitySlotMs, quantumExponent),
    rootCapacitySlotMs: roundedMilliseconds(exact.rootCapacitySlotMs, quantumExponent),
    taskSlotMs: roundedMilliseconds(exact.taskSlotMs, quantumExponent)
  });
}
export function subtractContribution(
  current: ExactIntervalContribution,
  prior: ExactIntervalContribution
): ExactIntervalContribution {
  return Object.freeze({
    acceptedWaitMs: current.acceptedWaitMs - prior.acceptedWaitMs,
    admissiblePendingTaskMs: current.admissiblePendingTaskMs - prior.admissiblePendingTaskMs,
    capacityBlockedTaskMs: current.capacityBlockedTaskMs - prior.capacityBlockedTaskMs,
    mutexBlockedTaskMs: current.mutexBlockedTaskMs - prior.mutexBlockedTaskMs,
    effectiveCapacitySlotMs: current.effectiveCapacitySlotMs - prior.effectiveCapacitySlotMs,
    rootCapacitySlotMs: current.rootCapacitySlotMs - prior.rootCapacitySlotMs,
    taskSlotMs: current.taskSlotMs - prior.taskSlotMs
  });
}
