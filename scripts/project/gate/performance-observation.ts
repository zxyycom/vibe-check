import type { ProjectGateContext } from "./run.ts";
import { isNonArrayRecord } from "../../value-guards.ts";
import {
  createProjectGateResult,
  type ProjectGateMessage,
  type ProjectGateResult
} from "./result.ts";
import {
  PROJECT_GATE_PERFORMANCE_BASELINES,
  type ProjectGatePerformanceBaseline,
  type ProjectGatePerformanceRuntime
} from "./performance-baseline.ts";

const CHECK_ID_PATTERN = /^[a-z][a-z0-9-]*$/u;

interface ComparableRunFacts {
  readonly checkDurations: readonly CheckDuration[];
  readonly declarativeFingerprint: string;
}

interface CheckDuration {
  readonly checkId: string;
  readonly durationMs: number | null;
}

/** Appends one advisory elapsed observation without changing the Gate's outcome. */
export function observeProjectGatePerformance(
  initialResult: ProjectGateResult,
  context: ProjectGateContext,
  baselines: readonly ProjectGatePerformanceBaseline[] = PROJECT_GATE_PERFORMANCE_BASELINES,
  runtime: ProjectGatePerformanceRuntime = systemPerformanceRuntime()
): ProjectGateResult {
  const elapsedMs = context.timing.elapsedToInitialResultMs;
  if (!isDuration(elapsedMs))
    return appendObservation(initialResult, "elapsed timing was not comparable (invalid elapsed)");

  const comparison = comparableBaseline(initialResult, context, baselines, runtime);
  if (comparison.kind === "not-comparable")
    return appendObservation(
      initialResult,
      `elapsed ${formatDuration(elapsedMs)} was not comparable (${comparison.reason})`
    );

  if (elapsedMs <= comparison.baseline.thresholdMs) {
    return appendObservation(
      initialResult,
      `elapsed ${formatDuration(elapsedMs)} was within advisory range (threshold ${formatDuration(comparison.baseline.thresholdMs)})`
    );
  }

  return appendOutsideRangeObservation(initialResult, elapsedMs, comparison);
}

type BaselineComparison =
  | Readonly<{
      readonly baseline: ProjectGatePerformanceBaseline;
      readonly kind: "comparable";
      readonly run: ComparableRunFacts;
    }>
  | Readonly<{ readonly kind: "not-comparable"; readonly reason: string }>;

function comparableBaseline(
  initialResult: ProjectGateResult,
  context: ProjectGateContext,
  baselines: readonly ProjectGatePerformanceBaseline[],
  runtime: ProjectGatePerformanceRuntime
): BaselineComparison {
  if (initialResult.status !== "passed") return notComparable("initial result was not passed");
  if (context.selection.disabledTags.length > 0 || context.selection.enabledTags.length > 0)
    return notComparable("tag override");
  if (
    context.preparedCandidate.preparationAction !== "reuse" ||
    context.preparedCandidate.preparationReason !== "installation-current" ||
    context.preparedCandidate.reused !== true
  ) {
    return notComparable("candidate was not reused");
  }

  const run = readComparableRunFacts(context.runResult);
  if (run === undefined) return notComparable("Run facts were incomplete");

  const baseline = baselines.find(
    (candidate) =>
      isValidBaseline(candidate) &&
      candidate.workload.profile === context.selection.profile &&
      candidate.workload.declarativeFingerprint === run.declarativeFingerprint &&
      candidate.workload.runtime.platform === runtime.platform &&
      candidate.workload.runtime.architecture === runtime.architecture &&
      candidate.workload.runtime.bunVersion === runtime.bunVersion
  );
  return baseline === undefined
    ? notComparable("no matching baseline")
    : Object.freeze({ baseline, kind: "comparable", run });
}

function appendOutsideRangeObservation(
  initialResult: ProjectGateResult,
  elapsedMs: number,
  comparison: Extract<BaselineComparison, { readonly kind: "comparable" }>
): ProjectGateResult {
  const slowestChecks = comparison.run.checkDurations
    .filter(
      (duration): duration is Readonly<{ readonly checkId: string; readonly durationMs: number }> =>
        duration.durationMs !== null
    )
    .sort(compareCheckDurations)
    .slice(0, 3)
    .map(({ checkId, durationMs }) => `${checkId}=${formatDuration(durationMs)}`);
  const suffix = slowestChecks.length === 0 ? "" : `; slowest Checks: ${slowestChecks.join(", ")}`;
  return createProjectGateResult(initialResult.status, [
    ...initialResult.messages,
    Object.freeze({
      code: "project-gate-performance-outside-range",
      level: "warning",
      message: `elapsed ${formatDuration(elapsedMs)} exceeded advisory threshold ${formatDuration(comparison.baseline.thresholdMs)}${suffix}`
    })
  ]);
}

function appendObservation(initialResult: ProjectGateResult, message: string): ProjectGateResult {
  return createProjectGateResult(initialResult.status, [
    ...initialResult.messages,
    observationMessage(message)
  ]);
}

function observationMessage(message: string): ProjectGateMessage {
  return Object.freeze({ code: "project-gate-performance-elapsed", level: "info", message });
}

function readComparableRunFacts(value: unknown): ComparableRunFacts | undefined {
  if (
    !isNonArrayRecord(value) ||
    value.kind !== "completed" ||
    typeof value.declarativeFingerprint !== "string"
  )
    return undefined;
  const checkDurations = value.checkDurations;
  if (!Array.isArray(checkDurations)) return undefined;
  const parsedDurations: CheckDuration[] = [];
  for (const duration of checkDurations) {
    const checkId = isNonArrayRecord(duration) ? duration.checkId : undefined;
    const durationMs = isNonArrayRecord(duration) ? duration.durationMs : undefined;
    if (
      typeof checkId !== "string" ||
      !CHECK_ID_PATTERN.test(checkId) ||
      (durationMs !== null && !isDuration(durationMs))
    ) {
      return undefined;
    }
    parsedDurations.push(Object.freeze({ checkId, durationMs }));
  }
  return Object.freeze({
    checkDurations: Object.freeze(parsedDurations),
    declarativeFingerprint: value.declarativeFingerprint
  });
}

function isValidBaseline(value: ProjectGatePerformanceBaseline): boolean {
  if (
    value.workload.candidatePreparation !== "reuse" ||
    typeof value.workload.declarativeFingerprint !== "string" ||
    value.workload.declarativeFingerprint.length === 0 ||
    (value.workload.profile !== "required" && value.workload.profile !== "full") ||
    !isRuntime(value.workload.runtime) ||
    value.samplesMs.length === 0 ||
    !value.samplesMs.every(isDuration) ||
    !isDuration(value.medianMs) ||
    !isDuration(value.p90Ms) ||
    !isDuration(value.thresholdMs)
  ) {
    return false;
  }

  const orderedSamples = [...value.samplesMs].sort((left, right) => left - right);
  const middleIndex = Math.floor(orderedSamples.length / 2);
  const medianMs =
    orderedSamples.length % 2 === 0
      ? (orderedSamples[middleIndex - 1] + orderedSamples[middleIndex]) / 2
      : orderedSamples[middleIndex];
  const p90Ms = orderedSamples[Math.ceil(orderedSamples.length * 0.9) - 1];
  const thresholdMs = Math.ceil(Math.max(p90Ms * 1.25, medianMs * 1.5));
  return value.medianMs === medianMs && value.p90Ms === p90Ms && value.thresholdMs === thresholdMs;
}

function isRuntime(value: ProjectGatePerformanceRuntime): boolean {
  return (
    typeof value.platform === "string" &&
    value.platform.length > 0 &&
    typeof value.architecture === "string" &&
    value.architecture.length > 0 &&
    typeof value.bunVersion === "string" &&
    value.bunVersion.length > 0
  );
}

function isDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function compareCheckDurations(left: CheckDuration, right: CheckDuration): number {
  const leftDuration = left.durationMs ?? -1;
  const rightDuration = right.durationMs ?? -1;
  if (leftDuration !== rightDuration) return rightDuration - leftDuration;
  if (left.checkId < right.checkId) return -1;
  if (left.checkId > right.checkId) return 1;
  return 0;
}

function formatDuration(durationMs: number): string {
  return `${durationMs.toFixed(1)}ms`;
}

function notComparable(reason: string): BaselineComparison {
  return Object.freeze({ kind: "not-comparable", reason });
}

function systemPerformanceRuntime(): ProjectGatePerformanceRuntime {
  return Object.freeze({
    architecture: process.arch,
    bunVersion: process.versions.bun ?? "unavailable",
    platform: process.platform
  });
}
