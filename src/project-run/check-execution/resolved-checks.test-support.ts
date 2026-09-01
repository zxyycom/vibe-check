import type { CheckExecution, CheckProjectContext } from "../../check/check.ts";
import type { NormalizedCheck } from "../../project-definition/project-definition.ts";
import type { DiagnosticLogger, DiagnosticObservation } from "../diagnostic-logging/logger.ts";
import { executeResolvedChecks, type CheckExecutionClock } from "./resolved-checks.ts";
import type { CheckExecutionLifecycle } from "./lifecycle.ts";

export const PROJECT = Object.freeze({
  flags: Object.freeze([]),
  root: "/project"
}) satisfies CheckProjectContext;

export function normalized(
  execution: CheckExecution,
  overrides: Readonly<{
    readonly checkId?: string;
    readonly dependsOn?: readonly string[];
    readonly displayName?: string;
    readonly maxParallel?: number;
    readonly preflight?: NormalizedCheck["preflight"];
  }> = {}
): NormalizedCheck {
  const checkId = overrides.checkId ?? "direct-check";
  return {
    admissionPriority: 0,
    definition: { checkId, displayName: overrides.displayName ?? checkId },
    dependsOn: overrides.dependsOn ?? [],
    execution,
    maxParallel: overrides.maxParallel ?? 1,
    mutex: [],
    options: {},
    ...(overrides.preflight === undefined ? {} : { preflight: overrides.preflight }),
    visibility: "always"
  };
}

export function execute(
  execution: CheckExecution,
  options: Readonly<{
    readonly clock?: CheckExecutionClock;
    readonly diagnosticLogger?: DiagnosticLogger;
    readonly lifecycle?: CheckExecutionLifecycle;
  }> = {}
) {
  return executeResolvedChecks({
    checks: [normalized(execution)],
    clock: options.clock,
    diagnosticLogger: options.diagnosticLogger,
    lifecycle: options.lifecycle,
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

export function scriptedClock(values: readonly number[]): CheckExecutionClock {
  const remaining = [...values];
  return Object.freeze({
    now: (): number => {
      const value = remaining.shift();
      if (value === undefined) throw new Error("Test clock received too many reads");
      return value;
    }
  });
}

export function deferred<T>(): Readonly<{
  readonly promise: Promise<T>;
  readonly resolve: (value: T) => void;
}> {
  let resolvePromise: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve;
  });
  return Object.freeze({
    promise,
    resolve: (value: T): void => {
      if (resolvePromise === undefined) throw new Error("Deferred promise is unavailable");
      resolvePromise(value);
    }
  });
}

export function outcomeFor(
  execution: Awaited<ReturnType<typeof executeResolvedChecks>>,
  checkId: string
): NonNullable<(typeof execution.snapshot.checks)[number]>["outcome"] {
  const outcome = execution.snapshot.checks.find((check) => check.checkId === checkId)?.outcome;
  if (outcome === undefined) throw new Error(`Missing outcome for ${checkId}`);
  return outcome;
}
