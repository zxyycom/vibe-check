import type {
  CheckExecutionLifecycle,
  CheckSettledFact,
  CheckStartedFact
} from "../check-execution/lifecycle.ts";
import {
  createProgressRenderer,
  type ProgressClock,
  type ProgressFeedback,
  type ProgressOutcomeCounts,
  type ProgressWriter
} from "./renderer.ts";
import type { ProjectOutputs } from "../../project-definition/project-definition.ts";
import type { OutputStatuses } from "../output-status.ts";
export interface ProgressRendering {
  readonly final: (input: ProgressFinalFeedback) => void;
  readonly lifecycle: CheckExecutionLifecycle;
  readonly prepared: (totalChecks: number) => void;
}
export interface ProgressFinalFeedback {
  readonly counts: ProgressOutcomeCounts;
  readonly elapsedMs: number;
  readonly execution: "cancelled" | "completed";
}
export type ProgressWriterFactory = () => ProgressWriter;

export interface ProgressRefreshSchedule {
  cancel(): void;
}

export interface ProgressRefreshScheduler {
  schedule(refresh: () => void, intervalMs: number): ProgressRefreshSchedule;
}

export interface ProgressRenderingDependencies {
  readonly clock?: ProgressClock;
  readonly refreshScheduler?: ProgressRefreshScheduler;
  readonly writerFactory?: ProgressWriterFactory;
}

const PROGRESS_REFRESH_INTERVAL_MS = 5_000;

const defaultProgressRefreshScheduler: ProgressRefreshScheduler = Object.freeze({
  schedule: (refresh: () => void, intervalMs: number) => {
    const interval = setInterval(refresh, intervalMs);
    interval.unref();
    return Object.freeze({ cancel: () => clearInterval(interval) });
  }
});

/** Owns progress writer lifecycle and rendering; failed writers are permanently muted. */
export function createProgressRendering(
  configuration: ProjectOutputs["progressRendering"],
  statuses: OutputStatuses,
  dependencies: ProgressRenderingDependencies = {}
): ProgressRendering {
  if (!configuration.enabled) return inertProgressRendering();
  let failed = false;
  const runningCheckIds = new Set<string>();
  let renderer: ReturnType<typeof createProgressRenderer> | undefined;
  let refreshSchedule: ProgressRefreshSchedule | undefined;

  const failRendering = (): void => {
    if (failed) return;
    failed = true;
    const activeSchedule = refreshSchedule;
    refreshSchedule = undefined;
    try {
      activeSchedule?.cancel();
    } catch {
      // The output is already failed; a scheduler cleanup fault must not reach Check execution.
    }
    statuses.failed("progressRendering");
  };

  const stopRefresh = (): void => {
    const activeSchedule = refreshSchedule;
    refreshSchedule = undefined;
    try {
      activeSchedule?.cancel();
    } catch {
      failRendering();
    }
  };

  const render = (feedback: ProgressFeedback): void => {
    if (failed) return;
    try {
      renderer ??= createProgressRenderer(
        (dependencies.writerFactory ?? defaultProgressWriter)(),
        dependencies.clock
      );
      renderer.render(feedback);
      if (feedback.kind === "final") {
        statuses.succeeded("progressRendering");
      }
    } catch {
      failRendering();
    }
  };

  const refresh = (): void => {
    if (failed) return;
    try {
      renderer?.refresh();
    } catch {
      failRendering();
    }
  };

  const startRefresh = (): void => {
    if (
      failed ||
      refreshSchedule !== undefined ||
      runningCheckIds.size === 0 ||
      renderer?.refreshesRunningRegion !== true
    ) {
      return;
    }
    try {
      refreshSchedule = (dependencies.refreshScheduler ?? defaultProgressRefreshScheduler).schedule(
        refresh,
        PROGRESS_REFRESH_INTERVAL_MS
      );
    } catch {
      failRendering();
    }
  };

  return Object.freeze({
    prepared: (totalChecks: number) => render(Object.freeze({ kind: "prepared", totalChecks })),
    lifecycle: Object.freeze({
      preparationCompleted: () => render(Object.freeze({ kind: "preparation-completed" })),
      settled: (fact: CheckSettledFact) => {
        render(
          Object.freeze({
            kind: "settled",
            checkId: fact.checkId,
            displayName: fact.displayName,
            durationMs: fact.durationMs,
            messages: fact.messages,
            outcome: fact.outcome,
            visibility: fact.visibility
          })
        );
        runningCheckIds.delete(fact.checkId);
        if (runningCheckIds.size === 0) stopRefresh();
      },
      started: (fact: CheckStartedFact) => {
        runningCheckIds.add(fact.checkId);
        render(
          Object.freeze({ kind: "started", checkId: fact.checkId, displayName: fact.displayName })
        );
        startRefresh();
      }
    }),
    final: (input: ProgressFinalFeedback) => {
      stopRefresh();
      render(
        Object.freeze({
          kind: "final",
          counts: input.counts,
          elapsedMs: input.elapsedMs,
          execution: input.execution
        })
      );
    }
  });
}
function inertProgressRendering(): ProgressRendering {
  const lifecycle = Object.freeze({
    preparationCompleted: (): void => undefined,
    settled: (_fact: CheckSettledFact): void => undefined,
    started: (_fact: CheckStartedFact): void => undefined
  });
  return Object.freeze({
    prepared: (_totalChecks: number): void => undefined,
    lifecycle,
    final: (_input: ProgressFinalFeedback): void => undefined
  });
}
function defaultProgressWriter(): ProgressWriter {
  return Object.freeze({
    color: process.stdout.isTTY === true && process.env.NO_COLOR === undefined,
    isTTY: process.stdout.isTTY === true,
    term: process.env.TERM,
    write: (content: string) => {
      process.stdout.write(content);
    }
  });
}
