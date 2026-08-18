import type {
  CheckExecutionContext,
  CheckOutcome,
  CheckProjectContext,
  CheckReferenceCandidate,
  CheckResult,
  QualityRecordCandidate
} from "../definition/custom-check.ts";
import type { NormalizedCheck } from "../definition/project.ts";
import {
  createCoreCheckSession,
  type CoreCheckSession
} from "../quality-core/check-record/core-session.ts";
import type { CoreSnapshot } from "../quality-core/check-record/model.ts";
import { snapshotClosedRecord } from "../quality-core/check-record/plain-record-values.ts";
import {
  prepareTaskGraph,
  runTaskGraph,
  type SettledTask
} from "../task-scheduler/index.ts";
import { planStaticCheckGraph } from "./check-execution-plan.ts";
import {
  canonicalizeReferenceSubmissions,
  validateCheckReferenceSubmission,
  type CheckReferenceSubmission
} from "./check-reference-submissions.ts";

const INERT_SIGNAL = new AbortController().signal;

export type ResolvedCheckExecution = Readonly<
  | {
    readonly kind: "completed";
    readonly references: readonly CheckReferenceSubmission[];
    readonly snapshot: CoreSnapshot;
  }
  | {
    readonly kind: "cancelled";
    readonly references: readonly CheckReferenceSubmission[];
    readonly snapshot: CoreSnapshot;
  }
>;

/** Internal marker: a settled unavailable Check must block scheduler dependents. */
class CheckUnavailableSignal extends Error {
  public constructor() {
    super("Contained Check is unavailable");
    this.name = "CheckUnavailableSignal";
  }
}

/** Any escape from the Product adapter is a Package Run task-engine failure. */
class CheckExecutionInvariantFailure extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CheckExecutionInvariantFailure";
  }
}

/**
 * Runs the already normalized executable Check collection through one generic
 * Task per Check. Graph validation happens before Core scopes or callbacks.
 */
export async function executeResolvedChecks(input: Readonly<{
  readonly checks: readonly NormalizedCheck[];
  readonly maxParallel: number;
  readonly project: CheckProjectContext;
  readonly signal: AbortSignal | undefined;
}>): Promise<ResolvedCheckExecution> {
  const graph = planStaticCheckGraph(input.checks);
  prepareTaskGraph(graph, input.maxParallel);

  const session = createCoreCheckSession(input.checks.map((check) => Object.freeze({
    definition: check.definition
  })));
  const openedCheckIds = new Set<string>();
  const references: CheckReferenceSubmission[] = [];
  let graphRun: Awaited<ReturnType<typeof runTaskGraph<void>>>;
  try {
    graphRun = await runTaskGraph({
      graph,
      maxParallel: input.maxParallel,
      signal: input.signal,
      execute: (task, context) => {
        const check = input.checks.find((candidate) => candidate.definition.checkId === task.id);
        if (check === undefined) {
          throw new CheckExecutionInvariantFailure("Task graph has no executable Check");
        }
        return executeCheck({
          openedCheckIds,
          check,
          project: input.project,
          references,
          session,
          signal: context.signal ?? INERT_SIGNAL
        });
      }
    });
  } catch (error) {
    throw trustedFailure(error);
  }

  try {
    assertContainedTaskFailures(graphRun.settlements);
    settleBlockedChecks(session, input.checks, graphRun.settlements, openedCheckIds);
    if (graphRun.cancelled) {
      session.closeUnresolvedAsCancelled();
      return Object.freeze({
        kind: "cancelled",
        references: canonicalizeReferenceSubmissions(references),
        snapshot: session.freeze()
      });
    }
    assertEveryCheckClosed(input.checks, graphRun.settlements);
    return Object.freeze({
      kind: "completed",
      references: canonicalizeReferenceSubmissions(references),
      snapshot: session.freeze()
    });
  } catch (error) {
    throw trustedFailure(error);
  }
}

async function executeCheck(input: Readonly<{
  readonly openedCheckIds: Set<string>;
  readonly check: NormalizedCheck;
  readonly project: CheckProjectContext;
  readonly references: CheckReferenceSubmission[];
  readonly session: CoreCheckSession;
  readonly signal: AbortSignal;
}>): Promise<void> {
  const checkId = input.check.definition.checkId;
  const scope = input.session.openCheckScope(checkId);
  input.openedCheckIds.add(checkId);
  const reportedReferences: unknown[] = [];
  let isReporterOpen = true;
  const records = Object.freeze({
    report: (candidate: QualityRecordCandidate): void => {
      ensureReporterOpen(isReporterOpen);
      scope.records.report(candidate);
    },
    reportReference: (candidate: CheckReferenceCandidate): void => {
      ensureReporterOpen(isReporterOpen);
      reportedReferences.push(candidate);
    }
  });
  let result: CheckOutcome;
  try {
    const context: CheckExecutionContext<object> = Object.freeze({
      options: input.check.options,
      project: input.project,
      records,
      signal: input.signal
    });
    const value = await input.check.execution(context);
    result = outcomeForResult(value);
  } catch {
    result = Object.freeze({
      status: "unavailable",
      reason: { code: input.signal.aborted ? "execution-cancelled" : "execution-threw" }
    });
  } finally {
    isReporterOpen = false;
  }

  const reportedReferenceFromNotApplicable = result.status === "not-applicable"
    && reportedReferences.length > 0;
  if (reportedReferenceFromNotApplicable) {
    result = Object.freeze({ status: "unavailable", reason: { code: "record-invalid" } });
  } else {
    const referenceValidation = validateCheckReferenceSubmission({
      candidates: reportedReferences,
      check: input.check,
      project: input.project,
      scope
    });
    if (referenceValidation.kind === "invalid") {
      result = Object.freeze({ status: "unavailable", reason: { code: "reference-invalid" } });
    } else if (referenceValidation.kind === "submitted") {
      input.references.push(referenceValidation.submission);
    }
  }
  const settled = scope.settle(result);
  if (settled.status === "unavailable") throw new CheckUnavailableSignal();
}

function ensureReporterOpen(isReporterOpen: boolean): void {
  if (!isReporterOpen) throw new Error("Check record reporter is closed");
}

function outcomeForResult(value: unknown): CheckOutcome {
  const result = validateCheckResult(value);
  return result === undefined
    ? Object.freeze({ status: "unavailable", reason: { code: "invalid-execution-result" } })
    : result;
}

function validateCheckResult(value: unknown): CheckResult | undefined {
  const data = snapshotClosedRecord(value);
  if (data === undefined || typeof data.status !== "string") return undefined;
  if (data.status === "completed") {
    return hasExactKeys(data, { required: ["status", "verdict"] })
      && (data.verdict === "passed" || data.verdict === "failed")
      ? Object.freeze({ status: "completed", verdict: data.verdict })
      : undefined;
  }
  if (data.status === "not-applicable") {
    if (!hasExactKeys(data, { optional: ["reason"], required: ["status"] })) return undefined;
    if (!Object.hasOwn(data, "reason")) {
      return Object.freeze({ status: "not-applicable" });
    }
    const reason = validateReason(data.reason);
    return reason === undefined
      ? undefined
      : Object.freeze({ status: "not-applicable", reason });
  }
  if (data.status === "unavailable" && hasExactKeys(data, { required: ["status", "reason"] })) {
    const reason = validateReason(data.reason);
    return reason === undefined ? undefined : Object.freeze({ status: "unavailable", reason });
  }
  return undefined;
}

function validateReason(value: unknown): Readonly<{ readonly code: string }> | undefined {
  const data = snapshotClosedRecord(value);
  return data !== undefined && hasExactKeys(data, { required: ["code"] })
    && typeof data.code === "string" && data.code.length > 0
    ? Object.freeze({ code: data.code })
    : undefined;
}

function settleBlockedChecks(
  session: CoreCheckSession,
  checks: readonly NormalizedCheck[],
  settlements: readonly SettledTask<void>[],
  openedCheckIds: ReadonlySet<string>
): void {
  for (const settled of settlements) {
    if (settled.settlement.kind !== "blocked") continue;
    const check = checks.find((candidate) => candidate.definition.checkId === settled.task.id);
    if (check === undefined || openedCheckIds.has(check.definition.checkId)) {
      throw new CheckExecutionInvariantFailure("Blocked Task does not identify an unopened Check");
    }
    const scope = session.openCheckScope(check.definition.checkId);
    scope.settle(Object.freeze({
      status: "unavailable",
      reason: {
        code: "prerequisite-unavailable",
        checkIds: Object.freeze([...new Set(settled.settlement.dependencyIds)].sort(compareText))
      }
    }));
  }
}

function assertContainedTaskFailures(settlements: readonly SettledTask<void>[]): void {
  for (const settled of settlements) {
    if (settled.settlement.kind === "failed" && !(settled.settlement.error instanceof CheckUnavailableSignal)) {
      throw new CheckExecutionInvariantFailure("Task engine received an unexpected execution failure");
    }
  }
}

function assertEveryCheckClosed(
  checks: readonly NormalizedCheck[],
  settlements: readonly SettledTask<void>[]
): void {
  if (settlements.some((settled) => settled.settlement.kind === "cancelled-before-start")) {
    throw new CheckExecutionInvariantFailure("Non-cancelled Task graph left a Check unstarted");
  }
  if (checks.length !== settlements.length) {
    throw new CheckExecutionInvariantFailure("Task graph does not have one Task per executable Check");
  }
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  fields: Readonly<{ readonly optional?: readonly string[]; readonly required: readonly string[] }>
): boolean {
  const supported = new Set([...fields.required, ...(fields.optional ?? [])]);
  return fields.required.every((key) => Object.hasOwn(value, key))
    && Object.keys(value).every((key) => supported.has(key));
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function trustedFailure(error: unknown): CheckExecutionInvariantFailure {
  return error instanceof CheckExecutionInvariantFailure
    ? error
    : new CheckExecutionInvariantFailure("Check execution adapter escaped its contained failure boundary");
}
