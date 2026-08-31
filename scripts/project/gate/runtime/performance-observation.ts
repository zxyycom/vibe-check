import type { ProjectGateContext } from "../run.ts";
import { isNonArrayRecord } from "../../../value-guards.ts";
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
    return appendObservation(
      initialResult,
      "elapsed-to-initial-result timing was not comparable (invalid total timing)"
    );
  if (!hasValidPhaseTiming(context.timing))
    return appendObservation(
      initialResult,
      "elapsed-to-initial-result timing was not comparable (invalid phase timing)"
    );

  const comparison = comparableBaseline(initialResult, context, baselines, runtime);
  if (comparison.kind === "not-comparable")
    return appendObservation(
      initialResult,
      `${timingDescription(context.timing)} was not comparable (${comparison.reason})`
    );

  if (elapsedMs <= comparison.baseline.thresholdMs) {
    return appendObservation(
      initialResult,
      `${timingDescription(context.timing)} was within advisory range (threshold ${formatDuration(comparison.baseline.thresholdMs)})`
    );
  }

  return appendOutsideRangeObservation(initialResult, context.timing, comparison);
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
  if (!isReusableCandidate(context)) return notComparable("candidate was not reused");

  const run = readComparableRunFacts(context.runResult);
  if (run === undefined) return notComparable("Run facts were incomplete");

  const baseline = matchingBaseline(baselines, context.selection.profile, run, runtime);
  return baseline === undefined
    ? notComparable("no matching baseline")
    : Object.freeze({ baseline, kind: "comparable", run });
}

function isReusableCandidate(context: ProjectGateContext): boolean {
  const candidate = context.preparedCandidate;
  return (
    candidate.preparationAction === "reuse" &&
    candidate.preparationReason === "installation-current" &&
    candidate.reused === true
  );
}

function matchingBaseline(
  baselines: readonly ProjectGatePerformanceBaseline[],
  profile: ProjectGateContext["selection"]["profile"],
  run: ComparableRunFacts,
  runtime: ProjectGatePerformanceRuntime
): ProjectGatePerformanceBaseline | undefined {
  return baselines.find(
    (candidate) =>
      isValidBaseline(candidate) &&
      candidate.workload.profile === profile &&
      candidate.workload.declarativeFingerprint === run.declarativeFingerprint &&
      runtimeMatches(candidate.workload.runtime, runtime)
  );
}

function appendOutsideRangeObservation(
  initialResult: ProjectGateResult,
  timing: ProjectGateContext["timing"],
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
      message: `${timingDescription(timing)} exceeded advisory threshold ${formatDuration(comparison.baseline.thresholdMs)}${suffix}`
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
  return Object.freeze({
    code: "project-gate-performance-elapsed-to-initial-result",
    level: "info",
    message
  });
}

function hasValidPhaseTiming(timing: ProjectGateContext["timing"]): boolean {
  if (
    !isDuration(timing.candidatePreparationMs) ||
    !isDuration(timing.adapterSetupMs) ||
    !isDuration(timing.productRunMs)
  ) {
    return false;
  }
  const phaseTotal = timing.candidatePreparationMs + timing.adapterSetupMs + timing.productRunMs;
  // Subtractions from the same monotonic timestamps can re-associate by a few ULPs.
  const timestampMagnitude = Math.max(
    1,
    Math.abs(timing.startedAtMs),
    Math.abs(timing.initialResultAtMs),
    Math.abs(phaseTotal),
    Math.abs(timing.elapsedToInitialResultMs)
  );
  return (
    Math.abs(phaseTotal - timing.elapsedToInitialResultMs) <=
    Number.EPSILON * timestampMagnitude * 8
  );
}

function timingDescription(timing: ProjectGateContext["timing"]): string {
  return `elapsed-to-initial-result ${formatDuration(timing.elapsedToInitialResultMs)} (candidate preparation ${formatDuration(timing.candidatePreparationMs)}; adapter/setup ${formatDuration(timing.adapterSetupMs)}; Product Run ${formatDuration(timing.productRunMs)})`;
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
    const parsed = parseCheckDuration(duration);
    if (parsed === undefined) return undefined;
    parsedDurations.push(parsed);
  }
  return Object.freeze({
    checkDurations: Object.freeze(parsedDurations),
    declarativeFingerprint: value.declarativeFingerprint
  });
}

function parseCheckDuration(value: unknown): CheckDuration | undefined {
  if (!isNonArrayRecord(value)) return undefined;
  const { checkId, durationMs } = value;
  if (
    typeof checkId !== "string" ||
    !CHECK_ID_PATTERN.test(checkId) ||
    (durationMs !== null && !isDuration(durationMs))
  ) {
    return undefined;
  }
  return Object.freeze({ checkId, durationMs });
}

function isValidBaseline(value: ProjectGatePerformanceBaseline): boolean {
  return hasValidBaselineShape(value) && hasConsistentBaselineStatistics(value);
}

function hasValidBaselineShape(value: ProjectGatePerformanceBaseline): boolean {
  return (
    hasComparableWorkload(value) &&
    hasValidSamples(value.samplesMs) &&
    isDuration(value.medianMs) &&
    isDuration(value.p90Ms) &&
    isDuration(value.thresholdMs)
  );
}

function hasComparableWorkload(value: ProjectGatePerformanceBaseline): boolean {
  const { workload } = value;
  return (
    workload.candidatePreparation === "reuse" &&
    typeof workload.declarativeFingerprint === "string" &&
    workload.declarativeFingerprint.length > 0 &&
    (workload.profile === "required" || workload.profile === "full") &&
    isRuntime(workload.runtime)
  );
}

function hasValidSamples(samplesMs: readonly number[]): boolean {
  return samplesMs.length > 0 && samplesMs.every(isDuration);
}

function hasConsistentBaselineStatistics(value: ProjectGatePerformanceBaseline): boolean {
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

function runtimeMatches(
  expected: ProjectGatePerformanceRuntime,
  actual: ProjectGatePerformanceRuntime
): boolean {
  return (
    expected.platform === actual.platform &&
    expected.architecture === actual.architecture &&
    expected.bunVersion === actual.bunVersion
  );
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
