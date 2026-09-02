import type {
  CheckDependencies,
  CheckOutcome,
  DependencyObservation,
  DependencyReadResult
} from "../../check/check.ts";
import type { CoreCheckSession } from "../../check-settlement/session.ts";
import { diagnosticTags, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";

export function createCheckDependencies(
  input: Readonly<{
    readonly checkId: string;
    readonly diagnosticLogger: DiagnosticLogger | undefined;
    readonly directRelationCheckIds: readonly string[];
    readonly session: CoreCheckSession;
  }>
): CheckDependencies {
  return Object.freeze({
    get: (dependencyId: string): DependencyReadResult => {
      const result = readDirectRelation(input.session, input.directRelationCheckIds, dependencyId);
      input.diagnosticLogger?.observe({
        event: "dependency.read",
        tags: diagnosticTags(`CHECK:${input.checkId}`, "EXECUTION", "DEPENDENCY-READ"),
        details: dependencyReadDetails(dependencyId, result)
      });
      return result;
    },
    list: (): readonly DependencyObservation[] => {
      const observations = listDirectRelationObservations(
        input.session,
        input.directRelationCheckIds
      );
      input.diagnosticLogger?.observe({
        event: "dependency.list",
        tags: diagnosticTags(`CHECK:${input.checkId}`, "EXECUTION", "DEPENDENCY-LIST"),
        details: directRelationListDetails(observations)
      });
      return observations;
    }
  });
}

function listDirectRelationObservations(
  session: CoreCheckSession,
  directRelationCheckIds: readonly string[]
): readonly DependencyObservation[] {
  return Object.freeze(
    directRelationCheckIds.map((checkId) =>
      Object.freeze({ checkId, outcome: session.readSettledCheckOutcome(checkId) })
    )
  );
}

function directRelationListDetails(
  observations: readonly DependencyObservation[]
): Readonly<Record<string, unknown>> {
  return Object.freeze({
    dependencyIds: Object.freeze(observations.map(({ checkId }) => checkId)),
    count: observations.length
  });
}

function dependencyReadDetails(
  requestedCheckId: unknown,
  result: DependencyReadResult
): Readonly<Record<string, unknown>> {
  if (!result.ok) {
    return Object.freeze({ error: result.error, ok: false, requestedCheckId });
  }
  return Object.freeze({
    hasData: true,
    ok: true,
    producer: result.checkId,
    status: result.status
  });
}

function readDirectRelation(
  session: CoreCheckSession,
  directRelationCheckIds: readonly string[],
  checkId: string
): DependencyReadResult {
  if (typeof checkId !== "string" || !directRelationCheckIds.includes(checkId)) {
    return dependencyNotDeclared(checkId);
  }
  return dependencyReadResult(checkId, session.readSettledCheckOutcome(checkId));
}

function dependencyReadResult(checkId: string, outcome: CheckOutcome): DependencyReadResult {
  if (outcome.status === "passed" || outcome.status === "failed") {
    return Object.freeze({ ok: true, checkId, status: outcome.status, data: outcome.data });
  }
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code: "upstream-data-unavailable", checkId, status: outcome.status })
  });
}

function dependencyNotDeclared(checkId: unknown): DependencyReadResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({
      code: "dependency-not-declared",
      checkId: typeof checkId === "string" ? checkId : ""
    })
  });
}
