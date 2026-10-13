import type { SchedulerMeasurementContext } from "../../project-definition/scheduler-policy.ts";
import {
  normalizeSchedulerContextCallback,
  unionSchedulerContextNeeds,
  type NormalizedSchedulerContextCallback
} from "../../project-definition/scheduler-context-validation.ts";
import { diagnosticTags } from "../diagnostic-logging/logger.ts";
import type { RunTaskGraphOptions, SchedulerState } from "./execution-state.ts";
import type { SchedulerPerformanceDiagnostics } from "./measurement/diagnostics.ts";
import type { SealedSchedulerTerminalContext } from "./scheduler-terminal-context.ts";
import { observeSchedulerDiagnostic } from "./scheduler-observation.ts";

export interface SchedulerTerminalContextPlan {
  readonly contextNeeds: readonly (keyof SchedulerMeasurementContext)[];
  readonly effects: readonly NormalizedSchedulerContextCallback<"terminal">[];
  readonly deliver: boolean;
}

/** Fixes terminal production requirements before execution; no late raw-history demand. */
export function schedulerTerminalContextPlan<TResult>(
  options: Omit<RunTaskGraphOptions<TResult>, "graph">,
  withSummary: boolean
): SchedulerTerminalContextPlan {
  const effects = (options.terminalEffects ?? []).map((value) => {
    const consumer = normalizeSchedulerContextCallback("terminal", value);
    if (consumer === undefined) throw new TypeError("invalid Scheduler terminal effect");
    return consumer;
  });
  const requests = new Set<keyof SchedulerMeasurementContext>([
    ...unionSchedulerContextNeeds("terminal", effects),
    ...(options.terminalContextNeeds ?? []),
    ...(withSummary ? (["graph", "execution", "rawMeasurement"] as const) : [])
  ]);
  return Object.freeze({
    contextNeeds: Object.freeze([...requests]),
    effects: Object.freeze(effects),
    deliver: withSummary || effects.length > 0 || options.terminalContextNeeds !== undefined
  });
}

/** Seals a phase union independently of raw collection, then drains ordered generic effects. */
export async function observeTerminalMeasurement<TResult>(
  input: Readonly<{
    readonly diagnostics: SchedulerPerformanceDiagnostics | undefined;
    readonly plan: SchedulerTerminalContextPlan;
    readonly options: Omit<RunTaskGraphOptions<TResult>, "graph">;
    readonly state: SchedulerState<TResult>;
  }>
): Promise<SealedSchedulerTerminalContext | undefined> {
  input.diagnostics?.completePendingActionObservation();
  if (!input.plan.deliver) return undefined;
  const context = terminalContext(input.state, input.plan.contextNeeds, input.diagnostics);
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
      // A reporting seam cannot revise sealed facts or suppress later delivery.
    }
  };
  const summary = input.diagnostics?.defaultSummaryHook();
  const summaryConsumer =
    summary === undefined ? undefined : normalizeSchedulerContextCallback("terminal", summary);
  if (summary !== undefined && summaryConsumer === undefined)
    throw new Error("invalid internal terminal summary");
  const deliveries = [
    ...(summaryConsumer === undefined
      ? []
      : [{ consumer: summaryConsumer, onFailure: () => undefined }]),
    ...input.plan.effects.map((consumer) => ({ consumer, onFailure: reportCallerEffectFailure }))
  ];
  for (const delivery of deliveries) {
    try {
      await delivery.consumer.invoke(context);
    } catch {
      delivery.onFailure();
    }
  }
  if (input.plan.effects.length > 0 && !callerEffectFailed) {
    try {
      input.options.onTerminalEffectsSettled?.();
    } catch {
      // A reporting seam cannot revise sealed facts.
    }
  }
  return context;
}

function terminalContext<TResult>(
  state: SchedulerState<TResult>,
  needs: readonly (keyof SchedulerMeasurementContext)[],
  diagnostics: SchedulerPerformanceDiagnostics | undefined
): SealedSchedulerTerminalContext {
  const context: {
    -readonly [K in keyof SchedulerMeasurementContext]?: SchedulerMeasurementContext[K];
  } = {};
  for (const key of needs) {
    switch (key) {
      case "graph":
        context.graph = state.graph.schedulerGraphSnapshot;
        break;
      case "execution": {
        if (state.admissionFacts === undefined)
          throw new Error("terminal execution facts were not captured");
        context.execution = Object.freeze({
          admittedTaskIds: state.admissionFacts.admittedTaskIds(),
          settledTasks: Object.freeze(
            state.graph.tasks.map((task) => {
              const settlement = state.settlementsByTaskId.get(task.id);
              if (settlement === undefined) throw new Error(`task ${task.id} was not settled`);
              return Object.freeze({ kind: settlement.kind, taskId: task.id });
            })
          )
        });
        break;
      }
      case "rawMeasurement":
        if (diagnostics === undefined) throw new Error("terminal measurement was not collected");
        context.rawMeasurement = diagnostics.rawMeasurement();
        break;
    }
  }
  return Object.freeze(context);
}
