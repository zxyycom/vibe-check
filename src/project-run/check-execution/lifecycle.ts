import type { CheckMessage, CheckOutcome, CheckVisibility } from "../../check/check.ts";
import type { CoreRecord } from "../../check-settlement/facts.ts";

/** Private invocation-wide barrier that is independent from per-Check lifecycle facts. */
export type InvocationLifecycle = Readonly<{
  /** Fires once after Product accepts every flag-control settlement and before Scheduler work. */
  readonly selectionSettled: () => void;
}>;

/** Private per-Check lifecycle presentation and accounting channel. */
export type CheckExecutionLifecycle = Readonly<{
  readonly started: (fact: CheckStartedFact) => void;
  readonly settled: (fact: CheckSettledFact) => void;
}>;

export type CheckStartedFact = Readonly<{ checkId: string; displayName: string }>;

export type CheckSettledFact = CheckStartedFact &
  Readonly<{
    durationMs: number | null;
    messages: readonly CheckMessage[];
    records: readonly CoreRecord[];
    outcome: CheckOutcome;
    visibility: CheckVisibility;
  }>;
