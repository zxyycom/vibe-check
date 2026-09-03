import type { SchedulerMeasurementContext } from "../../project-definition/project-definition.ts";
import type { AdmissionSelectionPolicy } from "../task-scheduler/admission-selection-policy.ts";

export interface InternalAdmissionStrategyCompleteContext {
  readonly terminalMeasurement: SchedulerMeasurementContext;
}

export type PreparedAdmissionStrategyCompletion =
  | Readonly<{ readonly kind: "none" }>
  | Readonly<{
      readonly kind: "internal";
      readonly complete: (context: InternalAdmissionStrategyCompleteContext) => Promise<void>;
    }>
  | Readonly<{
      readonly kind: "measurement-hook";
      readonly complete: (context: SchedulerMeasurementContext) => void | Promise<void>;
    }>;

/** The invocation-scoped handoff from an admission provider to Scheduler and terminal delivery. */
export interface PreparedAdmissionStrategy {
  /** The complete frozen policy handoff consumed by resolved Check execution and Scheduler. */
  readonly admissionPolicy: AdmissionSelectionPolicy;
  /** Closed provider demand merged with output and policy measurement requirements by invocation. */
  readonly requiresTerminalMeasurement: boolean;
  /** Provider-private learned admission observation, kept out of Scheduler policy input. */
  readonly observeAdmittedTask: ((taskId: string) => void) | undefined;
  /** Completion owner: no public lifecycle, contained private lifecycle, or public output participant. */
  readonly completion: PreparedAdmissionStrategyCompletion;
}
