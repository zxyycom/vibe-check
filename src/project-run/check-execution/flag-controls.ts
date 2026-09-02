import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { diagnosticTags, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";

export const FLAG_CONDITION_NOT_MATCHED_CODE = "flag-condition-not-matched";

type FlagControlledCheck = Pick<NormalizedCheck, "definition" | "visibility">;
type FlagControlOutcome = Readonly<{
  readonly status: "not-applicable";
  readonly reason: Readonly<{ readonly code: typeof FLAG_CONDITION_NOT_MATCHED_CODE }>;
}>;

export type FlagControlSettlement = Readonly<{
  readonly check: FlagControlledCheck;
  readonly outcome: FlagControlOutcome;
}>;

/** Resolves all flag-controlled outcomes before Scheduler admission or Check-owned work. */
export function resolveFlagControlSettlements(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly diagnosticLogger?: DiagnosticLogger;
    readonly flags: readonly string[];
    readonly signal: AbortSignal | undefined;
  }>
): readonly FlagControlSettlement[] {
  if (input.signal?.aborted === true) return Object.freeze([]);

  const settlements: FlagControlSettlement[] = [];
  for (const check of input.checks) {
    const settlement = resolveFlagControl(check, input.flags);
    if (settlement === undefined) continue;
    settlements.push(settlement);
    input.diagnosticLogger?.observe({
      event: "control.resolved",
      tags: diagnosticTags(
        `CHECK:${check.definition.checkId}`,
        "CONTROL",
        FLAG_CONDITION_NOT_MATCHED_CODE.toUpperCase()
      ),
      details: {
        enabledByFlags: check.enabledByFlags,
        outcome: settlement.outcome
      }
    });
  }
  return Object.freeze(settlements);
}

function resolveFlagControl(
  check: NormalizedCheck,
  runFlags: readonly string[]
): FlagControlSettlement | undefined {
  if (check.enabledByFlags === undefined || matchesFlagEnablement(check.enabledByFlags, runFlags)) {
    return undefined;
  }
  return Object.freeze({
    check: Object.freeze({
      definition: check.definition,
      visibility: check.visibility
    }),
    outcome: Object.freeze({
      status: "not-applicable",
      reason: Object.freeze({ code: FLAG_CONDITION_NOT_MATCHED_CODE })
    })
  });
}

function matchesFlagEnablement(
  enablement: NonNullable<NormalizedCheck["enabledByFlags"]>,
  runFlags: readonly string[]
): boolean {
  const isPresentInRun = (flag: string): boolean => runFlags.includes(flag);
  switch (enablement.mode) {
    case "all":
      return enablement.flags.every(isPresentInRun);
    case "any":
      return enablement.flags.some(isPresentInRun);
    case "none":
      return !enablement.flags.some(isPresentInRun);
    case "not-all":
      return !enablement.flags.every(isPresentInRun);
  }
}
