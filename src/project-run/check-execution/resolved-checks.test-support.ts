import {
  getDefinedHandoffProviderIdentity,
  type HandoffProviderIdentity
} from "../../check/handoff-provider-identity.ts";
import type { CheckProjectContext } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import type { DiagnosticLogger, DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { executeResolvedChecks, type CheckExecutionClock } from "./resolved-checks.ts";
import type { CheckExecutionLifecycle } from "./lifecycle.ts";

export { deferred, scriptedClock } from "../execution-control.test-support.ts";

export const PROJECT = Object.freeze({
  flags: Object.freeze([]),
  root: "/project"
}) satisfies CheckProjectContext;

export function normalized(
  execution: NormalizedCheck["execution"],
  overrides: Readonly<{
    readonly checkId?: string;
    readonly dependsOn?: readonly string[];
    readonly displayName?: string;
    readonly handoff?: HandoffProviderIdentity;
    readonly maxParallel?: number;
    readonly observes?: readonly string[];
    readonly preflight?: NormalizedCheck["preflight"];
  }> = {}
): NormalizedCheck {
  const resolved = {
    checkId: "direct-check",
    dependsOn: [],
    maxParallel: 1,
    observes: [],
    ...overrides
  };
  const displayName = resolved.displayName ?? resolved.checkId;
  return {
    admissionPriority: 0,
    definition: { checkId: resolved.checkId, displayName },
    dependsOn: resolved.dependsOn,
    execution,
    ...(resolved.handoff === undefined ? {} : { handoff: resolved.handoff }),
    maxParallel: resolved.maxParallel,
    mutex: [],
    observes: resolved.observes,
    options: {},
    resourceClaims: Object.freeze({}),
    ...(resolved.preflight === undefined ? {} : { preflight: resolved.preflight }),
    visibility: "always"
  };
}

/** Obtains the Definition-private identity needed by direct execution fixtures. */
export function definedHandoff(provider: unknown): HandoffProviderIdentity {
  const identity = getDefinedHandoffProviderIdentity(provider);
  if (identity === undefined) throw new Error("Expected a defined handoff provider");
  return identity;
}

export function execute(
  execution: NormalizedCheck["execution"],
  options: Readonly<{
    readonly clock?: CheckExecutionClock;
    readonly diagnosticLogger?: DiagnosticLogger;
    readonly lifecycle?: CheckExecutionLifecycle;
  }> = {}
) {
  return executeResolvedChecks({
    checks: [normalized(execution)],
    ...(options.clock === undefined ? {} : { clock: options.clock }),
    ...(options.diagnosticLogger === undefined
      ? {}
      : { diagnosticLogger: options.diagnosticLogger }),
    ...(options.lifecycle === undefined ? {} : { lifecycle: options.lifecycle }),
    maxParallel: 1,
    project: PROJECT,
    signal: undefined
  });
}

export function diagnosticDetailsRecord(details: unknown): Readonly<Record<string, unknown>> {
  if (!isDiagnosticDetailsRecord(details)) throw new Error("expected diagnostic details record");
  return details;
}

function isDiagnosticDetailsRecord(details: unknown): details is Readonly<Record<string, unknown>> {
  return details !== null && typeof details === "object" && !Array.isArray(details);
}

export function recordingLogger(observations: DiagnosticObservation[]): DiagnosticLogger {
  return Object.freeze({
    close: () => "disabled" as const,
    observe: (observation: DiagnosticObservation): void => {
      observations.push(observation);
    }
  });
}

export function hasDiagnosticTags(
  observation: DiagnosticObservation | undefined,
  ...tags: readonly string[]
): boolean {
  return observation !== undefined && tags.every((tag) => observation.tags.includes(tag));
}

export function checkDiagnosticTag(observation: DiagnosticObservation): string | undefined {
  return observation.tags.find((tag) => tag.startsWith("CHECK:"));
}

export function outcomeFor(
  execution: Awaited<ReturnType<typeof executeResolvedChecks>>,
  checkId: string
): NonNullable<(typeof execution.snapshot.checks)[number]>["outcome"] {
  const outcome = execution.snapshot.checks.find((check) => check.checkId === checkId)?.outcome;
  if (outcome === undefined) throw new Error(`Missing outcome for ${checkId}`);
  return outcome;
}
