import type {
  SchedulerMeasurementContext,
  SchedulerMeasurementHook,
  SchedulerRawMeasurement
} from "../../project-definition/project-definition.ts";
import { diagnosticTags } from "../diagnostic-logging/logger.ts";
import type { RunTaskGraphOptions, SchedulerState } from "./execution-state.ts";
import type { SchedulerPerformanceDiagnostics } from "./scheduler-performance-diagnostics.ts";
import { observeSchedulerDiagnostic } from "./scheduler-observation.ts";

/** Delivers the terminal measurement to the internal summary and caller hooks exactly once. */
export async function observeTerminalMeasurement<TResult>(
  input: Readonly<{
    readonly diagnostics: SchedulerPerformanceDiagnostics;
    readonly options: RunTaskGraphOptions<TResult>;
    readonly state: SchedulerState<TResult>;
  }>
): Promise<SchedulerMeasurementContext> {
  input.diagnostics.completePendingActionObservation();
  const context = measurementContext(
    input.state,
    input.diagnostics.admittedTaskIds(),
    input.diagnostics.rawMeasurement()
  );
  const callerHooks = input.options.measurementHooks ?? [];
  let callerHookFailed = false;
  const callerFailure = () => {
    callerHookFailed = true;
    observeSchedulerDiagnostic(input.state, {
      event: "scheduler.measurement-hook-failed",
      tags: diagnosticTags("SCHEDULER", "MEASUREMENT_HOOK_FAILED"),
      details: Object.freeze({})
    });
    try {
      input.options.onMeasurementHookFailure?.();
    } catch {
      // A failure-reporting seam cannot revise terminal Scheduler facts either.
    }
  };
  const defaultHook = input.diagnostics.defaultSummaryHook();
  const deliveries: readonly TerminalMeasurementDelivery[] = Object.freeze([
    ...(defaultHook === undefined
      ? []
      : [Object.freeze({ hook: defaultHook, onFailure: () => undefined })]),
    ...callerHooks.map((hook) => Object.freeze({ hook, onFailure: callerFailure }))
  ]);
  await deliverTerminalMeasurementHooks(deliveries, context);
  if (callerHooks.length > 0 && !callerHookFailed) {
    try {
      input.options.onMeasurementHooksSettled?.();
    } catch {
      // A success-reporting seam cannot revise terminal Scheduler facts either.
    }
  }
  return context;
}

type TerminalMeasurementDelivery = Readonly<{
  readonly hook: SchedulerMeasurementHook;
  readonly onFailure: () => void;
}>;

async function deliverTerminalMeasurementHooks(
  deliveries: readonly TerminalMeasurementDelivery[],
  context: SchedulerMeasurementContext
): Promise<void> {
  for (const delivery of deliveries) {
    try {
      await delivery.hook(context);
    } catch {
      delivery.onFailure();
    }
  }
}

function measurementContext<TResult>(
  state: SchedulerState<TResult>,
  admittedTaskIds: readonly string[],
  rawMeasurement: SchedulerRawMeasurement
): SchedulerMeasurementContext {
  return Object.freeze({
    graph: state.graph.schedulerGraphSnapshot,
    execution: Object.freeze({
      admittedTaskIds: Object.freeze([...admittedTaskIds]),
      settledTasks: Object.freeze(
        state.graph.tasks.map((task) => {
          const settlement = state.settlementsByTaskId.get(task.id);
          if (settlement === undefined) throw new Error(`task ${task.id} was not settled`);
          return Object.freeze({ kind: settlement.kind, taskId: task.id });
        })
      )
    }),
    rawMeasurement
  });
}
