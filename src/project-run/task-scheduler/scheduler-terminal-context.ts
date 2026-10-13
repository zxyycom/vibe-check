import type { SchedulerMeasurementContext } from "../../project-definition/scheduler-policy.ts";

/** Sealed phase union, not a full measurement DTO unless all fields were requested. */
export type SealedSchedulerTerminalContext = Readonly<Partial<SchedulerMeasurementContext>>;

export function isFullTerminalContext(
  context: SealedSchedulerTerminalContext
): context is SchedulerMeasurementContext {
  return (
    context.graph !== undefined &&
    context.execution !== undefined &&
    context.rawMeasurement !== undefined
  );
}
