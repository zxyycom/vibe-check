import type {
  CheckHandoffProvider,
  CheckDependencies,
  CheckOutcome,
  DependencyHandoffReadResult,
  DependencyObservation,
  DependencyReadResult
} from "../../check/check.ts";
import {
  getDefinedHandoffProviderIdentity,
  type HandoffProviderIdentity
} from "../../check/handoff-provider-identity.ts";
import type { CoreCheckSession } from "../../check-settlement/session.ts";
import { snapshotClosedRecord } from "../../data-boundary/closed-values.ts";
import { diagnosticTags, type DiagnosticLogger } from "../diagnostic-logging/logger.ts";
import type { ParsedCheckTerminalHandoff } from "./terminal-result.ts";

type RuntimeDependencyHandoffReadResult = DependencyHandoffReadResult<string, object>;

export function createCheckDependencies(
  input: Readonly<{
    readonly checkId: string;
    readonly directDependsOnCheckIds: readonly string[];
    readonly diagnosticLogger: DiagnosticLogger | undefined;
    readonly directRelationCheckIds: readonly string[];
    readonly handoffsByCheckId: ReadonlyMap<string, ParsedCheckTerminalHandoff>;
    readonly session: CoreCheckSession;
  }>
): CheckDependencies {
  function get<Id extends string, Handoff extends object>(
    dependency: CheckHandoffProvider<Id, Handoff>
  ): DependencyHandoffReadResult<Id, Handoff>;
  function get(dependency: string): DependencyReadResult;
  function get(dependency: unknown): DependencyReadResult | RuntimeDependencyHandoffReadResult;
  function get(dependency: unknown): DependencyReadResult | RuntimeDependencyHandoffReadResult {
    if (dependency === null || typeof dependency !== "object") {
      const result = readDirectRelation(input.session, input.directRelationCheckIds, dependency);
      input.diagnosticLogger?.observe({
        event: "dependency.read",
        tags: diagnosticTags(`CHECK:${input.checkId}`, "EXECUTION", "DEPENDENCY-READ"),
        details: dependencyReadDetails(dependency, result)
      });
      return result;
    }
    const result = readDirectDependencyHandoff(input, dependency);
    input.diagnosticLogger?.observe({
      event: "dependency.read",
      tags: diagnosticTags(`CHECK:${input.checkId}`, "EXECUTION", "DEPENDENCY-READ"),
      details: handoffDependencyReadDetails(dependency, result)
    });
    return result;
  }
  return Object.freeze({
    get,
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

function readDirectDependencyHandoff(
  input: Readonly<{
    readonly directDependsOnCheckIds: readonly string[];
    readonly handoffsByCheckId: ReadonlyMap<string, ParsedCheckTerminalHandoff>;
    readonly session: CoreCheckSession;
  }>,
  provider: unknown
): RuntimeDependencyHandoffReadResult {
  const providerIdentity = handoffProviderIdentity(provider);
  if (
    providerIdentity === undefined ||
    !input.directDependsOnCheckIds.includes(providerIdentity.checkId)
  ) {
    return handoffDependencyNotDeclared(providerIdentity?.checkId ?? handoffCheckId(provider));
  }
  const settledHandoff = input.handoffsByCheckId.get(providerIdentity.checkId);
  const outcome = input.session.readSettledCheckOutcome(providerIdentity.checkId);
  if (
    settledHandoff === undefined ||
    settledHandoff.identity !== providerIdentity.identity ||
    outcome.status !== "passed"
  ) {
    return handoffUnavailable(providerIdentity.checkId);
  }
  return Object.freeze({
    ok: true,
    checkId: providerIdentity.checkId,
    status: "passed",
    data: outcome.data,
    handoff: settledHandoff.value
  });
}

function handoffProviderIdentity(
  provider: unknown
): Readonly<{ readonly checkId: string; readonly identity: HandoffProviderIdentity }> | undefined {
  const identity = getDefinedHandoffProviderIdentity(provider);
  const record = snapshotClosedRecord(provider);
  if (
    identity === undefined ||
    record === undefined ||
    typeof record.checkId !== "string" ||
    record.handoff !== true
  ) {
    return undefined;
  }
  return Object.freeze({ checkId: record.checkId, identity });
}

function handoffCheckId(provider: unknown): string {
  const record = snapshotClosedRecord(provider);
  return record !== undefined && typeof record.checkId === "string" ? record.checkId : "";
}

function handoffDependencyNotDeclared(checkId: string): RuntimeDependencyHandoffReadResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code: "dependency-not-declared", checkId })
  });
}

function handoffUnavailable(checkId: string): RuntimeDependencyHandoffReadResult {
  return Object.freeze({
    ok: false,
    error: Object.freeze({ code: "upstream-handoff-unavailable", checkId })
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

function handoffDependencyReadDetails(
  requestedProvider: unknown,
  result: RuntimeDependencyHandoffReadResult
): Readonly<Record<string, unknown>> {
  if (!result.ok) {
    return Object.freeze({
      error: result.error,
      ok: false,
      requestedCheckId: handoffCheckId(requestedProvider)
    });
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
  checkId: unknown
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
