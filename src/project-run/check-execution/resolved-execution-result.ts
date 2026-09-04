import type { CoreSnapshot } from "../../check-settlement/facts.ts";
import type { SchedulerMeasurementContext } from "../../project-definition/project-definition.ts";
import type { CheckDuration, CheckRunMessage } from "../result.ts";

type ResolvedCheckExecutionFacts = Readonly<{
  readonly checkDurations: readonly CheckDuration[];
  readonly checkMessages: readonly CheckRunMessage[];
  readonly snapshot: CoreSnapshot;
  /** Product-private terminal Scheduler facts; never projected into RunResult. */
  readonly terminalSchedulerMeasurement?: SchedulerMeasurementContext;
}>;

/** Private terminal result passed from Check execution to the invocation boundary. */
export type ResolvedCheckExecution =
  | (Readonly<{
      /** Private effective selection shared with invocation-level aggregation. */
      readonly effectiveCheckIds: readonly string[];
      readonly kind: "completed";
    }> &
      ResolvedCheckExecutionFacts)
  | (Readonly<{ readonly kind: "cancelled" }> & ResolvedCheckExecutionFacts)
  | (Readonly<{ readonly kind: "admission-policy-failed" }> & ResolvedCheckExecutionFacts);
