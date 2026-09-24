import { isNonArrayRecord } from "../../../value-guards.ts";
import {
  currentProjectGatePerformanceRuntime,
  LOCAL_PERFORMANCE_BASELINE_PATH,
  type ProjectGatePerformanceRuntime
} from "./performance-baseline.ts";
import type {
  ProjectGateResultContribution,
  ProjectGateResultContributionContext
} from "./result-contributor.ts";
import type { ProjectGateMessage } from "./result.ts";

const CHECK_ID_PATTERN = /^[a-z][a-z0-9-]*$/u;

type CheckDuration = Readonly<{ readonly checkId: string; readonly durationMs: number | null }>;
type ComparableRunFacts = Readonly<{
  readonly checkDurations: readonly CheckDuration[];
  readonly declarativeFingerprint: string;
}>;

/** Applies a manually maintained local hard limit without learning from this run. */
export function evaluateProjectGatePerformance(
  context: ProjectGateResultContributionContext,
  runtime: ProjectGatePerformanceRuntime = currentProjectGatePerformanceRuntime()
): ProjectGateResultContribution {
  const profile = context.selection.kind;
  if (profile === "focused") {
    return contribution({
      blocks: false,
      level: "info",
      code: "project-gate-performance-focused-selection",
      message: "focused preset selection has no total-time limit"
    });
  }
  if (context.initialResult.status !== "passed") {
    return contribution({
      blocks: false,
      level: "info",
      code: "project-gate-performance-not-evaluated",
      message: "performance limit was not evaluated because the initial Gate result was not passed"
    });
  }
  if (
    !isDuration(context.timing.elapsedToInitialResultMs) ||
    !hasValidPhaseTiming(context.timing)
  ) {
    return contribution({
      blocks: true,
      level: "error",
      code: "project-gate-performance-invalid-timing",
      message: "elapsed-to-initial-result timing was invalid; hard limit could not be evaluated"
    });
  }
  const run = readComparableRunFacts(context.runResult);
  if (run === undefined) {
    return contribution({
      blocks: true,
      level: "error",
      code: "project-gate-performance-invalid-run-facts",
      message: "Product Run facts were incomplete; hard limit could not be evaluated"
    });
  }
  const baseline = context.performanceBaselines.find(
    (candidate) =>
      candidate.profile === profile &&
      candidate.declarativeFingerprint === run.declarativeFingerprint &&
      runtimeMatches(candidate.runtime, runtime)
  );
  if (baseline === undefined) {
    return contribution({
      blocks: true,
      level: "error",
      code: "project-gate-performance-baseline-missing",
      message: `no matching local performance baseline for ${profile} (fingerprint ${run.declarativeFingerprint}; ${runtime.platform}/${runtime.architecture}; Bun ${runtime.bunVersion}); manually update ${LOCAL_PERFORMANCE_BASELINE_PATH}`
    });
  }

  const description = timingDescription(context.timing);
  if (context.timing.elapsedToInitialResultMs <= baseline.maxElapsedMs) {
    return contribution({
      blocks: false,
      level: "info",
      code: "project-gate-performance-within-limit",
      message: `${description} was within hard limit ${formatDuration(baseline.maxElapsedMs)}`
    });
  }
  const slowest = run.checkDurations
    .filter(
      (duration): duration is Readonly<{ readonly checkId: string; readonly durationMs: number }> =>
        duration.durationMs !== null
    )
    .sort(compareCheckDurations)
    .slice(0, 3)
    .map(({ checkId, durationMs }) => `${checkId}=${formatDuration(durationMs)}`);
  const suffix = slowest.length === 0 ? "" : `; slowest Checks: ${slowest.join(", ")}`;
  return contribution({
    blocks: true,
    level: "error",
    code: "project-gate-performance-limit-exceeded",
    message: `${description} exceeded hard limit ${formatDuration(baseline.maxElapsedMs)}${suffix}`
  });
}

function contribution(input: {
  readonly blocks: boolean;
  readonly level: ProjectGateMessage["level"];
  readonly code: string;
  readonly message: string;
}): ProjectGateResultContribution {
  const { blocks, code, level, message } = input;
  return Object.freeze({
    blocks,
    messages: Object.freeze([Object.freeze({ code, level, message })])
  });
}

function readComparableRunFacts(value: unknown): ComparableRunFacts | undefined {
  if (
    !isNonArrayRecord(value) ||
    value.kind !== "completed" ||
    typeof value.declarativeFingerprint !== "string" ||
    !/^[a-f0-9]{64}$/u.test(value.declarativeFingerprint) ||
    !Array.isArray(value.checkDurations)
  ) {
    return undefined;
  }
  const parsedDurations: CheckDuration[] = [];
  for (const duration of value.checkDurations) {
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

function hasValidPhaseTiming(timing: ProjectGateResultContributionContext["timing"]): boolean {
  if (
    !isDuration(timing.candidatePreparationMs) ||
    !isDuration(timing.adapterSetupMs) ||
    !isDuration(timing.productRunMs)
  ) {
    return false;
  }
  const phaseTotal = timing.candidatePreparationMs + timing.adapterSetupMs + timing.productRunMs;
  const magnitude = Math.max(
    1,
    Math.abs(timing.startedAtMs),
    Math.abs(timing.initialResultAtMs),
    Math.abs(phaseTotal),
    Math.abs(timing.elapsedToInitialResultMs)
  );
  return Math.abs(phaseTotal - timing.elapsedToInitialResultMs) <= Number.EPSILON * magnitude * 8;
}

function timingDescription(timing: ProjectGateResultContributionContext["timing"]): string {
  return `elapsed-to-initial-result ${formatDuration(timing.elapsedToInitialResultMs)} (candidate preparation ${formatDuration(timing.candidatePreparationMs)}; adapter/setup ${formatDuration(timing.adapterSetupMs)}; Product Run ${formatDuration(timing.productRunMs)})`;
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
