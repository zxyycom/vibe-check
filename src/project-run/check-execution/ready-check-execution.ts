/** Executes and settles a Check after its task-local preflight has admitted it. */

import type { CheckProjectContext } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import { artifactDirectoryForCheck, type ResolvedInvocationPaths } from "../invocation/paths.ts";
import { diagnosticTags, summarizeDiagnosticValue } from "../diagnostic-logging/logger.ts";
import { executeCheckCallback } from "./callback.ts";
import { createCheckDependencies } from "./dependencies.ts";
import { checkIdentity } from "./execution-finalization.ts";
import {
  recordSettledCheck,
  settleCallback,
  type CheckExecutionState
} from "./execution-settlement.ts";
import type { ReadyCheckPreflightResolution } from "./preflight.ts";

export type ReadyCheckExecutionInput = CheckExecutionState &
  Readonly<{
    readonly check: NormalizedCheck;
    readonly clock: Readonly<{ now(): number }>;
    readonly invocationId: string;
    readonly paths: ResolvedInvocationPaths | undefined;
    readonly preflight: ReadyCheckPreflightResolution;
    readonly project: CheckProjectContext;
    readonly signal: AbortSignal;
  }>;

export async function executeReadyCheck(input: ReadyCheckExecutionInput): Promise<boolean> {
  const check = input.preflight.check;
  const checkId = check.definition.checkId;
  const scope = input.session.openCheckScope(checkId);
  const identity = checkIdentity(check);
  input.diagnosticLogger?.observe({
    event: "check.started",
    tags: diagnosticTags(`CHECK:${checkId}`, "EXECUTION", "STARTED"),
    details: {
      dependencies: check.dependsOn,
      displayName: check.definition.displayName,
      options: summarizeDiagnosticValue(check.options)
    }
  });
  input.lifecycle?.started(
    Object.freeze({ checkId: identity.checkId, displayName: identity.displayName })
  );
  const startedAt = input.clock.now();
  const callback = await executeCheckCallback({
    artifactDirectory:
      input.paths === undefined ? null : artifactDirectoryForCheck(input.paths, checkId),
    check,
    dependencies: createCheckDependencies({
      checkId,
      directDependsOnCheckIds: check.dependsOn,
      diagnosticLogger: input.diagnosticLogger,
      directRelationCheckIds: directRelationCheckIds(check),
      handoffsByCheckId: input.handoffsByCheckId,
      session: input.session
    }),
    ...(input.diagnosticLogger === undefined ? {} : { diagnosticLogger: input.diagnosticLogger }),
    invocationId: input.invocationId,
    project: input.project,
    scope,
    signal: input.signal
  });
  const settled = settleCallback({
    callback,
    checkId,
    diagnosticLogger: input.diagnosticLogger,
    handoff: check.handoff,
    preflightMessages: check.preflightMessages,
    scope,
    state: input
  });
  recordSettledCheck({
    check: identity,
    durationMs: durationSince(startedAt, input.clock),
    messages: settled.messages,
    outcome: settled.outcome,
    phase: "execution",
    state: input
  });
  return settled.outcome.status === "passed";
}

function directRelationCheckIds(
  check: Pick<NormalizedCheck, "dependsOn" | "observes">
): readonly string[] {
  return Object.freeze([...new Set([...check.dependsOn, ...check.observes])].sort());
}

function durationSince(startedAt: number, clock: Readonly<{ now(): number }>): number {
  const elapsed = clock.now() - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
}
