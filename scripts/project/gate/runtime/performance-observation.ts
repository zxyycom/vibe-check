import { isNonArrayRecord } from "../../../value-guards.ts";
import {
  currentProjectGatePerformanceRuntime,
  LOCAL_PERFORMANCE_BASELINE_PATH,
  type ProjectGatePerformanceBaseline,
  type ProjectGatePerformanceRuntime
} from "./performance-baseline.ts";
import type {
  ProjectGateResultContribution,
  ProjectGateResultContributionContext
} from "./result-contributor.ts";
import type { ProjectGateMessage } from "./result.ts";

const CHECK_ID_PATTERN = /^[a-z][a-z0-9-]*$/u;
const CHECK_DURATION_PERCENTILE = 0.95;
const SLOWEST_CHECK_COUNT = 3;

type CheckDuration = Readonly<{ readonly checkId: string; readonly durationMs: number | null }>;
type MeasuredCheckDuration = CheckDuration & Readonly<{ readonly durationMs: number }>;
type CheckDurationSummary =
  | Readonly<{ readonly kind: "empty" }>
  | Readonly<{
      readonly kind: "measured";
      readonly count: number;
      readonly totalMs: number;
      readonly meanMs: number;
      readonly p95Ms: number;
      readonly slowest: readonly MeasuredCheckDuration[];
    }>;

/** Warns on explicit budgets while rejecting invalid measurements and configuration. */
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
      message: "focused preset selection has no performance budget evaluation"
    });
  }
  if (context.initialResult.status !== "passed") {
    return contribution({
      blocks: false,
      level: "info",
      code: "project-gate-performance-not-evaluated",
      message:
        "performance budgets were not evaluated because the initial Gate result was not passed"
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
      message:
        "elapsed-to-initial-result timing was invalid; performance budgets could not be evaluated"
    });
  }
  const durations = readCompletedCheckDurations(context.runResult);
  const summary = durations === undefined ? undefined : summarizeCheckDurations(durations);
  if (summary === undefined) {
    return contribution({
      blocks: true,
      level: "error",
      code: "project-gate-performance-invalid-run-facts",
      message: "Product Run duration facts were invalid; performance budgets could not be evaluated"
    });
  }
  const description = timingDescription(context.timing);
  const baseline = context.performanceBaselines.find(
    (candidate) => candidate.profile === profile && runtimeMatches(candidate.runtime, runtime)
  );
  if (baseline === undefined) {
    return contribution({
      blocks: true,
      level: "error",
      code: "project-gate-performance-baseline-missing",
      message: `no matching local performance baseline for ${profile} (${runtime.platform}/${runtime.architecture}; Bun ${runtime.bunVersion}); ${description}; manually update ${LOCAL_PERFORMANCE_BASELINE_PATH}`
    });
  }

  const exceeded = context.timing.elapsedToInitialResultMs > baseline.maxElapsedMs;
  const totalMessage: ProjectGateMessage = Object.freeze({
    level: exceeded ? "warning" : "info",
    code: exceeded
      ? "project-gate-performance-limit-exceeded"
      : "project-gate-performance-within-limit",
    message: `${description} ${exceeded ? "exceeded" : "was within"} warning budget ${formatDuration(baseline.maxElapsedMs)}`
  });
  return Object.freeze({
    blocks: false,
    messages: Object.freeze([totalMessage, checkDurationMessage(summary, baseline)])
  });
}

function summarizeCheckDurations(
  durations: readonly CheckDuration[]
): CheckDurationSummary | undefined {
  const measured = durations
    .filter((duration): duration is MeasuredCheckDuration => duration.durationMs !== null)
    .sort(compareCheckDurations);
  if (measured.length === 0) return Object.freeze({ kind: "empty" });
  let totalMs = 0;
  for (const duration of measured) totalMs += duration.durationMs;
  if (!isDuration(totalMs)) return undefined;
  // Nearest rank in ascending order, projected into this descending duration list.
  const p95 = measured[measured.length - Math.ceil(measured.length * CHECK_DURATION_PERCENTILE)];
  if (p95 === undefined) return undefined;
  return Object.freeze({
    kind: "measured",
    count: measured.length,
    totalMs,
    meanMs: totalMs / measured.length,
    p95Ms: p95.durationMs,
    slowest: Object.freeze(measured.slice(0, SLOWEST_CHECK_COUNT))
  });
}

function checkDurationMessage(
  summary: CheckDurationSummary,
  budget: ProjectGatePerformanceBaseline
): ProjectGateMessage {
  const code = "project-gate-performance-check-durations";
  if (summary.kind === "empty") {
    return Object.freeze({
      code,
      level: "info",
      message:
        "executed Checks=0; cumulative execution 0.0ms (not wall time); mean=n/a; p95=n/a; Check budgets not evaluated"
    });
  }
  const exceeded: string[] = [];
  if (summary.meanMs > budget.maxMeanCheckMs) exceeded.push("mean");
  if (summary.p95Ms > budget.maxP95CheckMs) exceeded.push("p95");
  const assessment =
    exceeded.length === 0
      ? "within Check warning budgets"
      : `exceeded Check warning budgets: ${exceeded.join(", ")}`;
  const slowest = summary.slowest
    .map(({ checkId, durationMs }) => `${checkId}=${formatDuration(durationMs)}`)
    .join(", ");
  return Object.freeze({
    code,
    level: exceeded.length === 0 ? "info" : "warning",
    message: `executed Checks=${summary.count}; cumulative execution ${formatDuration(summary.totalMs)} (not wall time); mean ${formatDuration(summary.meanMs)} (budget ${formatDuration(budget.maxMeanCheckMs)}); p95 ${formatDuration(summary.p95Ms)} (nearest-rank; budget ${formatDuration(budget.maxP95CheckMs)}); ${assessment}; slowest Checks: ${slowest}`
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

function readCompletedCheckDurations(value: unknown): readonly CheckDuration[] | undefined {
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
  const checkIds = new Set<string>();
  for (const duration of value.checkDurations) {
    const parsed = parseCheckDuration(duration);
    if (parsed === undefined || checkIds.has(parsed.checkId)) return undefined;
    checkIds.add(parsed.checkId);
    parsedDurations.push(parsed);
  }
  return Object.freeze(parsedDurations);
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

function compareCheckDurations(left: MeasuredCheckDuration, right: MeasuredCheckDuration): number {
  if (left.durationMs !== right.durationMs) return right.durationMs - left.durationMs;
  if (left.checkId < right.checkId) return -1;
  if (left.checkId > right.checkId) return 1;
  return 0;
}

function formatDuration(durationMs: number): string {
  return `${durationMs.toFixed(1)}ms`;
}
