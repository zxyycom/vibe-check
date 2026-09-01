import type { CheckMessage, CheckOutcome } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";

const EMPTY_MESSAGES: readonly CheckMessage[] = Object.freeze([]);
export const FLAG_CONDITION_NOT_MATCHED_CODE = "flag-condition-not-matched";

type SettledPreparationCheck = Pick<NormalizedCheck, "definition" | "visibility"> &
  Readonly<{ readonly messages: readonly CheckMessage[] }>;

export type SettledPreparationResolution = Readonly<{
  readonly kind: "settled";
  readonly check: SettledPreparationCheck;
  readonly outcome: CheckOutcome;
  readonly phase: "control" | "preflight";
}>;

export function resolveFlagEnablement(
  check: NormalizedCheck,
  runFlags: readonly string[]
): SettledPreparationResolution | undefined {
  if (check.enabledByFlags === undefined || matchesFlagEnablement(check.enabledByFlags, runFlags)) {
    return undefined;
  }
  return settledResolution({
    check,
    messages: EMPTY_MESSAGES,
    outcome: Object.freeze({
      status: "not-applicable",
      reason: Object.freeze({ code: FLAG_CONDITION_NOT_MATCHED_CODE })
    }),
    phase: "control"
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

export function unavailablePreflightResolution(
  input: Readonly<{
    readonly check: NormalizedCheck;
    readonly messages: readonly CheckMessage[];
    readonly reasonCode: string;
  }>
): SettledPreparationResolution {
  return settledResolution({
    check: input.check,
    messages: input.messages,
    outcome: Object.freeze({
      status: "unavailable",
      reason: Object.freeze({ code: input.reasonCode })
    }),
    phase: "preflight"
  });
}

function settledResolution(
  input: Readonly<{
    readonly check: NormalizedCheck;
    readonly messages: readonly CheckMessage[];
    readonly outcome: CheckOutcome;
    readonly phase: "control" | "preflight";
  }>
): SettledPreparationResolution {
  return Object.freeze({
    kind: "settled",
    check: Object.freeze({
      definition: input.check.definition,
      messages: input.messages,
      visibility: input.check.visibility
    }),
    outcome: input.outcome,
    phase: input.phase
  });
}
