import type { SchedulerMeasurementAdmission } from "../../../project-definition/project-definition.ts";
import { roundDelay, type ExactAdmissionDelay } from "./exact-contributions.ts";
import { finiteNonnegative } from "./exact-time.ts";

export type AdmissionChronology = {
  readonly admissionDelay: ExactAdmissionDelay;
  readonly admittedAt: number;
  settledAt: number | undefined;
};

export interface ExactSchedulerAdmission {
  readonly taskId: string;
  readonly admissionDelay: ExactAdmissionDelay;
  readonly admittedAtMonotonicMs: number | null;
  readonly settledAtMonotonicMs: number | null;
}

/** Terminal join of lazy pending delays with admitted Task chronology, in public lexical order. */
export function exactAdmissionMeasurements(
  chronologyByTaskId: ReadonlyMap<string, AdmissionChronology> | undefined,
  pending: readonly Readonly<{ taskId: string; admissionDelay: ExactAdmissionDelay }>[]
): readonly ExactSchedulerAdmission[] {
  const pendingByTaskId = new Map(
    pending.map(({ taskId, admissionDelay }) => [taskId, admissionDelay])
  );
  const taskIds = new Set([...pendingByTaskId.keys(), ...(chronologyByTaskId?.keys() ?? [])]);
  return [...taskIds]
    .map((taskId) => {
      const chronology = chronologyByTaskId?.get(taskId);
      const admissionDelay = chronology?.admissionDelay ?? pendingByTaskId.get(taskId);
      if (admissionDelay === undefined)
        throw new Error(`missing admission measurement for ${taskId}`);
      return Object.freeze({
        admissionDelay,
        admittedAtMonotonicMs: chronology?.admittedAt ?? null,
        settledAtMonotonicMs: chronology?.settledAt ?? null,
        taskId
      });
    })
    .sort((left, right) => compareText(left.taskId, right.taskId));
}

/** Validate the whole requested per-Task table before publishing any available timing field. */
export function roundedAdmissionMeasurements(
  exact: readonly ExactSchedulerAdmission[],
  quantumExponent: number
): readonly SchedulerMeasurementAdmission[] | undefined {
  const admissions = exact.map((admission) =>
    Object.freeze({
      ...admission,
      admissionDelay: roundDelay(admission.admissionDelay, quantumExponent)
    })
  );
  const valid = admissions.every((admission) =>
    Object.values(admission.admissionDelay).every(finiteNonnegative)
  );
  return valid ? Object.freeze(admissions) : undefined;
}
function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
