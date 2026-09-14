import type {
  SchedulerMeasurementContext,
  SchedulerTerminalEffect,
  SchedulerRawMeasurement
} from "../../project-definition/project-definition.ts";
import { diagnosticTags } from "../diagnostic-logging/logger.ts";
import type { RunTaskGraphOptions, SchedulerState } from "./execution-state.ts";
import type { SchedulerPerformanceDiagnostics } from "./measurement/diagnostics.ts";
import { observeSchedulerDiagnostic } from "./scheduler-observation.ts";

/** Delivers the terminal measurement to the internal summary and caller effects exactly once. */
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
  const callerEffects = input.options.terminalEffects ?? [];
  let callerEffectFailed = false;
  const reportCallerEffectFailure = () => {
    callerEffectFailed = true;
    observeSchedulerDiagnostic(input.state, {
      event: "scheduler.terminal-effect-failed",
      tags: diagnosticTags("TERMINAL_EFFECT_FAILED"),
      details: Object.freeze({})
    });
    try {
      input.options.onTerminalEffectFailure?.();
    } catch {
      // A failure-reporting seam cannot revise terminal Scheduler facts either.
    }
  };
  const defaultSummaryEffect = input.diagnostics.defaultSummaryHook();
  const deliveries: readonly TerminalEffectDelivery[] = Object.freeze([
    ...(defaultSummaryEffect === undefined
      ? []
      : [Object.freeze({ effect: defaultSummaryEffect, onFailure: () => undefined })]),
    ...callerEffects.map((effect) =>
      Object.freeze({ effect, onFailure: reportCallerEffectFailure })
    )
  ]);
  await deliverTerminalEffects(deliveries, context);
  if (callerEffects.length > 0 && !callerEffectFailed) {
    try {
      input.options.onTerminalEffectsSettled?.();
    } catch {
      // A success-reporting seam cannot revise terminal Scheduler facts either.
    }
  }
  return context;
}

type TerminalEffectDelivery = Readonly<{
  readonly effect: SchedulerTerminalEffect;
  readonly onFailure: () => void;
}>;

async function deliverTerminalEffects(
  deliveries: readonly TerminalEffectDelivery[],
  context: SchedulerMeasurementContext
): Promise<void> {
  for (const delivery of deliveries) {
    try {
      await delivery.effect(context);
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
