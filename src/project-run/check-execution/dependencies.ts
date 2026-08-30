import type { CheckDependencies, CheckOutcome, DependencyReadResult } from "../../check/check.ts";
import type { CoreCheckSession } from "../../check-settlement/session.ts";
import { diagnosticTags, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";

export function createCheckDependencies(
  input: Readonly<{
    readonly checkId: string;
    readonly diagnosticLogger: DiagnosticLogger | undefined;
    readonly directDependencyIds: readonly string[];
    readonly session: CoreCheckSession;
  }>
): CheckDependencies {
  return Object.freeze({
    get: (dependencyId: string): DependencyReadResult => {
      const result = readDependency(input.session, input.directDependencyIds, dependencyId);
      input.diagnosticLogger?.observe({
        event: "dependency.read",
        tags: diagnosticTags(`CHECK:${input.checkId}`, "EXECUTION", "DEPENDENCY-READ"),
        details: dependencyReadDetails(dependencyId, result)
      });
      return result;
    }
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

function readDependency(
  session: CoreCheckSession,
  directDependencyIds: readonly string[],
  checkId: string
): DependencyReadResult {
  if (typeof checkId !== "string" || !directDependencyIds.includes(checkId)) {
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
