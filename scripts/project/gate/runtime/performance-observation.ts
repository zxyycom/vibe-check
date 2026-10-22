import { isNonArrayRecord } from "../../../value-guards.ts";
import type { ProjectGatePerformanceBudget } from "./performance-policy.ts";
import type {
  ProjectGateResultContribution,
  ProjectGateResultContributionContext
} from "./result-contributor.ts";
import { stringifyProjectGateMessageContext, type ProjectGateMessage } from "./result.ts";

const CHECK_ID_PATTERN = /^[a-z][a-z0-9-]*$/u;
const CHECK_DURATION_PERCENTILE = 0.95;
const SLOWEST_CHECK_COUNT = 3;

export interface ProjectGatePerformanceRuntime {
  readonly architecture: string;
  readonly bunVersion: string;
  readonly platform: string;
}

/** Diagnostic facts only: runtime never selects or changes the shared budgets. */
export function currentProjectGatePerformanceRuntime(): ProjectGatePerformanceRuntime {
  return Object.freeze({
    architecture: process.arch,
    bunVersion: process.versions.bun ?? "unavailable",
    platform: process.platform
  });
}

type CheckDuration = Readonly<{ readonly checkId: string; readonly durationMs: number | null }>;
interface CompletedPerformanceFacts {
  readonly checkDurations: readonly CheckDuration[];
  readonly declarativeFingerprint: string;
}
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

/** Blocks exceeded explicit budgets and rejects invalid measurements and configuration. */
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
  const facts = readCompletedPerformanceFacts(context.runResult);
  const summary = facts === undefined ? undefined : summarizeCheckDurations(facts.checkDurations);
  if (facts === undefined || summary === undefined) {
    return contribution({
      blocks: true,
      level: "error",
      code: "project-gate-performance-invalid-run-facts",
      message: "Product Run duration facts were invalid; performance budgets could not be evaluated"
    });
  }
  const description = timingDescription(context.timing);
  const budget = context.performancePolicy[profile];

  const exceeded = context.timing.elapsedToInitialResultMs > budget.maxElapsedMs;
  const exceededCheckBudgets = exceededCheckBudgetNames(summary, budget);
  const blocks = exceeded || exceededCheckBudgets.length > 0;
  const totalMessage: ProjectGateMessage = Object.freeze({
    level: exceeded ? "error" : "info",
    code: exceeded
      ? "project-gate-performance-limit-exceeded"
      : "project-gate-performance-within-limit",
    message: `${description} ${exceeded ? "exceeded" : "was within"} budget ${formatDuration(budget.maxElapsedMs)}`
  });
  return Object.freeze({
    blocks,
    messages: Object.freeze([
      totalMessage,
      checkDurationMessage(summary, budget, exceededCheckBudgets),
      ...(blocks ? [performanceFailureContext({ context, runtime, budget, facts, summary })] : [])
    ])
  });
}

function performanceFailureContext(input: {
  readonly context: ProjectGateResultContributionContext;
  readonly runtime: ProjectGatePerformanceRuntime;
  readonly budget: ProjectGatePerformanceBudget;
  readonly facts: CompletedPerformanceFacts;
  readonly summary: CheckDurationSummary;
}): ProjectGateMessage {
  const { context, runtime, budget, facts, summary } = input;
  const candidate = context.preparedCandidate;
  return Object.freeze({
    code: "project-gate-performance-failure-context",
    level: "info",
    message: stringifyProjectGateMessageContext({
      profile: context.selection.kind,
      runtime,
      budgets: {
        maxElapsedMs: budget.maxElapsedMs,
        maxMeanCheckMs: budget.maxMeanCheckMs,
        maxP95CheckMs: budget.maxP95CheckMs
      },
      timing: context.timing,
      measurements: {
        meanCheckMs: summary.kind === "measured" ? summary.meanMs : null,
        p95CheckMs: summary.kind === "measured" ? summary.p95Ms : null
      },
      candidate: {
        version: candidate.candidateVersion,
        sha256: candidate.sha256,
        inputFingerprint: candidate.inputFingerprint,
        preparationAction: candidate.preparationAction,
        preparationReason: candidate.preparationReason
      },
      declarativeFingerprint: facts.declarativeFingerprint,
      checkDurations: facts.checkDurations,
      logs: {
        directory: context.invocationLogDirectory,
        gate: "gate.log",
        progress: "progress.log",
        machine: "machine/run.json",
        commandCheck: "checks/<check-id>/process.log"
      }
    })
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
  budget: ProjectGatePerformanceBudget,
  exceeded: readonly string[]
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
  const assessment =
    exceeded.length === 0
      ? "within Check budgets"
      : `exceeded Check budgets: ${exceeded.join(", ")}`;
  const slowest = summary.slowest
    .map(({ checkId, durationMs }) => `${checkId}=${formatDuration(durationMs)}`)
    .join(", ");
  return Object.freeze({
    code,
    level: exceeded.length === 0 ? "info" : "error",
    message: `executed Checks=${summary.count}; cumulative execution ${formatDuration(summary.totalMs)} (not wall time); mean ${formatDuration(summary.meanMs)} (budget ${formatDuration(budget.maxMeanCheckMs)}); p95 ${formatDuration(summary.p95Ms)} (nearest-rank; budget ${formatDuration(budget.maxP95CheckMs)}); ${assessment}; slowest Checks: ${slowest}`
  });
}

function exceededCheckBudgetNames(
  summary: CheckDurationSummary,
  budget: ProjectGatePerformanceBudget
): readonly string[] {
  if (summary.kind === "empty") return Object.freeze([]);
  const exceeded: string[] = [];
  if (summary.meanMs > budget.maxMeanCheckMs) exceeded.push("mean");
  if (summary.p95Ms > budget.maxP95CheckMs) exceeded.push("p95");
  return Object.freeze(exceeded);
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

function readCompletedPerformanceFacts(value: unknown): CompletedPerformanceFacts | undefined {
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
