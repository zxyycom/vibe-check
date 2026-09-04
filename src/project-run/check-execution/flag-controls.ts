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

/**
 * Selects canonical Check IDs for direct flag matches and their opt-in
 * `dependsOn` closures after complete static graph validation.
 */
export function selectEffectiveCheckIds(
  checks: readonly NormalizedCheck[],
  flags: readonly string[]
): readonly string[] {
  const expandedCheckIds = new Set<string>();
  const selectedCheckIds = new Set<string>();
  const checksByCheckId = new Map(
    checks.map((check) => [check.definition.checkId, check] as const)
  );

  for (const check of checks) {
    const enablement = check.enabledByFlags;
    if (enablement !== undefined && !matchesFlagEnablement(enablement, flags)) continue;

    if (enablement?.propagateDependsOn === true) {
      selectCheckAndDependsOnClosure(check, checksByCheckId, expandedCheckIds, selectedCheckIds);
      continue;
    }
    selectedCheckIds.add(check.definition.checkId);
  }

  return Object.freeze([...selectedCheckIds].sort());
}

/** Resolves all flag-controlled outcomes before Scheduler admission or Check-owned work. */
export function resolveFlagControlSettlements(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly diagnosticLogger?: DiagnosticLogger;
    readonly effectiveCheckIds: readonly string[];
    readonly signal: AbortSignal | undefined;
  }>
): readonly FlagControlSettlement[] {
  if (input.signal?.aborted === true) return Object.freeze([]);

  const settlements: FlagControlSettlement[] = [];
  const selectedCheckIds = new Set(input.effectiveCheckIds);
  for (const check of input.checks) {
    const settlement = resolveFlagControl(check, selectedCheckIds);
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
  selectedCheckIds: ReadonlySet<string>
): FlagControlSettlement | undefined {
  if (check.enabledByFlags === undefined || selectedCheckIds.has(check.definition.checkId)) {
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

function selectCheckAndDependsOnClosure(
  check: NormalizedCheck,
  checksByCheckId: ReadonlyMap<string, NormalizedCheck>,
  expandedCheckIds: Set<string>,
  selectedCheckIds: Set<string>
): void {
  const checkId = check.definition.checkId;
  if (expandedCheckIds.has(checkId)) return;
  expandedCheckIds.add(checkId);
  selectedCheckIds.add(checkId);

  for (const dependencyId of check.dependsOn) {
    const dependency = checksByCheckId.get(dependencyId);
    if (dependency === undefined) {
      throw new Error("Validated Check graph has an unavailable dependency");
    }
    selectCheckAndDependsOnClosure(dependency, checksByCheckId, expandedCheckIds, selectedCheckIds);
  }
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
