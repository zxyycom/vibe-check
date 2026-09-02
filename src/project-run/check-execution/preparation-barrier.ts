import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { diagnosticTags, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";
import {
  FLAG_CONDITION_NOT_MATCHED_CODE,
  resolveFlagEnablement,
  type SettledPreparationResolution
} from "./preparation-settlement.ts";

/** Resolves invocation controls before any Check-owned preflight or execution starts. */
export function prepareCheckControls(
  input: Readonly<{
    readonly checks: readonly NormalizedCheck[];
    readonly diagnosticLogger?: DiagnosticLogger;
    readonly flags: readonly string[];
    readonly signal: AbortSignal | undefined;
  }>
): readonly SettledPreparationResolution[] {
  if (input.signal?.aborted === true) return Object.freeze([]);

  const settlements: SettledPreparationResolution[] = [];
  for (const check of input.checks) {
    const settlement = resolveFlagEnablement(check, input.flags);
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
