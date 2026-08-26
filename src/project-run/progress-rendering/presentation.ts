import type {
  CheckExecutionLifecycle,
  CheckSettledFact,
  CheckStartedFact
} from "../check-execution/resolved-checks.ts";
import {
  createProgressRenderer,
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
/** Owns progress writer lifecycle and rendering; failed writers are permanently muted. */
export function createProgressRendering(
  configuration: ProjectOutputs["progressRendering"],
  statuses: OutputStatuses,
  writerFactory: ProgressWriterFactory = defaultProgressWriter
): ProgressRendering {
  if (!configuration.enabled) return inertProgressRendering();
  let failed = false;
  let renderer: ReturnType<typeof createProgressRenderer> | undefined;
  const render = (feedback: ProgressFeedback): void => {
    if (failed) return;
    try {
      renderer ??= createProgressRenderer(writerFactory());
      renderer.render(feedback);
      if (feedback.kind === "final") statuses.succeeded("progressRendering");
    } catch {
      failed = true;
      statuses.failed("progressRendering");
    }
  };
  return Object.freeze({
    prepared: (totalChecks: number) => render(Object.freeze({ kind: "prepared", totalChecks })),
    lifecycle: Object.freeze({
      settled: (fact: CheckSettledFact) =>
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
        ),
      started: (fact: CheckStartedFact) =>
        render(
          Object.freeze({ kind: "started", checkId: fact.checkId, displayName: fact.displayName })
        )
    }),
    final: (input: ProgressFinalFeedback) =>
      render(
        Object.freeze({
          kind: "final",
          counts: input.counts,
          elapsedMs: input.elapsedMs,
          execution: input.execution
        })
      )
  });
}
function inertProgressRendering(): ProgressRendering {
  const lifecycle = Object.freeze({
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
