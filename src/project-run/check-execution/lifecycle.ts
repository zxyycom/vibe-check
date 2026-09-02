import type { CheckMessage, CheckOutcome, CheckVisibility } from "../../check/check.ts";

/** Private Run handoff for Check lifecycle presentation and accounting. */
export type CheckExecutionLifecycle = Readonly<{
  /** Fires after the invocation-wide flag-control phase and before Scheduler execution starts. */
  readonly flagControlCompleted: () => void;
  readonly started: (fact: CheckStartedFact) => void;
  readonly settled: (fact: CheckSettledFact) => void;
}>;

export type CheckStartedFact = Readonly<{ checkId: string; displayName: string }>;

export type CheckSettledFact = CheckStartedFact &
  Readonly<{
    durationMs: number | null;
    messages: readonly CheckMessage[];
    outcome: CheckOutcome;
    visibility: CheckVisibility;
  }>;
